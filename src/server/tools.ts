import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as engine from "./spec-engine.js";
import { getConfig } from "./storage.js";

export function registerTools(server: McpServer): void {
  server.tool(
    "create_spec",
    "Create a new spec from markdown content. Returns a URL to view the rendered spec.",
    {
      title: z.string().describe("Title for the spec"),
      content: z.string().describe("Markdown content of the spec"),
      template: z
        .enum(["prd", "api", "architecture", "rfc", "bug-report", "migration", "runbook", "design-doc"])
        .optional()
        .describe("Optional template type"),
    },
    async ({ title, content, template }) => {
      const config = getConfig(engine.getProjectDir());
      const result = engine.createSpec({ title, content, template });
      const url = `http://localhost:${config.port}/specs/${result.id}`;
      return {
        content: [
          {
            type: "text",
            text: `Spec created: "${result.meta.title}" (v${result.meta.version})\nView at: ${url}`,
          },
        ],
      };
    }
  );

  server.tool(
    "update_spec",
    "Update an existing spec with new markdown content. Creates a new version.",
    {
      id: z.string().describe("Spec ID (slug)"),
      content: z.string().describe("New markdown content"),
    },
    async ({ id, content }) => {
      const result = engine.updateSpec(id, content);
      return {
        content: [
          {
            type: "text",
            text: `Spec updated: "${result.meta.title}" (v${result.meta.version})`,
          },
        ],
      };
    }
  );

  server.tool(
    "update_section",
    "Update a specific section of a spec by heading name. Creates a new version.",
    {
      id: z.string().describe("Spec ID (slug)"),
      heading: z.string().describe("The heading text to find and replace content under"),
      content: z.string().describe("New content for the section (excluding the heading line)"),
    },
    async ({ id, heading, content }) => {
      const result = engine.updateSection(id, heading, content);
      return {
        content: [
          {
            type: "text",
            text: `Section "${heading}" updated in "${result.meta.title}" (v${result.meta.version})`,
          },
        ],
      };
    }
  );

  server.tool(
    "get_feedback",
    "Get unresolved inline feedback on a spec.",
    {
      id: z.string().describe("Spec ID (slug)"),
    },
    async ({ id }) => {
      const feedback = engine.getFeedback(id);
      if (feedback.length === 0) {
        return {
          content: [{ type: "text", text: "No unresolved feedback." }],
        };
      }
      const text = feedback
        .map((f) => {
          let entry = `[${f.id}] Section: "${f.section}" (by ${f.author || "human"})\n${f.comment}\n(${f.createdAt})`;
          if (f.replies && f.replies.length > 0) {
            entry += "\n  Replies:";
            for (const r of f.replies) {
              entry += `\n    [${r.author}] ${r.comment} (${r.createdAt})`;
            }
          }
          return entry;
        })
        .join("\n\n");
      return {
        content: [{ type: "text", text: `${feedback.length} unresolved feedback items:\n\n${text}` }],
      };
    }
  );

  server.tool(
    "list_specs",
    "List all specs in the project with their status.",
    {},
    async () => {
      const specs = engine.listSpecs();
      if (specs.length === 0) {
        return {
          content: [{ type: "text", text: "No specs found. Create one with create_spec." }],
        };
      }
      const text = specs
        .map((s) => `- ${s.title} [${s.status}] (v${s.version}, updated ${s.updatedAt})`)
        .join("\n");
      return {
        content: [{ type: "text", text }],
      };
    }
  );

  server.tool(
    "set_status",
    "Set the lifecycle status of a spec.",
    {
      id: z.string().describe("Spec ID (slug)"),
      status: z
        .enum(["draft", "in_review", "approved", "implementing", "done", "rejected"])
        .describe("New status"),
    },
    async ({ id, status }) => {
      const meta = engine.setStatus(id, status);
      return {
        content: [
          {
            type: "text",
            text: `Status of "${meta.title}" set to: ${status}`,
          },
        ],
      };
    }
  );

  server.tool(
    "link_commit",
    "Link an implementation commit to a spec. If no commit SHA is given, links the current HEAD.",
    {
      id: z.string().describe("Spec ID (slug)"),
      commit: z.string().optional().describe("Short commit SHA to link (defaults to current HEAD)"),
    },
    async ({ id, commit }) => {
      const meta = engine.linkCommit(id, commit);
      const linked = meta.linkedCommits || [];
      return {
        content: [
          {
            type: "text",
            text: `Linked commit to "${meta.title}". ${linked.length} linked commit(s): ${linked.join(", ")}`,
          },
        ],
      };
    }
  );

  server.tool(
    "reply_to_feedback",
    "Reply to a feedback comment on a spec. Use this to respond to reviewer feedback directly in the thread.",
    {
      id: z.string().describe("Spec ID (slug)"),
      feedbackId: z.string().describe("Feedback item ID to reply to"),
      comment: z.string().describe("Your reply text"),
    },
    async ({ id, feedbackId, comment }) => {
      const reply = engine.replyToFeedback(id, feedbackId, comment, "agent");
      return {
        content: [
          {
            type: "text",
            text: `Replied to feedback ${feedbackId}: "${comment.slice(0, 100)}"`,
          },
        ],
      };
    }
  );

  server.tool(
    "revert_to_version",
    "Revert a spec to a previous version. Creates a new version with the old content.",
    {
      id: z.string().describe("Spec ID (slug)"),
      version: z.number().describe("Version number to revert to"),
    },
    async ({ id, version }) => {
      const result = engine.revertToVersion(id, version);
      return {
        content: [
          {
            type: "text",
            text: `Reverted "${result.meta.title}" to v${version} content (now v${result.meta.version})`,
          },
        ],
      };
    }
  );

  server.tool(
    "delete_spec",
    "Permanently delete a spec and all its versions and feedback.",
    {
      id: z.string().describe("Spec ID (slug) to delete"),
    },
    async ({ id }) => {
      const spec = engine.getSpec(id);
      if (!spec) {
        return { content: [{ type: "text", text: `Spec not found: ${id}` }] };
      }
      const title = spec.meta.title;
      engine.deleteSpec(id);
      return { content: [{ type: "text", text: `Deleted spec "${title}" (${id})` }] };
    }
  );

  server.tool(
    "resolve_feedback",
    "Resolve a feedback item on a spec.",
    {
      id: z.string().describe("Spec ID (slug)"),
      feedbackId: z.string().describe("Feedback item ID to resolve"),
    },
    async ({ id, feedbackId }) => {
      engine.resolveFeedback(id, feedbackId);
      return {
        content: [{ type: "text", text: `Feedback ${feedbackId} resolved.` }],
      };
    }
  );
}
