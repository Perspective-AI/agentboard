import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function timestamp(): string {
  return new Date().toISOString();
}

import path from "path";
import os from "os";

export function getDataDir(): string {
  return process.env.AGENTBOARD_DATA_DIR || path.join(os.homedir(), ".agentboard", "data");
}
