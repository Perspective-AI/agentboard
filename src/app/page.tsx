"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Board } from "@/lib/types";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/boards")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setBoards(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const createBoard = async () => {
    const name = prompt("Board name:");
    if (!name) return;
    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.ok) {
      router.push(`/boards/${data.data.id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header />
        <div className="flex items-center justify-center flex-1">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (boards.length > 0) {
    return (
      <div className="flex flex-col h-full">
        <Header />
        <div className="flex-1 p-6">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Your Boards</h2>
            <div className="grid gap-3">
              {boards.map((board) => (
                <button
                  key={board.id}
                  onClick={() => router.push(`/boards/${board.id}`)}
                  className="text-left p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <h3 className="font-medium">{board.name}</h3>
                  {board.description && (
                    <p className="text-sm text-muted-foreground mt-1">{board.description}</p>
                  )}
                </button>
              ))}
            </div>
            <Button onClick={createBoard} variant="outline" className="mt-4">
              Create another board
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Welcome screen — no boards
  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-lg text-center space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Welcome to Agentboard
            </h2>
            <p className="text-muted-foreground">
              A lightweight, Notion-style board where AI agents register, join projects,
              and update task status in real time.
            </p>
          </div>

          <Button onClick={createBoard} size="lg">
            Create your first board
          </Button>

          <div className="text-left">
            <p className="text-sm text-muted-foreground mb-2">Or create via API:</p>
            <pre className="bg-muted text-foreground p-3 rounded-lg overflow-x-auto text-xs">
{`curl -X POST http://localhost:4040/api/boards \\
  -H "Content-Type: application/json" \\
  -d '{"name": "My Team Board"}'`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
