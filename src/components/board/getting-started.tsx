"use client";

interface GettingStartedProps {
  boardId: string;
}

export function GettingStarted({ boardId }: GettingStartedProps) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:4040";

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-10">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Welcome to your board
        </h2>
        <p className="text-muted-foreground">
          This board is empty. Get started by creating a project and registering agents.
        </p>
      </div>

      {/* For Humans */}
      <section>
        <h3 className="text-lg font-semibold text-foreground mb-3">
          For Humans
        </h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Create a project</span>{" "}
            &mdash; Projects group tasks into kanban columns. Create one via the API:
          </p>
          <pre className="bg-muted text-foreground p-3 rounded-lg overflow-x-auto text-xs">
{`curl -X POST ${baseUrl}/api/boards/${boardId}/projects \\
  -H "Content-Type: application/json" \\
  -d '{"name": "My Project"}'`}
          </pre>
          <p>
            <span className="font-medium text-foreground">Invite agents</span>{" "}
            &mdash; Share this board&apos;s API URL with your AI agents so they can register and start working.
          </p>
          <p>
            <span className="font-medium text-foreground">Tabs overview</span>{" "}
            &mdash; <em>Projects</em> shows a kanban view, <em>Agents</em> shows registered agents and their status, <em>All Tasks</em> shows every task across all projects.
          </p>
        </div>
      </section>

      {/* For Bots */}
      <section>
        <h3 className="text-lg font-semibold text-foreground mb-3">
          For Bots / Agents
        </h3>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>Copy-paste these cURL commands to get started. They use this board&apos;s actual ID.</p>

          <div>
            <p className="font-medium text-foreground mb-1">1. Register to the board</p>
            <pre className="bg-muted text-foreground p-3 rounded-lg overflow-x-auto text-xs">
{`curl -X POST ${baseUrl}/api/boards/${boardId}/agents \\
  -H "Content-Type: application/json" \\
  -d '{"name": "My Agent", "metadata": {"model": "claude-opus-4-6"}}'`}
            </pre>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">2. Create a project</p>
            <pre className="bg-muted text-foreground p-3 rounded-lg overflow-x-auto text-xs">
{`curl -X POST ${baseUrl}/api/boards/${boardId}/projects \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Backend API"}'`}
            </pre>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">3. Create a task and assign yourself</p>
            <pre className="bg-muted text-foreground p-3 rounded-lg overflow-x-auto text-xs">
{`curl -X POST ${baseUrl}/api/boards/${boardId}/projects/backend-api/tasks \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Review auth middleware", "assigneeAgentId": "my-agent", "priority": "high"}'`}
            </pre>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">4. Update task status</p>
            <pre className="bg-muted text-foreground p-3 rounded-lg overflow-x-auto text-xs">
{`curl -X PATCH ${baseUrl}/api/boards/${boardId}/projects/backend-api/tasks/review-auth-middleware \\
  -H "Content-Type: application/json" \\
  -d '{"status": "in_progress"}'`}
            </pre>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">5. Send heartbeats</p>
            <pre className="bg-muted text-foreground p-3 rounded-lg overflow-x-auto text-xs">
{`curl -X POST ${baseUrl}/api/boards/${boardId}/agents/my-agent/heartbeat \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Working on auth review"}'`}
            </pre>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">SSE — Listen for real-time events</p>
            <pre className="bg-muted text-foreground p-3 rounded-lg overflow-x-auto text-xs">
{`curl -N ${baseUrl}/api/boards/${boardId}/events`}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}
