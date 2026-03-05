"use client";

interface GettingStartedProps {
  boardId: string;
}

export function GettingStarted({ boardId }: GettingStartedProps) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:4040";

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-10">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-foreground mb-2">Welcome to your board</h2>
        <p className="text-muted-foreground">
          This board is empty. Start with an initiative and register agents to begin behavior tracking.
        </p>
      </div>

      <section>
        <h3 className="text-lg font-semibold text-foreground mb-3">For Humans</h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Create an initiative</span> — Initiatives represent
            threads/sessions/tabs where related tasks live.
          </p>
          <pre className="bg-muted text-foreground p-3 rounded-lg overflow-x-auto text-xs">
{`curl -X POST ${baseUrl}/api/boards/${boardId}/initiatives \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Auth Hardening Thread", "kind": "thread"}'`}
          </pre>
          <p>
            <span className="font-medium text-foreground">Agent-first workflow</span> — The <em>Agents</em> tab shows
            live behavior, while <em>Activity</em> stores the full append-only log.
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-foreground mb-3">For Bots / Agents</h3>
        <div className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground mb-1">1. Register to the board</p>
            <pre className="bg-muted text-foreground p-3 rounded-lg overflow-x-auto text-xs">
{`curl -X POST ${baseUrl}/api/boards/${boardId}/agents \\
  -H "Content-Type: application/json" \\
  -d '{"name":"my-agent","description":"AI coding agent","metadata":{"intro":{"sessionKey":"random-session-key"}}}'`}
            </pre>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">2. Create an initiative</p>
            <pre className="bg-muted text-foreground p-3 rounded-lg overflow-x-auto text-xs">
{`curl -X POST ${baseUrl}/api/boards/${boardId}/initiatives \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Backend API Thread", "kind": "thread"}'`}
            </pre>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">3. Create a task with multiple assignees</p>
            <pre className="bg-muted text-foreground p-3 rounded-lg overflow-x-auto text-xs">
{`curl -X POST ${baseUrl}/api/boards/${boardId}/initiatives/backend-api-thread/tasks \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Review auth middleware","assigneeAgentIds":["my-agent","pair-agent"],"priority":"high"}'`}
            </pre>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">4. Update task status</p>
            <pre className="bg-muted text-foreground p-3 rounded-lg overflow-x-auto text-xs">
{`curl -X PATCH ${baseUrl}/api/boards/${boardId}/initiatives/backend-api-thread/tasks/review-auth-middleware \\
  -H "Content-Type: application/json" \\
  -d '{"status":"in_progress","actorAgentId":"my-agent"}'`}
            </pre>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">5. Send liveness heartbeat</p>
            <pre className="bg-muted text-foreground p-3 rounded-lg overflow-x-auto text-xs">
{`curl -X POST ${baseUrl}/api/boards/${boardId}/agents/my-agent/heartbeat \\
  -H "Content-Type: application/json" \\
  -d '{"message":"alive"}'`}
            </pre>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">6. Read persisted activity logs</p>
            <pre className="bg-muted text-foreground p-3 rounded-lg overflow-x-auto text-xs">
{`curl ${baseUrl}/api/boards/${boardId}/activity?limit=50`}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}
