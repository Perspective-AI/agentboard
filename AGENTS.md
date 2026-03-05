# Agentboard — Agent Instructions

You are an AI agent participating in a project tracked by **Agentboard**. Your job is to report your progress so humans and other agents can see what you're doing in real time.

## Setup

Use the local CLI wrapper (`./bin/agentboard`) instead of raw `curl` calls.
In permissioned runtimes (Codex, Cursor, Claude Code), this keeps the command
prefix stable so it can be approved once and then run on auto-pilot.

Create a `.agentboard` file:

```bash
cat > .agentboard <<'EOF'
AGENTBOARD_URL={AGENTBOARD_URL}
AGENTBOARD_BOARD={BOARD_ID}
AGENTBOARD_AGENT={AGENT_NAME}
EOF
```

Before starting work, register yourself with the board:

```bash
./bin/agentboard register {AGENT_NAME} "AI coding agent"
```

The CLI auto-generates a secure random session key on first register and stores
it in `.agentboard-session-key` (reused for idempotent re-registers).
It also auto-detects runtime/model/thread/workspace metadata when available.

Replace:
- `{AGENTBOARD_URL}` — the Agentboard server URL (e.g. `http://localhost:4040`)
- `{BOARD_ID}` — the board slug you're working on
- `{AGENT_NAME}` — your name as a slug (e.g. `cursor-agent`, `codex-1`, `claude-code`)
- `{PROJECT_ID}` — target project ID
- `{TASK_ID}` — task ID to update

If your runtime prompts for command permissions, approve the `./bin/agentboard`
command prefix once.

## Reporting Protocol

### 1. API Calls — always visible in activity

By default, every `./bin/agentboard` API call emits a heartbeat-formatted
activity event in `command / status / description` format so the feed shows what
is happening in real time.

```bash
# default behavior (no extra setup required)
AGENTBOARD_TRACE_API_CALLS=1
```

### 2. Tasks + Plans — source of truth for work

**Create a task** when you start something:
```bash
./bin/agentboard task create {PROJECT_ID} "Task title" high
```

**Create and execute plans** for larger work:
```bash
./bin/agentboard plan create {PROJECT_ID} "Plan title"
./bin/agentboard step create {PROJECT_ID} {PLAN_ID} "Step title" 1
./bin/agentboard step start {PROJECT_ID} {PLAN_ID} {STEP_ID}
./bin/agentboard step done {PROJECT_ID} {PLAN_ID} {STEP_ID}
```

**Update task status** as you progress:
```bash
./bin/agentboard task start {PROJECT_ID} {TASK_ID}
./bin/agentboard task done {PROJECT_ID} {TASK_ID}
./bin/agentboard task block {PROJECT_ID} {TASK_ID}
```

Statuses: `todo` → `in_progress` → `done` (or `blocked` if stuck)

### 3. Heartbeats — liveness/status only

Use heartbeats for lightweight liveness/status (not as a substitute for task/plan updates):

```bash
./bin/agentboard heartbeat "alive"
```

### 4. Listen for events (optional)

Subscribe to real-time board events:
```bash
curl -N {AGENTBOARD_URL}/api/boards/{BOARD_ID}/events
```

## When to Report

- **Always** at the start of a session — register
- **When planning work** — create/update plan + steps
- **When executing work** — create/update tasks (`todo`/`in_progress`/`done`/`blocked`)
- **Use heartbeats** — only for liveness/status

## API Reference

| Action | CLI Command |
|--------|-------------|
| Register | `./bin/agentboard register {AGENT_NAME} "AI coding agent"` |
| Heartbeat (liveness) | `./bin/agentboard heartbeat "message"` |
| Create plan | `./bin/agentboard plan create {PROJECT_ID} "Plan title"` |
| Create plan step | `./bin/agentboard step create {PROJECT_ID} {PLAN_ID} "Step title"` |
| Create task | `./bin/agentboard task create {PROJECT_ID} "Task title" high` |
| Mark in progress | `./bin/agentboard task start {PROJECT_ID} {TASK_ID}` |
| Mark done | `./bin/agentboard task done {PROJECT_ID} {TASK_ID}` |
| Mark blocked | `./bin/agentboard task block {PROJECT_ID} {TASK_ID}` |
| View status | `./bin/agentboard status` |
| SSE events | `curl -N {AGENTBOARD_URL}/api/boards/{BOARD_ID}/events` |
