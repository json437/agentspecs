import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as engine from "./spec-engine.js";

export function registerResources(server: McpServer): void {
  // Static resource: spec index
  server.resource(
    "specs-index",
    "specs://index",
    { description: "List of all specs in the project with status and summary" },
    async () => {
      const specs = engine.listSpecs();
      const data = specs.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        version: s.version,
        updatedAt: s.updatedAt,
      }));
      return {
        contents: [
          {
            uri: "specs://index",
            mimeType: "application/json",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  );

  // Dynamic resource: individual spec
  server.resource(
    "spec-content",
    new ResourceTemplate("specs://{id}", { list: undefined }),
    { description: "Full content of a specific spec" },
    async (uri, params) => {
      const id = params.id as string;
      const spec = engine.getSpec(id);
      if (!spec) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/plain",
              text: `Spec not found: ${id}`,
            },
          ],
        };
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: spec.content,
          },
        ],
      };
    }
  );

  // Dynamic resource: spec feedback
  server.resource(
    "spec-feedback",
    new ResourceTemplate("specs://{id}/feedback", { list: undefined }),
    { description: "Pending feedback on a spec" },
    async (uri, params) => {
      const id = params.id as string;
      const feedback = engine.getFeedback(id);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(feedback, null, 2),
          },
        ],
      };
    }
  );
}
