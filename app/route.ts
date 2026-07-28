import { LANDING_HTML } from "../lib/landing-html";

export const runtime = "nodejs";

export async function GET() {
  return new Response(LANDING_HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
}
