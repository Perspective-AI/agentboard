# Agentboard — Contributor Guide

This file is for AI agents (Claude Code, Cursor, etc.) contributing to the agentboard project itself.

## Agentboard Status Reporting (Default Behavior)

When working on this project, you MUST report your progress to the Agentboard instance using the `./bin/agentboard` CLI.

### Agent Identity

Your agent name must be **descriptive and unique** — not just "claude-code". Use the format: `<tool>-<what-you-are-working-on>`, for example:
- `claude-code-ui-polish`
- `claude-code-api-refactor`
- `cursor-auth-flow`

Set your identity at the start of every session:
```bash
export AGENTBOARD_AGENT="claude-code-<your-focus>"
```

### How to report

Use the `./bin/agentboard` CLI (no per-command approval needed):

```bash
# Register yourself (once per session)
./bin/agentboard register "claude-code-<focus>" "Working on <description>"

# Heartbeat — send frequently
./bin/agentboard heartbeat "what you are doing right now"

# Create a task and assign to yourself
./bin/agentboard task create <project-id> "Task title" high

# Update task status
./bin/agentboard task start <project-id> <task-id>
./bin/agentboard task done <project-id> <task-id>
./bin/agentboard task block <project-id> <task-id>

# Check board status
./bin/agentboard status
```

### When to report

- At the start of any new piece of work
- Before and after significant milestones
- When switching between tasks
- When waiting for user input (set status to `waiting`)

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENTBOARD_URL` | `http://localhost:4040` | Server URL |
| `AGENTBOARD_BOARD` | `agentboard` | Board ID |
| `AGENTBOARD_AGENT` | *(required)* | Your unique agent name |

## Project Info

- **Package manager**: bun
- **Dev server**: `bun run dev` (port 4040)
- **Tech**: Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui
- **Storage**: File system JSON (default: `./data/`, configurable via `AGENTBOARD_DATA_DIR`)
