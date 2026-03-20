import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { WebSocketServer, WebSocket } from "ws";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as engine from "./spec-engine.js";
import { loadVersion } from "./storage.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// In dev: src/server/ → ../ui/. In dist: dist/src/server/ → ../../../src/ui/
const devUiDir = join(__dirname, "..", "ui");
const distUiDir = join(__dirname, "..", "..", "..", "src", "ui");
const uiDir = existsSync(join(devUiDir, "index.html")) ? devUiDir : distUiDir;

let wss: WebSocketServer;
const clients = new Set<WebSocket>();

export function broadcast(event: string, data: unknown): void {
  const message = JSON.stringify({ event, data });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

export function startWebServer(port: number): void {
  const app = new Hono();

  // API routes
  app.get("/api/specs", (c) => {
    return c.json(engine.listSpecs());
  });

  app.get("/api/specs/:id", (c) => {
    const spec = engine.getSpec(c.req.param("id"));
    if (!spec) return c.json({ error: "Not found" }, 404);
    return c.json(spec);
  });

  app.get("/api/specs/:id/versions/:version", (c) => {
    const content = loadVersion(
      engine.getProjectDir(),
      c.req.param("id"),
      parseInt(c.req.param("version"))
    );
    if (content === null) return c.json({ error: "Not found" }, 404);
    return c.json({ content });
  });

  app.post("/api/specs/:id/revert/:version", async (c) => {
    try {
      const result = engine.revertToVersion(c.req.param("id"), parseInt(c.req.param("version")));
      broadcast("spec:updated", { specId: c.req.param("id") });
      return c.json(result);
    } catch (e: any) {
      return c.json({ error: e.message }, 400);
    }
  });

  app.get("/api/specs/:id/feedback", (c) => {
    const feedback = engine.getFeedback(c.req.param("id"), false);
    return c.json(feedback);
  });

  app.post("/api/specs/:id/feedback", async (c) => {
    const body = await c.req.json<{ section: string; comment: string }>();
    const item = engine.addFeedback(c.req.param("id"), body.section, body.comment, "human");
    broadcast("feedback:added", { specId: c.req.param("id"), feedback: item });
    return c.json(item, 201);
  });

  app.post("/api/specs/:id/feedback/:feedbackId/resolve", async (c) => {
    engine.resolveFeedback(c.req.param("id"), c.req.param("feedbackId"));
    broadcast("feedback:resolved", { specId: c.req.param("id"), feedbackId: c.req.param("feedbackId") });
    return c.json({ ok: true });
  });

  app.post("/api/specs/:id/feedback/:feedbackId/reply", async (c) => {
    const body = await c.req.json<{ comment: string; author?: "human" | "agent" }>();
    const reply = engine.replyToFeedback(
      c.req.param("id"),
      c.req.param("feedbackId"),
      body.comment,
      body.author || "human"
    );
    broadcast("feedback:replied", { specId: c.req.param("id"), feedbackId: c.req.param("feedbackId"), reply });
    return c.json(reply, 201);
  });

  // UI routes — serve the SPA
  app.get("/ui/:file", (c) => {
    const file = c.req.param("file");
    try {
      const content = readFileSync(join(uiDir, file), "utf-8");
      const ext = file.split(".").pop();
      const types: Record<string, string> = {
        html: "text/html",
        css: "text/css",
        js: "application/javascript",
        ts: "application/javascript",
      };
      return c.text(content, 200, { "Content-Type": types[ext || ""] || "text/plain" });
    } catch {
      return c.text("Not found", 404);
    }
  });

  // SPA routes — all non-API routes serve index.html
  app.get("/", (c) => {
    try {
      const html = readFileSync(join(uiDir, "index.html"), "utf-8");
      return c.html(html);
    } catch {
      return c.html("<h1>agentspecs</h1><p>UI not found. Run from the agentspecs directory.</p>");
    }
  });

  app.get("/specs/:id/diff/:v1/:v2", (c) => {
    try {
      const html = readFileSync(join(uiDir, "diff-view.html"), "utf-8");
      return c.html(html);
    } catch {
      return c.html("<h1>Diff view not found</h1>");
    }
  });

  app.get("/specs/:id", (c) => {
    try {
      const html = readFileSync(join(uiDir, "spec-view.html"), "utf-8");
      return c.html(html);
    } catch {
      return c.html("<h1>Spec view not found</h1>");
    }
  });

  const server = serve({ fetch: app.fetch, port }, () => {
    console.error(`agentspecs web server running at http://localhost:${port}`);
  });

  (server as any).on?.("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use. Try a different port with --port or set AGENTSPECS_PORT.`);
      process.exit(1);
    }
    throw err;
  });

  // WebSocket server
  wss = new WebSocketServer({ server: server as any });
  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
  });
}
