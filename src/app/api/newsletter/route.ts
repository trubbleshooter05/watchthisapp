import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email?: string };
    const trimmed = email?.trim().toLowerCase() ?? "";

    if (!trimmed || !isEmail(trimmed)) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }

    const apiKey = process.env.BEEHIIV_API_KEY;
    const publicationId = process.env.BEEHIIV_PUBLICATION_ID;

    if (!apiKey || !publicationId) {
      console.warn("newsletter signup received but Beehiiv is not configured");
      return NextResponse.json({ ok: true, configured: false }, { status: 202 });
    }

    const response = await fetch(
      `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmed,
          reactivate_existing: false,
          send_welcome_email: true,
          utm_source: "movieslike_signup",
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("Beehiiv signup failed", response.status, body.slice(0, 300));
      return NextResponse.json({ error: "signup_failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, configured: true });
  } catch (err) {
    console.error("newsletter signup error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
