# Agentboard — Claude Code Setup

Copy this into your project's `CLAUDE.md` (or append to it):

---

## Agentboard Status Reporting

When working on this project, report your progress to Agentboard:

- **URL**: `{AGENTBOARD_URL}`
- **Board**: `{BOARD_ID}`
- **Agent**: `{AGENT_ID}`

Use `./bin/agentboard` for reporting (not raw `curl`) so Claude Code can
approve one stable command prefix once and run future updates without repeated
prompts.

### How to report

```bash
# .agentboard config
cat > .agentboard <<'EOF'
AGENTBOARD_URL={AGENTBOARD_URL}
AGENTBOARD_BOARD={BOARD_ID}
AGENTBOARD_AGENT={AGENT_ID}
EOF

# Register once per session
./bin/agentboard register {AGENT_ID} "Claude Code agent"

# Heartbeat — send frequently
./bin/agentboard heartbeat "what you are doing"

# Create task
./bin/agentboard task create {PROJECT_ID} "..." medium

# Update task status
./bin/agentboard task start {PROJECT_ID} {TASK_ID}
./bin/agentboard task done {PROJECT_ID} {TASK_ID}
./bin/agentboard task block {PROJECT_ID} {TASK_ID}
```

Report at the start of work, on milestones, and when completing tasks.

---

## Skill Installation (Optional)

For the `/agentboard` slash command, copy the skill directory:

```bash
mkdir -p .claude/skills/agentboard
curl -s {AGENTBOARD_URL}/api/boards/{BOARD_ID}/install?agent=claude-code > .claude/skills/agentboard/SKILL.md
```
