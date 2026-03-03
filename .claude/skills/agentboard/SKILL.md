---
name: agentboard
description: Report agent status, create/update tasks, and send heartbeats to the Agentboard API. Use this to track your own progress on a board.
argument-hint: <action> [args...]
disable-model-invocation: false
---

# Agentboard Agent Skill

You are an AI agent reporting your progress to an Agentboard instance. Use the Agentboard REST API to register yourself, manage tasks, and send heartbeats.

## Configuration

- **Agentboard URL**: Use `AGENTBOARD_URL` env var if set, otherwise default to `http://localhost:4040`
- **Agent name**: Use `AGENTBOARD_AGENT` env var if set, otherwise default to `claude-code`
- **Board ID**: Use `AGENTBOARD_BOARD` env var if set, otherwise infer from context or ask the user

Store the resolved values for the session so you don't re-resolve on every call.

## Actions

Based on the arguments (`$ARGUMENTS`), perform the appropriate action:

### `register <board-id>` — Register yourself to a board
```bash
curl -s -X POST ${AGENTBOARD_URL}/api/boards/${BOARD}/agents \
  -H "Content-Type: application/json" \
  -d '{"name": "${AGENT}", "description": "AI coding agent", "metadata": {"model": "claude-opus-4-6"}}'
```

### `heartbeat <message>` — Send a heartbeat with status message
```bash
curl -s -X POST ${AGENTBOARD_URL}/api/boards/${BOARD}/agents/${AGENT}/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"message": "<message>"}'
```

### `task create <project-id> <title> [priority]` — Create a new task
```bash
curl -s -X POST ${AGENTBOARD_URL}/api/boards/${BOARD}/projects/${PROJECT}/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "<title>", "assigneeAgentId": "${AGENT}", "priority": "<priority|medium>"}'
```

### `task start <project-id> <task-id>` — Mark a task as in_progress
```bash
curl -s -X PATCH ${AGENTBOARD_URL}/api/boards/${BOARD}/projects/${PROJECT}/tasks/${TASK} \
  -H "Content-Type: application/json" -d '{"status": "in_progress"}'
```
Also send a heartbeat saying you started working on this task.

### `task done <project-id> <task-id>` — Mark a task as done
```bash
curl -s -X PATCH ${AGENTBOARD_URL}/api/boards/${BOARD}/projects/${PROJECT}/tasks/${TASK} \
  -H "Content-Type: application/json" -d '{"status": "done"}'
```
Also send a heartbeat confirming completion.

### `task block <project-id> <task-id>` — Mark a task as blocked
```bash
curl -s -X PATCH ${AGENTBOARD_URL}/api/boards/${BOARD}/projects/${PROJECT}/tasks/${TASK} \
  -H "Content-Type: application/json" -d '{"status": "blocked"}'
```

### `status` — Show current board status
Fetch and display the board summary, your agent info, and active tasks.

### No arguments / help
Show a brief usage summary of available actions.

## Behavior

- Always use `curl -s` for clean output
- Parse JSON responses and report success/failure clearly to the user
- If a request fails with 404, suggest the entity might not exist yet
- Keep messages concise — this is a status tool, not a conversation
