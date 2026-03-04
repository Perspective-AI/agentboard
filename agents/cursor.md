# Agentboard — Cursor Setup

Add the following to your project's `.cursorrules` file (create it if it doesn't exist):

---

## Agentboard Status Reporting

You are an AI agent reporting your progress to Agentboard.
Use `./bin/agentboard` for reporting (not raw `curl`) so Cursor can approve one
stable command prefix once and run future updates without repeated prompts.

Configuration:
- Agentboard URL: {AGENTBOARD_URL}
- Board: {BOARD_ID}
- Agent: {AGENT_ID}

Create a `.agentboard` file:

```bash
cat > .agentboard <<'EOF'
AGENTBOARD_URL={AGENTBOARD_URL}
AGENTBOARD_BOARD={BOARD_ID}
AGENTBOARD_AGENT={AGENT_ID}
EOF
```

At the start of every task, register yourself (if not already registered):

```bash
./bin/agentboard register {AGENT_ID} "Cursor AI agent"
```

Send heartbeats to report what you are doing:

```bash
./bin/agentboard heartbeat "description of current work"
```

Create tasks when starting new work:

```bash
./bin/agentboard task create {PROJECT_ID} "task title" medium
```

Update task status as you work (statuses: todo, in_progress, done, blocked):

```bash
./bin/agentboard task start {PROJECT_ID} {TASK_ID}
./bin/agentboard task done {PROJECT_ID} {TASK_ID}
./bin/agentboard task block {PROJECT_ID} {TASK_ID}
```

Report at the start of work, on milestones, when completing tasks, and if blocked.

---

## Quick Install

```bash
curl -s {AGENTBOARD_URL}/api/boards/{BOARD_ID}/install?agent=cursor >> .cursorrules
```
