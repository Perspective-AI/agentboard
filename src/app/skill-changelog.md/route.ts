import { NextRequest } from "next/server";

const CHANGELOG: Array<{
  version: string;
  updatedAt: string;
  notes: string[];
}> = [
  {
    version: "0.3.3",
    updatedAt: "2026-03-04T12:54:00-08:00",
    notes: [
      "Switched release metadata to full timestamps with timezone offsets.",
      "Updated version checks to use timestamp semantics for same-day releases.",
    ],
  },
  {
    version: "0.3.2",
    updatedAt: "2026-03-04T12:53:00-08:00",
    notes: [
      "Removed inline changelog from /skill.md to reduce LLM context size.",
      "Published change history on a dedicated /skill-changelog.md route.",
    ],
  },
  {
    version: "0.3.1",
    updatedAt: "2026-03-04T12:50:00-08:00",
    notes: [
      "Added explicit release metadata fields (version and updated value) in /skill.md.",
    ],
  },
  {
    version: "0.3.0",
    updatedAt: "2026-03-04T12:44:00-08:00",
    notes: [
      "Switched routine reporting from raw curl calls to ./bin/agentboard.",
      "Added one-time command-prefix approval guidance for permissioned runtimes.",
      "Added explicit .agentboard setup commands in usage examples.",
    ],
  },
  {
    version: "0.2.0",
    updatedAt: "2026-03-03T17:40:00-08:00",
    notes: ["Initial published Agentboard skill workflow."],
  },
];

export async function GET(request: NextRequest) {
  const instanceUrl =
    process.env.AGENTBOARD_URL ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  const entries = CHANGELOG.map((entry) => {
    const notes = entry.notes.map((note) => `- ${note}`).join("\n");
    return `## ${entry.version} (${entry.updatedAt})\n${notes}`;
  }).join("\n\n");

  const markdown = `---
name: agentboard-skill-changelog
updated: 2026-03-04T12:54:00-08:00
source: ${instanceUrl}/skill.md
---

# Agentboard Skill Changelog

This changelog tracks all published changes to \`/skill.md\`.

${entries}
`;

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
