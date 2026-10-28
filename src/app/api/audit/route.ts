import { NextResponse } from "next/server";

export const maxDuration = 60;

// Day 1 stub: always returns the demo id. Real pipeline arrives Day 2+.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const url =
    typeof body === "object" && body !== null && "url" in body
      ? (body as { url: unknown }).url
      : undefined;

  if (typeof url !== "string" || url.trim() === "") {
    return NextResponse.json({ error: "Моля, въведете адрес на сайт." }, { status: 400 });
  }

  return NextResponse.json({ id: "demo" });
}
