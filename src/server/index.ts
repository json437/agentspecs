import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools.js";
import { registerResources } from "./resources.js";
import { startWebServer, broadcast } from "./web-server.js";
import { watchSpecs } from "./watcher.js";
import { getConfig } from "./storage.js";
import { setProjectDir, initProject } from "./spec-engine.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json") as { version: string };

const projectDir = process.env.AGENTSPECS_PROJECT_DIR || process.cwd();
setProjectDir(projectDir);
initProject();

const config = getConfig(projectDir);
const envPort = parseInt(process.env.PORT || process.env.AGENTSPECS_PORT || "");
const port = envPort || config.port || 0; // 0 = random available port

// Start web server + filesystem watcher
const actualPort = await startWebServer(port);

watchSpecs(projectDir, (specId) => {
  console.error(`Spec changed: ${specId}`);
  broadcast("spec:updated", { specId });
});

// Start MCP server if not in serve-only mode
const serveOnly = process.argv.includes("--serve-only");
if (!serveOnly) {
  const server = new McpServer({
    name: "agentspecs",
    version: pkg.version,
  });

  registerTools(server);
  registerResources(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("agentspecs MCP server connected via stdio");
} else {
  console.error("agentspecs running in serve-only mode (no MCP)");
  // Keep process alive
  process.stdin.resume();
}
