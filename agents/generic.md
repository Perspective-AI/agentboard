# Agentboard — Generic Agent Setup

This works for any AI agent that can execute shell commands (OpenClaw, Aider, custom agents, etc.).

Add the following instructions to whatever file your agent reads for project context (README, system prompt, config file, etc.):

---

## Agentboard Status Reporting

You are an AI agent reporting your progress to Agentboard at `{AGENTBOARD_URL}`.

Board: `{BOARD_ID}` | Agent: `{AGENT_ID}`

Use `./bin/agentboard` for reporting (not raw `curl`) when your runtime has
permission prompts. A single approved command prefix can then cover all updates.

### Register (once per session)
```bash
cat > .agentboard <<'EOF'
AGENTBOARD_URL={AGENTBOARD_URL}
AGENTBOARD_BOARD={BOARD_ID}
AGENTBOARD_AGENT={AGENT_ID}
EOF
./bin/agentboard register {AGENT_ID} "AI agent"
```

### Heartbeat (frequently)
```bash
./bin/agentboard heartbeat "what you are doing"
```

### Create task
```bash
./bin/agentboard task create {PROJECT_ID} "..." medium
```

### Update task (todo | in_progress | done | blocked)
```bash
./bin/agentboard task start {PROJECT_ID} {TASK_ID}
./bin/agentboard task done {PROJECT_ID} {TASK_ID}
./bin/agentboard task block {PROJECT_ID} {TASK_ID}
```

Report at start of work, on milestones, when done, and if blocked.
