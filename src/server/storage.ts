import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

export interface GitSnapshot {
  branch: string;
  commit: string;        // short SHA
  commitMessage?: string;
  dirty: boolean;        // true if working tree had uncommitted changes
}

export interface SpecMeta {
  id: string;
  title: string;
  status: "draft" | "in_review" | "approved" | "implementing" | "done" | "rejected";
  template?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  versionTimestamps?: Record<string, string>;
  versionGit?: Record<string, GitSnapshot>;  // git context per version
  linkedCommits?: string[];                    // commits that implement this spec
}

export interface FeedbackReply {
  id: string;
  author: "human" | "agent";
  comment: string;
  createdAt: string;
}

export interface FeedbackItem {
  id: string;
  section: string;
  comment: string;
  resolved: boolean;
  createdAt: string;
  author?: "human" | "agent";
  replies?: FeedbackReply[];
}

function agentspecsDir(projectDir: string): string {
  return join(projectDir, ".agentspecs");
}

function specsDir(projectDir: string): string {
  return join(agentspecsDir(projectDir), "specs");
}

function specDir(projectDir: string, id: string): string {
  return join(specsDir(projectDir), id);
}

export function initProject(projectDir: string): void {
  const dir = agentspecsDir(projectDir);
  mkdirSync(join(dir, "specs"), { recursive: true });
  mkdirSync(join(dir, "templates"), { recursive: true });
  if (!existsSync(join(dir, "config.json"))) {
    writeFileSync(join(dir, "config.json"), JSON.stringify({ port: 0 }, null, 2));
  }
}

export function saveSpec(
  projectDir: string,
  id: string,
  content: string,
  meta: SpecMeta
): void {
  const dir = specDir(projectDir, id);
  const versionsDir = join(dir, "versions");
  mkdirSync(versionsDir, { recursive: true });

  writeFileSync(join(dir, "spec.md"), content);
  writeFileSync(join(dir, "meta.json"), JSON.stringify(meta, null, 2));
  writeFileSync(join(versionsDir, `v${meta.version}.md`), content);
}

export function loadSpec(
  projectDir: string,
  id: string
): { content: string; meta: SpecMeta } | null {
  const dir = specDir(projectDir, id);
  if (!existsSync(join(dir, "spec.md"))) return null;

  const content = readFileSync(join(dir, "spec.md"), "utf-8");
  const meta: SpecMeta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf-8"));
  return { content, meta };
}

export function loadVersion(
  projectDir: string,
  id: string,
  version: number
): string | null {
  const path = join(specDir(projectDir, id), "versions", `v${version}.md`);
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf-8");
}

export function listSpecs(projectDir: string): SpecMeta[] {
  const dir = specsDir(projectDir);
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const metaPath = join(dir, d.name, "meta.json");
      if (!existsSync(metaPath)) return null;
      return JSON.parse(readFileSync(metaPath, "utf-8")) as SpecMeta;
    })
    .filter((m): m is SpecMeta => m !== null)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function saveFeedback(
  projectDir: string,
  id: string,
  feedback: FeedbackItem[]
): void {
  const dir = specDir(projectDir, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "feedback.json"), JSON.stringify(feedback, null, 2));
}

export function loadFeedback(projectDir: string, id: string): FeedbackItem[] {
  const path = join(specDir(projectDir, id), "feedback.json");
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function deleteSpec(projectDir: string, id: string): boolean {
  const dir = specDir(projectDir, id);
  if (!existsSync(dir)) return false;
  rmSync(dir, { recursive: true, force: true });
  return true;
}

export function getConfig(projectDir: string): { port: number } {
  const path = join(agentspecsDir(projectDir), "config.json");
  if (!existsSync(path)) return { port: 0 };
  return JSON.parse(readFileSync(path, "utf-8"));
}
