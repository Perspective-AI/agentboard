import type { SSEEventType } from "@/lib/types";

type SSEWriter = {
  write: (data: string) => void;
  close: () => void;
};

class SSEHub {
  private connections = new Map<string, Set<SSEWriter>>();

  subscribe(boardId: string, writer: SSEWriter): () => void {
    if (!this.connections.has(boardId)) {
      this.connections.set(boardId, new Set());
    }
    this.connections.get(boardId)!.add(writer);

    return () => {
      const set = this.connections.get(boardId);
      if (set) {
        set.delete(writer);
        if (set.size === 0) {
          this.connections.delete(boardId);
        }
      }
    };
  }

  broadcast(boardId: string, type: SSEEventType, data: unknown): void {
    const set = this.connections.get(boardId);
    if (!set || set.size === 0) return;

    const event = JSON.stringify({
      type,
      data,
      timestamp: new Date().toISOString(),
    });

    const message = `event: ${type}\ndata: ${event}\n\n`;

    for (const writer of set) {
      try {
        writer.write(message);
      } catch {
        set.delete(writer);
      }
    }
  }

  getConnectionCount(boardId: string): number {
    return this.connections.get(boardId)?.size ?? 0;
  }
}

// Global singleton — survives HMR in development
const globalForSSE = globalThis as unknown as { sseHub?: SSEHub };
export const sseHub = globalForSSE.sseHub ?? (globalForSSE.sseHub = new SSEHub());
