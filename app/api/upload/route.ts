import { NextResponse } from "next/server";
import { parsePdf } from "../../../lib/vision";
import { enrich, selfPatternsFromHolder } from "../../../lib/enrich";
import { computeStats } from "../../../lib/stats";
import { buildPreview } from "../../../lib/preview";
import { createRecord } from "../../../lib/db";
import type { RawTransaction } from "../../../lib/stats";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_SIZE = 12 * 1024 * 1024;
const MAX_FILES = 12;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const email = String(form.get("email") ?? "").trim();
    const prenom = String(form.get("prenom") ?? "").trim() || "toi";
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return NextResponse.json({ error: "email invalide" }, { status: 400 });
    if (!files.length || files.length > MAX_FILES)
      return NextResponse.json({ error: `1 à ${MAX_FILES} fichiers PDF` }, { status: 400 });

    let allTx: RawTransaction[] = [];
    let titulaire = "";
    for (const f of files) {
      if (f.size > MAX_SIZE) return NextResponse.json({ error: `${f.name} dépasse 12 Mo` }, { status: 400 });
      const buf = Buffer.from(await f.arrayBuffer());
      const vr = await parsePdf(buf); // le fichier ne vit qu'ici — jamais écrit sur disque
      titulaire ||= vr.titulaire;
      allTx = allTx.concat(enrich(vr));
    }
    const stats = computeStats(allTx, { selfPatterns: selfPatternsFromHolder(titulaire) });
    const preview = buildPreview(stats as Record<string, unknown>);
    // purge : les transactions sortent du scope ici ; seules les stats agrégées sont conservées
    const rec = await createRecord({ email, prenom, status: "preview_ready", stats, preview });
    return NextResponse.json({ report_id: rec.token, preview, nb_releves: files.length });
  } catch (e) {
    console.error("upload:", e);
    return NextResponse.json({ error: "analyse impossible — vérifie que le fichier est bien un relevé bancaire PDF" }, { status: 500 });
  }
}
