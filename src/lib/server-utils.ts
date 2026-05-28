import fs from "fs";
import path from "path";
import os from "os";

let cachedDataDir: string | null = null;

function ensureWritableDir(dir: string): boolean {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the directory used for file-system JSON storage.
 *
 * Resolution order:
 * 1. `AGENTBOARD_DATA_DIR` if set — explicit config always wins.
 * 2. `~/.agentboard/data` when that location is writable (local/self-hosted).
 * 3. `<os.tmpdir()>/agentboard/data` as a fallback when the home dir is
 *    read-only — e.g. serverless platforms like Vercel, where only the temp
 *    dir is writable. Without this, every write (createBoard, createTask, …)
 *    throws EROFS/EACCES, the API returns 500, and the UI appears to "do
 *    nothing." NOTE: the temp dir is ephemeral and per-instance on serverless,
 *    so data is not durable there — a real backend is needed for persistence.
 */
export function getDataDir(): string {
  if (process.env.AGENTBOARD_DATA_DIR) return process.env.AGENTBOARD_DATA_DIR;
  if (cachedDataDir) return cachedDataDir;

  const preferred = path.join(os.homedir(), ".agentboard", "data");
  if (ensureWritableDir(preferred)) {
    cachedDataDir = preferred;
    return cachedDataDir;
  }

  const fallback = path.join(os.tmpdir(), "agentboard", "data");
  fs.mkdirSync(fallback, { recursive: true });
  console.warn(
    `[agentboard] data dir ${preferred} is not writable; falling back to ${fallback}. ` +
      `Data is ephemeral here (e.g. serverless) — set AGENTBOARD_DATA_DIR to a durable path for persistence.`,
  );
  cachedDataDir = fallback;
  return cachedDataDir;
}
