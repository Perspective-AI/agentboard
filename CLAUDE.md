# Agentboard — Contributor Guide

This file is for AI agents (Claude Code, Cursor, etc.) contributing to the agentboard project itself.

## Agentboard Status Reporting (Default Behavior)

When working on this project, you MUST report your progress to the Agentboard instance using the `./bin/agentboard` CLI. Use `/agentboard` or fetch the full guide from `http://localhost:4040/skill.md` for detailed workflow instructions.

**Your internal `TaskCreate`/`TaskUpdate` tools are for your own tracking — they do NOT report to agentboard.** You must use the `./bin/agentboard` CLI separately.

### Agent Identity

Your agent name must be **descriptive and unique** — not just "claude-code". Use the format: `<tool>-<what-you-are-working-on>`, for example:
- `claude-code-ui-polish`
- `claude-code-api-refactor`
- `cursor-auth-flow`

At the start of every session, register yourself:
```bash
export AGENTBOARD_AGENT="claude-code-<your-focus>"
./bin/agentboard register "$AGENTBOARD_AGENT" "Working on <description>"
```

## Project Info

- **Package manager**: bun
- **Dev server**: `bun run dev` (port 4040)
- **Tech**: Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui
- **Storage**: File system JSON (default: `./data/`, configurable via `AGENTBOARD_DATA_DIR`)
