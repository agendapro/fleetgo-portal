import { NextResponse } from "next/server";
import { loadFleetData } from "@/lib/data";
import { askAssistant } from "@/lib/assistant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { dueno_id, question, reference, force_local } = body ?? {};
    if (!dueno_id || !question || !reference) {
      return NextResponse.json({ error: "Faltan campos: dueno_id, question, reference" }, { status: 400 });
    }
    const data = await loadFleetData();
    const ans = await askAssistant(data, dueno_id, question, reference, { forceLocal: !!force_local });
    return NextResponse.json(ans);
  } catch (err) {
    console.error("[/api/assistant] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
