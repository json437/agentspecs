#!/usr/bin/env node
import { Command } from "commander";
import { initProject, setProjectDir, listSpecs, getProjectDir } from "../src/server/spec-engine.js";
import { startWebServer, broadcast } from "../src/server/web-server.js";
import { watchSpecs } from "../src/server/watcher.js";
import { getConfig } from "../src/server/storage.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json") as { version: string };

const program = new Command();

program
  .name("agentspecs")
  .description("A Claude Code plugin that turns specs into beautiful, interactive documents.")
  .version(pkg.version);

program
  .command("init")
  .description("Initialize agentspecs in the current project")
  .action(() => {
    const cwd = process.cwd();
    setProjectDir(cwd);
    initProject();

    // Create .mcp.json for Claude Code auto-discovery
    const mcpPath = join(cwd, ".mcp.json");
    if (!existsSync(mcpPath)) {
      writeFileSync(mcpPath, JSON.stringify({
        mcpServers: {
          agentspecs: {
            command: "node",
            args: ["node_modules/@json437/agentspecs/dist/src/server/index.js"],
            cwd: "."
          }
        }
      }, null, 2) + "\n");
      console.log("  Created .mcp.json (Claude Code auto-discovers agentspecs)");
    } else {
      // Merge into existing .mcp.json
      try {
        const existing = JSON.parse(readFileSync(mcpPath, "utf-8"));
        if (!existing.mcpServers?.agentspecs) {
          existing.mcpServers = existing.mcpServers || {};
          existing.mcpServers.agentspecs = {
            command: "node",
            args: ["node_modules/@json437/agentspecs/dist/src/server/index.js"],
            cwd: "."
          };
          writeFileSync(mcpPath, JSON.stringify(existing, null, 2) + "\n");
          console.log("  Added agentspecs to existing .mcp.json");
        } else {
          console.log("  .mcp.json already has agentspecs");
        }
      } catch {
        console.log("  .mcp.json exists but couldn't be parsed, skipping");
      }
    }

    // Create .claude/launch.json for preview_start support
    const claudeDir = join(cwd, ".claude");
    const launchPath = join(claudeDir, "launch.json");
    mkdirSync(claudeDir, { recursive: true });

    if (!existsSync(launchPath)) {
      writeFileSync(launchPath, JSON.stringify({
        version: "0.0.1",
        configurations: [{
          name: "agentspecs",
          runtimeExecutable: "node",
          runtimeArgs: ["node_modules/@json437/agentspecs/dist/src/server/index.js", "--serve-only"],
          port: 7575,
          autoPort: true
        }]
      }, null, 2) + "\n");
      console.log("  Created .claude/launch.json (preview_start support)");
    } else {
      try {
        const existing = JSON.parse(readFileSync(launchPath, "utf-8"));
        const hasAgentspecs = existing.configurations?.some((c: any) => c.name === "agentspecs");
        if (!hasAgentspecs) {
          existing.configurations = existing.configurations || [];
          existing.configurations.push({
            name: "agentspecs",
            runtimeExecutable: "node",
            runtimeArgs: ["node_modules/@json437/agentspecs/dist/src/server/index.js", "--serve-only"],
            port: 7575,
            autoPort: true
          });
          writeFileSync(launchPath, JSON.stringify(existing, null, 2) + "\n");
          console.log("  Added agentspecs to existing .claude/launch.json");
        } else {
          console.log("  .claude/launch.json already has agentspecs");
        }
      } catch {
        console.log("  .claude/launch.json exists but couldn't be parsed, skipping");
      }
    }

    // Append to CLAUDE.md
    const claudeMdPath = join(cwd, "CLAUDE.md");
    const specBlock = `
## Specs

This project uses [agentspecs](https://github.com/json437/agentspecs) for specification management.

- When writing specs, always use the \`create_spec\` MCP tool instead of writing raw .md files
- Before implementing a feature, check for an existing spec: use \`list_specs\`
- When writing new features, create or update the relevant spec first
- Use \`get_feedback\` to check for inline feedback from reviewers
- Use \`preview_start("agentspecs")\` to launch the spec viewer, or run \`npx agentspecs serve\`
`;

    if (!existsSync(claudeMdPath)) {
      writeFileSync(claudeMdPath, specBlock.trim() + "\n");
      console.log("  Created CLAUDE.md with agentspecs instructions");
    } else {
      const existing = readFileSync(claudeMdPath, "utf-8");
      if (!existing.includes("agentspecs")) {
        writeFileSync(claudeMdPath, existing.trimEnd() + "\n\n" + specBlock.trim() + "\n");
        console.log("  Appended agentspecs instructions to CLAUDE.md");
      } else {
        console.log("  CLAUDE.md already mentions agentspecs");
      }
    }

    console.log("\nagentspecs initialized. Claude Code will auto-discover it on next session.");
    console.log("Run `agentspecs serve` to start the preview server now.");
  });

program
  .command("serve")
  .description("Start the agentspecs web server")
  .option("-p, --port <port>", "Port to listen on")
  .action(async (opts) => {
    setProjectDir(process.cwd());
    initProject();
    const config = getConfig(getProjectDir());
    const port = opts.port ? parseInt(opts.port) : config.port;

    const actualPort = await startWebServer(port);
    watchSpecs(getProjectDir(), (specId) => {
      console.log(`Spec changed: ${specId}`);
      broadcast("spec:updated", { specId });
    });

    console.log(`agentspecs server running at http://localhost:${actualPort}`);
  });

program
  .command("list")
  .description("List all specs")
  .action(() => {
    setProjectDir(process.cwd());
    const specs = listSpecs();
    if (specs.length === 0) {
      console.log("No specs found. Ask your agent to create one with create_spec.");
      return;
    }
    for (const s of specs) {
      console.log(`  ${s.id}  [${s.status}]  v${s.version}  ${s.title}`);
    }
  });

program
  .command("open <id>")
  .description("Open a spec in the browser")
  .action(async (id) => {
    setProjectDir(process.cwd());
    const config = getConfig(getProjectDir());
    const url = `http://localhost:${config.port}/specs/${id}`;
    const open = (await import("open")).default;
    await open(url);
    console.log(`Opened ${url}`);
  });

program.parse();
