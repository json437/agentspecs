# agentspecs

**The spec phase, visualized.** A Claude Code plugin that turns specs into beautiful, interactive documents with live preview, version history, and inline feedback.

Before you write code, you write specs. PRDs, architecture docs, API designs, RFCs. But right now you're reading raw markdown in a terminal. agentspecs fixes that.

## What it does

Your agent writes a spec using MCP tools. agentspecs renders it as a live, interactive document at `localhost:7575`:

- **Live rendered preview** with syntax highlighting, mermaid diagrams, and table of contents
- **Version history** with side-by-side diffs between any two versions
- **Inline feedback** -- Figma-style commenting with `C` hotkey, click-to-place pins, and threaded replies
- **Git context** per version -- tracks branch, commit, and dirty state automatically
- **Status lifecycle** -- draft, in_review, approved, implementing, done, rejected
- **8 templates** -- PRD, API, Architecture, RFC, Bug Report, Migration, Runbook, Design Doc

## Quick start

```bash
cd your-project
npm install agentspecs
npx agentspecs init
```

This creates:
- `.agentspecs/` -- spec storage (git-friendly, commit this)
- `.mcp.json` -- Claude Code auto-discovers agentspecs as an MCP server
- `.claude/launch.json` -- enables `preview_start("agentspecs")` in Claude Code
- `CLAUDE.md` -- adds agent instructions for spec-first workflow

Then start a Claude Code session. The agent now has these tools:

| Tool | Description |
|------|-------------|
| `create_spec` | Create a new spec from markdown (optionally from a template) |
| `update_spec` | Replace spec content, creating a new version |
| `update_section` | Update a single section by heading name |
| `set_status` | Transition the spec through its lifecycle |
| `get_feedback` | Read unresolved inline feedback with threaded replies |
| `reply_to_feedback` | Respond to a feedback comment in-thread |
| `resolve_feedback` | Mark a feedback item as resolved |
| `link_commit` | Link an implementation commit to the spec |
| `revert_to_version` | Roll back to a previous version's content |
| `delete_spec` | Permanently remove a spec |
| `list_specs` | List all specs with status and version |

## Usage

### View specs

```bash
npx agentspecs serve        # start the web UI
npx agentspecs open my-spec # open a spec in browser
npx agentspecs list         # list all specs
```

### In Claude Code

Ask your agent to write a spec:

> "Write a PRD for the new auth system using the prd template"

The agent calls `create_spec` and you get a live preview. Leave comments with `C`, the agent reads them with `get_feedback` and responds with `reply_to_feedback`.

### Commenting

Press `C` to enter comment mode. Click any section heading to place a comment. Comments appear as numbered pins. Click a pin to see the thread and reply. Press `Esc` to exit comment mode.

### Version history

Every `update_spec` or `update_section` creates a new version. The sidebar shows the full version timeline with git context (branch + commit). Select any version from the dropdown, view diffs between versions, or revert.

## How it works

agentspecs runs as two things simultaneously:

1. **MCP server** (stdio) -- Claude Code connects to this. Provides tools for creating/updating specs.
2. **Web server** (HTTP + WebSocket) -- serves the rendered UI at `localhost:7575`. WebSocket pushes live updates.

Specs are stored as files in `.agentspecs/specs/{id}/`:
```
.agentspecs/
  specs/
    my-spec/
      spec.md          # current content
      meta.json         # title, status, version, git context
      feedback.json     # comments and replies
      versions/
        v1.md
        v2.md
```

This is designed to be committed to git. Version diffs, feedback threads, and status transitions are all part of the project history.

## Configuration

`.agentspecs/config.json`:
```json
{
  "port": 7575
}
```

Or use environment variables:
- `AGENTSPECS_PORT` -- override the web server port
- `AGENTSPECS_PROJECT_DIR` -- override the project directory

## License

MIT
