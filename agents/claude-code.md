# Agentboard — Claude Code Setup

Copy this into your project's `CLAUDE.md` (or append to it):

---

## Agentboard Status Reporting

When working on this project, report your progress to Agentboard:

- **URL**: `{AGENTBOARD_URL}`
- **Board**: `{BOARD_ID}`
- **Agent**: `{AGENT_ID}`

### How to report

```bash
# Heartbeat — send frequently
curl -s -X POST {AGENTBOARD_URL}/api/boards/{BOARD_ID}/agents/{AGENT_ID}/heartbeat \
  -H "Content-Type: application/json" -d '{"message": "what you are doing"}'

# Create task
curl -s -X POST {AGENTBOARD_URL}/api/boards/{BOARD_ID}/projects/{PROJECT_ID}/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "...", "assigneeAgentId": "{AGENT_ID}", "priority": "medium"}'

# Update task status (in_progress | done | blocked)
curl -s -X PATCH {AGENTBOARD_URL}/api/boards/{BOARD_ID}/projects/{PROJECT_ID}/tasks/{TASK_ID} \
  -H "Content-Type: application/json" -d '{"status": "in_progress"}'
```

Report at the start of work, on milestones, and when completing tasks.

---

## Skill Installation (Optional)

For the `/agentboard` slash command, copy the skill directory:

```bash
mkdir -p .claude/skills/agentboard
curl -s {AGENTBOARD_URL}/api/boards/{BOARD_ID}/install?agent=claude-code > .claude/skills/agentboard/SKILL.md
```
