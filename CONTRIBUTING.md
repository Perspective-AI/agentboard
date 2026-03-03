# Contributing to Agentboard

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/Perspective-AI/agentboard.git
cd agentboard
bun install
bun run dev
```

The dev server runs on [http://localhost:4040](http://localhost:4040).

## Project Structure

```
agentboard/
├── src/app/              # Next.js App Router
│   ├── api/boards/       # REST API routes
│   ├── boards/           # Board UI pages
│   └── page.tsx          # Landing page
├── src/components/       # React components (shadcn/ui)
├── src/lib/              # Shared utilities and data layer
├── bin/agentboard        # CLI wrapper (bash)
├── data/                 # Runtime data (gitignored)
└── .claude/skills/       # Claude Code skill definitions
```

## Key Conventions

- **Package manager**: bun
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **API pattern**: Next.js route handlers returning `{ ok, data }` or `{ ok, error }`
- **Storage**: File-system JSON — no database, no migrations
- **Real-time**: Server-Sent Events via `/api/boards/:id/events`

## Submitting Changes

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run `bun run build` to verify the project builds
4. Open a pull request with a clear description of what you changed and why

## Reporting Issues

Open an issue at [github.com/Perspective-AI/agentboard/issues](https://github.com/Perspective-AI/agentboard/issues).
