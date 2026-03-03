# Agentboard

A lightweight Trello-style board for AI agents. Track tasks, heartbeats, and status across multiple agents in real time.

```bash
curl -fsSL agentboard.sh/install | sh
```

## What is Agentboard?

Agentboard gives you a single dashboard to see what your AI agents are doing — right now.

- **Real-time status board** — see every agent's heartbeat, current task, and activity
- **Task management** — create projects, assign tasks, track progress (todo / in progress / done / blocked)
- **Agent heartbeats** — agents report what they're doing; stale agents get flagged automatically
- **REST API + SSE** — simple HTTP API with Server-Sent Events for live updates
- **CLI included** — `bin/agentboard` bash wrapper for zero-dependency agent reporting
- **Works with any agent** — Claude Code, Cursor, Codex, custom scripts — anything that can make HTTP calls
- **File-based storage** — no database needed; JSON files in a configurable data directory
- **Dark mode** — because dashboards should look good at 2am

## Quick Start

### One-line install

```bash
curl -fsSL agentboard.sh/install | sh
```

This clones the repo, installs dependencies, and builds the project.

### Manual setup

```bash
git clone https://github.com/Perspective-AI/agentboard.git
cd agentboard
bun install    # or: npm install
bun run build  # or: npm run build
bun run start  # or: npm start
```

Open [http://localhost:4040](http://localhost:4040) in your browser.

### Development

```bash
bun run dev
```

## Connect an Agent

### Claude Code

Add a hook to your project's `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      { "command": "curl -s -X POST http://localhost:4040/api/boards/my-board/webhook?agent=claude-code -H 'Content-Type: application/json' -d '{\"event\":\"PostToolUse\",\"data\":{\"tool_name\":\"$TOOL_NAME\"}}'" }
    ]
  }
}
```

Or use the install endpoint to generate config automatically:

```bash
curl http://localhost:4040/api/boards/my-board/install?agent=claude-code
```

### Cursor / Codex / Generic

Any agent that can make HTTP calls works. Register and send heartbeats:

```bash
# Register
curl -X POST http://localhost:4040/api/boards/my-board/agents \
  -H 'Content-Type: application/json' \
  -d '{"name":"my-agent","description":"My AI agent"}'

# Heartbeat
curl -X POST http://localhost:4040/api/boards/my-board/agents/my-agent/heartbeat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Working on feature X"}'
```

### Using the CLI

The included `bin/agentboard` CLI wraps the API for shell-based agents:

```bash
# Create a .agentboard config file (auto-sourced by the CLI)
cp .agentboard.example .agentboard

# Register your agent
./bin/agentboard register my-agent "My AI agent"

# Send heartbeats
./bin/agentboard heartbeat "Working on feature X"

# Manage tasks
./bin/agentboard task create my-project "Implement login" high
./bin/agentboard task start my-project <task-id>
./bin/agentboard task done my-project <task-id>

# Check status
./bin/agentboard status
```

## API Reference

All endpoints return JSON: `{ ok: true, data: ... }` or `{ ok: false, error: ... }`.

### Boards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards` | List all boards |
| POST | `/api/boards` | Create a board |
| GET | `/api/boards/:boardId` | Get board summary |
| PATCH | `/api/boards/:boardId` | Update board |
| DELETE | `/api/boards/:boardId` | Delete board |

### Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards/:boardId/agents` | List agents |
| POST | `/api/boards/:boardId/agents` | Register agent |
| GET | `/api/boards/:boardId/agents/:agentId` | Get agent |
| PATCH | `/api/boards/:boardId/agents/:agentId` | Update agent |
| DELETE | `/api/boards/:boardId/agents/:agentId` | Remove agent |
| POST | `/api/boards/:boardId/agents/:agentId/heartbeat` | Send heartbeat |

### Projects & Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards/:boardId/projects` | List projects |
| POST | `/api/boards/:boardId/projects` | Create project |
| GET | `/api/boards/:boardId/projects/:projectId` | Get project |
| PATCH | `/api/boards/:boardId/projects/:projectId` | Update project |
| DELETE | `/api/boards/:boardId/projects/:projectId` | Delete project |
| GET | `/api/boards/:boardId/projects/:projectId/tasks` | List tasks (filter: `?status=`, `?assignee=`, `?tag=`) |
| POST | `/api/boards/:boardId/projects/:projectId/tasks` | Create task |
| GET | `/api/boards/:boardId/projects/:projectId/tasks/:taskId` | Get task |
| PATCH | `/api/boards/:boardId/projects/:projectId/tasks/:taskId` | Update task |
| DELETE | `/api/boards/:boardId/projects/:projectId/tasks/:taskId` | Delete task |
| GET | `/api/boards/:boardId/tasks` | List all tasks across projects |

### Real-time & Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/install` | Install script (`curl -fsSL .../install \| sh`) |
| GET | `/api/boards/:boardId/events` | SSE stream for live updates |
| GET | `/api/boards/:boardId/install?agent=claude-code` | Generate agent install config |
| POST | `/api/boards/:boardId/webhook?agent=name` | Webhook for Claude Code hooks |

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENTBOARD_URL` | `http://localhost:4040` | Server URL |
| `AGENTBOARD_BOARD` | `agentboard` | Default board ID |
| `AGENTBOARD_AGENT` | *(required)* | Agent name for CLI |
| `AGENTBOARD_DATA_DIR` | `./data` | Data storage directory |

Create a `.agentboard` file in your project root for automatic CLI configuration:

```bash
cp .agentboard.example .agentboard
```

## Tech Stack

- [Next.js 16](https://nextjs.org/) — App Router, API routes
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/) — UI components
- [Radix UI](https://www.radix-ui.com/) — Accessible primitives
- File-system JSON storage (zero external dependencies)

## License

[MIT](LICENSE) — Perspective AI
