import path from "path";
import os from "os";

export function getDataDir(): string {
  return process.env.AGENTBOARD_DATA_DIR || path.join(os.homedir(), ".agentboard", "data");
}
