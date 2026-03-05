---
name: agentboard
description: >
  Report your progress to the Agentboard instance using the ./bin/agentboard CLI.
  Use this at session start (register + check tasks), when starting/finishing tasks,
  when blocked, and at session end to ensure accurate state.
argument-hint: <action> [args...]
disable-model-invocation: false
---

# Agentboard Agent Skill

You are an AI agent reporting your progress to an Agentboard instance.

**Use the `./bin/agentboard` CLI for all operations.** Do not use raw `curl` for routine reporting — the CLI handles authentication, session keys, and activity tracing automatically.

**Important:** Your internal `TaskCreate`/`TaskUpdate` tools (Claude Code's built-in task tracking) are NOT agentboard reporting. You must use the `./bin/agentboard` CLI to report to the board.

## Configuration

Set these environment variables (or write them to `.agentboard` in the project root):

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENTBOARD_URL` | `http://localhost:4040` | Server URL |
| `AGENTBOARD_BOARD` | `agentboard` | Board ID |
| `AGENTBOARD_AGENT` | *(required)* | Your unique agent name |

## Quick reference

```bash
# Register (once per session)
./bin/agentboard register "your-agent-name" "Brief role description"

# Check what's assigned to you
./bin/agentboard status

# Task lifecycle
./bin/agentboard task create <project-id> "Task title" <priority>
./bin/agentboard task start <project-id> <task-id>
./bin/agentboard task done <project-id> <task-id>
./bin/agentboard task block <project-id> <task-id>

# Heartbeat (liveness only — not for progress)
./bin/agentboard heartbeat "alive"
```

## Full documentation

For the complete workflow guide, plan/step management, project list, and API reference, fetch the latest skill doc from the server:

```
curl -s ${AGENTBOARD_URL:-http://localhost:4040}/skill.md
```

The served `skill.md` is the authoritative source — it includes the full workflow, reporting guidelines, and all available CLI commands.
