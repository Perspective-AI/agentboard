import { NextRequest, NextResponse } from "next/server";

type ParseResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function parseJsonBody<T = Record<string, unknown>>(
  request: NextRequest,
): Promise<ParseResult<T>> {
  try {
    const data = await request.json();
    return { ok: true, data: data as T };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } },
        { status: 400 },
      ),
    };
  }
}

export function internalError(): NextResponse {
  return NextResponse.json(
    { ok: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
    { status: 500 },
  );
}
