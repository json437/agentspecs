import * as storage from "./storage.js";
import type { SpecMeta, FeedbackItem, FeedbackReply, GitSnapshot } from "./storage.js";
import { randomUUID } from "node:crypto";
import { execSync } from "node:child_process";

export type { SpecMeta, FeedbackItem, FeedbackReply, GitSnapshot } from "./storage.js";

export interface SpecResult {
  id: string;
  content: string;
  meta: SpecMeta;
}

let projectDir = process.cwd();

export function setProjectDir(dir: string): void {
  projectDir = dir;
}

export function getProjectDir(): string {
  return projectDir;
}

function getGitSnapshot(): GitSnapshot | null {
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: projectDir, encoding: "utf-8" }).trim();
    const commit = execSync("git rev-parse --short HEAD", { cwd: projectDir, encoding: "utf-8" }).trim();
    const commitMessage = execSync("git log -1 --pretty=%s", { cwd: projectDir, encoding: "utf-8" }).trim();
    const dirtyCheck = execSync("git status --porcelain", { cwd: projectDir, encoding: "utf-8" }).trim();
    return { branch, commit, commitMessage, dirty: dirtyCheck.length > 0 };
  } catch {
    return null;
  }
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

export function initProject(): void {
  storage.initProject(projectDir);
}

const TEMPLATES: Record<string, string> = {
  prd: `# {title}

## Problem

What problem does this solve? Who is affected?

## Goals

- Goal 1
- Goal 2

## Non-Goals

- Explicitly out of scope

## User Stories

- As a [user], I want [action] so that [benefit]

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | | Must |
| FR-2 | | Should |

### Non-Functional Requirements

- Performance:
- Security:
- Scalability:

## Design

### Architecture

\`\`\`mermaid
graph TD
    A[Component] --> B[Component]
\`\`\`

### API Changes

### Data Model Changes

## Milestones

| Milestone | Description | Target Date |
|-----------|-------------|-------------|
| M1 | | |

## Open Questions

- [ ] Question 1
- [ ] Question 2

## References

`,
  api: `# {title}

## Overview

Brief description of this API.

## Base URL

\`\`\`
/api/v1
\`\`\`

## Authentication

## Endpoints

### GET /resource

**Description:**

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| | | | |

**Response:**

\`\`\`json
{
  "data": []
}
\`\`\`

### POST /resource

**Description:**

**Request Body:**

\`\`\`json
{
}
\`\`\`

**Response:**

\`\`\`json
{
}
\`\`\`

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 500 | Internal Server Error |

## Rate Limits

## Changelog

`,
  architecture: `# {title}

## Context

What is the current state? Why do we need this change?

## Decision

What architectural decision are we making?

## System Overview

\`\`\`mermaid
graph TD
    A[Service A] --> B[Service B]
    B --> C[Database]
\`\`\`

## Components

### Component 1

- **Responsibility:**
- **Technology:**
- **Interfaces:**

### Component 2

- **Responsibility:**
- **Technology:**
- **Interfaces:**

## Data Flow

\`\`\`mermaid
sequenceDiagram
    participant Client
    participant API
    participant DB
    Client->>API: Request
    API->>DB: Query
    DB-->>API: Result
    API-->>Client: Response
\`\`\`

## Trade-offs

| Option | Pros | Cons |
|--------|------|------|
| Option A | | |
| Option B | | |

## Security Considerations

## Performance Considerations

## Migration Strategy

## References

`,
  rfc: `# RFC: {title}

## Summary

One-paragraph summary of the proposal.

## Motivation

Why are we doing this? What problem does it solve?

## Detailed Design

### Overview

### Implementation Details

### API Changes

## Drawbacks

Why should we *not* do this?

## Alternatives

What other designs were considered?

| Alternative | Pros | Cons |
|-------------|------|------|
| | | |

## Unresolved Questions

- [ ] Question 1
- [ ] Question 2

## Future Work

`,
  "bug-report": `# Bug: {title}

## Summary

One-sentence description of the bug.

## Environment

- **Version:**
- **OS:**
- **Browser:**

## Steps to Reproduce

1. Step 1
2. Step 2
3. Step 3

## Expected Behavior

What should happen.

## Actual Behavior

What actually happens.

## Screenshots / Logs

## Root Cause Analysis

## Proposed Fix

## Impact

- **Severity:** Critical / High / Medium / Low
- **Affected Users:**

`,
  migration: `# Migration: {title}

## Overview

What is being migrated and why.

## Current State

## Target State

## Migration Plan

### Phase 1: Preparation

- [ ] Step 1
- [ ] Step 2

### Phase 2: Migration

- [ ] Step 1
- [ ] Step 2

### Phase 3: Validation

- [ ] Step 1
- [ ] Step 2

### Phase 4: Cleanup

- [ ] Step 1

## Rollback Plan

How to roll back if something goes wrong.

## Data Migration

### Schema Changes

### Data Transformation

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| | | | |

## Timeline

| Phase | Start | End | Owner |
|-------|-------|-----|-------|
| | | | |

## Checklist

- [ ] Backup taken
- [ ] Stakeholders notified
- [ ] Rollback tested
- [ ] Monitoring in place

`,
  runbook: `# Runbook: {title}

## Overview

What this runbook covers and when to use it.

## Prerequisites

- Access to:
- Tools needed:

## Alert / Trigger

What alert or condition triggers this runbook.

## Diagnosis

### Step 1: Check service health

\`\`\`bash
# command here
\`\`\`

### Step 2: Check logs

\`\`\`bash
# command here
\`\`\`

### Step 3: Check dependencies

## Resolution

### Option A: Restart service

\`\`\`bash
# command here
\`\`\`

### Option B: Scale up

\`\`\`bash
# command here
\`\`\`

### Option C: Rollback

\`\`\`bash
# command here
\`\`\`

## Verification

How to verify the issue is resolved.

## Escalation

- **Level 1:** On-call engineer
- **Level 2:** Team lead
- **Level 3:** VP Engineering

## Post-Incident

- [ ] Incident report filed
- [ ] Root cause identified
- [ ] Prevention measures documented

`,
  "design-doc": `# {title}

## Authors

## Status

Draft

## Context

What is the background? What problem are we solving?

## Goals

- Goal 1
- Goal 2

## Non-Goals

- Non-goal 1

## Proposed Design

### Overview

### Detailed Design

### User Experience

\`\`\`mermaid
flowchart LR
    A[User Action] --> B[System Response]
\`\`\`

### Technical Design

## Alternatives Considered

### Alternative 1

**Pros:**
**Cons:**

### Alternative 2

**Pros:**
**Cons:**

## Cross-Cutting Concerns

### Security

### Privacy

### Accessibility

### Observability

## Implementation Plan

| Phase | Description | Estimate |
|-------|-------------|----------|
| 1 | | |
| 2 | | |

## Open Questions

- [ ] Question 1

## References

`,
};

export function createSpec(opts: {
  title: string;
  content: string;
  template?: string;
}): SpecResult {
  const id = slugify(opts.title);
  const now = new Date().toISOString();
  const git = getGitSnapshot();

  // If template specified and content is minimal, use template
  let content = opts.content;
  if (opts.template && TEMPLATES[opts.template] && opts.content.trim().length < 20) {
    content = TEMPLATES[opts.template].replace(/\{title\}/g, opts.title);
  }

  const meta: SpecMeta = {
    id,
    title: opts.title,
    status: "draft",
    template: opts.template,
    createdAt: now,
    updatedAt: now,
    version: 1,
    versionTimestamps: { "1": now },
    versionGit: git ? { "1": git } : undefined,
  };

  storage.initProject(projectDir);
  storage.saveSpec(projectDir, id, content, meta);
  return { id, content, meta };
}

export function updateSpec(id: string, content: string): SpecResult {
  const existing = storage.loadSpec(projectDir, id);
  if (!existing) throw new Error(`Spec not found: ${id}`);

  const now = new Date().toISOString();
  const newVersion = existing.meta.version + 1;
  const git = getGitSnapshot();
  const meta: SpecMeta = {
    ...existing.meta,
    version: newVersion,
    updatedAt: now,
    versionTimestamps: {
      ...(existing.meta.versionTimestamps || {}),
      [String(newVersion)]: now,
    },
    versionGit: {
      ...(existing.meta.versionGit || {}),
      ...(git ? { [String(newVersion)]: git } : {}),
    },
  };

  storage.saveSpec(projectDir, id, content, meta);
  return { id, content, meta };
}

export function updateSection(
  id: string,
  heading: string,
  newContent: string
): SpecResult {
  const existing = storage.loadSpec(projectDir, id);
  if (!existing) throw new Error(`Spec not found: ${id}`);

  const lines = existing.content.split("\n");
  const headingPattern = new RegExp(
    `^(#{1,6})\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
    "i"
  );

  let startIdx = -1;
  let headingLevel = 0;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(headingPattern);
    if (match) {
      startIdx = i;
      headingLevel = match[1].length;
      break;
    }
  }

  if (startIdx === -1) throw new Error(`Section not found: ${heading}`);

  // Find end of section (next heading of same or higher level)
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+/);
    if (match && match[1].length <= headingLevel) {
      endIdx = i;
      break;
    }
  }

  // Replace section content (keep the heading line)
  const updatedLines = [
    ...lines.slice(0, startIdx + 1),
    "",
    newContent,
    "",
    ...lines.slice(endIdx),
  ];

  const updatedContent = updatedLines.join("\n");
  return updateSpec(id, updatedContent);
}

export function getSpec(id: string): SpecResult | null {
  const result = storage.loadSpec(projectDir, id);
  if (!result) return null;
  return { id, ...result };
}

export function getVersion(id: string, version: number): string | null {
  return storage.loadVersion(projectDir, id, version);
}

export function listSpecs(): SpecMeta[] {
  return storage.listSpecs(projectDir);
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["in_review", "rejected"],
  in_review: ["draft", "approved", "rejected"],
  approved: ["implementing", "draft", "rejected"],
  implementing: ["done", "approved", "rejected"],
  done: ["draft"],
  rejected: ["draft"],
};

export function setStatus(id: string, status: SpecMeta["status"]): SpecMeta {
  const existing = storage.loadSpec(projectDir, id);
  if (!existing) throw new Error(`Spec not found: ${id}`);

  const current = existing.meta.status;
  const allowed = STATUS_TRANSITIONS[current] || [];
  if (!allowed.includes(status)) {
    throw new Error(`Cannot transition from "${current}" to "${status}". Allowed: ${allowed.join(", ")}`);
  }

  const meta: SpecMeta = {
    ...existing.meta,
    status,
    updatedAt: new Date().toISOString(),
  };

  storage.saveSpec(projectDir, id, existing.content, meta);
  return meta;
}

export function revertToVersion(id: string, version: number): SpecResult {
  const versionContent = storage.loadVersion(projectDir, id, version);
  if (versionContent === null) throw new Error(`Version ${version} not found for spec: ${id}`);
  return updateSpec(id, versionContent);
}

export function addFeedback(
  id: string,
  section: string,
  comment: string,
  author: "human" | "agent" = "human"
): FeedbackItem {
  const existing = storage.loadSpec(projectDir, id);
  if (!existing) throw new Error(`Spec not found: ${id}`);

  const feedback = storage.loadFeedback(projectDir, id);
  const item: FeedbackItem = {
    id: randomUUID().slice(0, 8),
    section,
    comment,
    resolved: false,
    createdAt: new Date().toISOString(),
    author,
    replies: [],
  };

  feedback.push(item);
  storage.saveFeedback(projectDir, id, feedback);
  return item;
}

export function replyToFeedback(
  specId: string,
  feedbackId: string,
  comment: string,
  author: "human" | "agent" = "agent"
): FeedbackReply {
  const feedback = storage.loadFeedback(projectDir, specId);
  const item = feedback.find((f) => f.id === feedbackId);
  if (!item) throw new Error(`Feedback not found: ${feedbackId}`);

  const reply: FeedbackReply = {
    id: randomUUID().slice(0, 8),
    author,
    comment,
    createdAt: new Date().toISOString(),
  };

  item.replies = item.replies || [];
  item.replies.push(reply);
  storage.saveFeedback(projectDir, specId, feedback);
  return reply;
}

export function getFeedback(id: string, unresolvedOnly = true): FeedbackItem[] {
  const feedback = storage.loadFeedback(projectDir, id);
  if (unresolvedOnly) return feedback.filter((f) => !f.resolved);
  return feedback;
}

export function linkCommit(id: string, commit?: string): SpecMeta {
  const existing = storage.loadSpec(projectDir, id);
  if (!existing) throw new Error(`Spec not found: ${id}`);

  // If no commit provided, use current HEAD
  let sha = commit;
  if (!sha) {
    try {
      sha = execSync("git rev-parse --short HEAD", { cwd: projectDir, encoding: "utf-8" }).trim();
    } catch {
      throw new Error("Not in a git repository or git not available");
    }
  }

  const linked = existing.meta.linkedCommits || [];
  if (!linked.includes(sha)) {
    linked.push(sha);
  }

  const meta: SpecMeta = {
    ...existing.meta,
    linkedCommits: linked,
    updatedAt: new Date().toISOString(),
  };

  storage.saveSpec(projectDir, id, existing.content, meta);
  return meta;
}

export function deleteSpec(id: string): boolean {
  return storage.deleteSpec(projectDir, id);
}

export function resolveFeedback(specId: string, feedbackId: string): void {
  const feedback = storage.loadFeedback(projectDir, specId);
  const item = feedback.find((f) => f.id === feedbackId);
  if (!item) throw new Error(`Feedback not found: ${feedbackId}`);

  item.resolved = true;
  storage.saveFeedback(projectDir, specId, feedback);
}
