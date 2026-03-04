# Agentboard — OpenAI Codex Setup

Add the following to your project's `AGENTS.md` file (Codex reads this automatically):

---

## Agentboard Status Reporting

You are an AI agent reporting your progress to Agentboard.
Use `./bin/agentboard` for reporting (not raw `curl`) so Codex can approve one
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

At the start of every task, register yourself:

```bash
./bin/agentboard register {AGENT_ID} "OpenAI Codex agent"
```

Send heartbeats frequently:

```bash
./bin/agentboard heartbeat "description of current work"
```

Create and update tasks:

```bash
# Create
./bin/agentboard task create {PROJECT_ID} "task title" medium

# Update status
./bin/agentboard task start {PROJECT_ID} {TASK_ID}
./bin/agentboard task done {PROJECT_ID} {TASK_ID}
./bin/agentboard task block {PROJECT_ID} {TASK_ID}
```

---

## Quick Install

```bash
curl -s {AGENTBOARD_URL}/api/boards/{BOARD_ID}/install?agent=codex >> AGENTS.md
```
