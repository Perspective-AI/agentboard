import { readFileSync } from "fs";
import { join } from "path";

export async function GET() {
  const script = readFileSync(join(process.cwd(), "install.sh"), "utf-8");
  return new Response(script, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": "inline; filename=\"install.sh\"",
    },
  });
}
