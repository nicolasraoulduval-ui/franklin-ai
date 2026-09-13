import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Filet de livraison — rattrape les rapports payés que personne n'est venu chercher.
 *
 * Le rapport n'est écrit qu'à la première visite de /rapport/<token> : c'est le
 * navigateur du client qui déclenche la rédaction. Un client qui paie puis quitte
 * avant d'être redirigé a donc payé pour rien. Le webhook a bien marqué « paid »,
 * mais personne n'a appelé la page qui écrit le rapport — et rien ne le signale,
 * puisqu'il ne s'est rien passé : pas d'erreur, pas de trace, juste un vide.
 *
 * C'est arrivé le 13/09/2026. Paiement encaissé à 11:59, dernier événement du
 * client « checkout_clique » à 11:59:39, plus rien ensuite. Et plus d'adresse
 * e-mail depuis que le champ a été retiré du tunnel : aucun moyen de le prévenir.
 * Le rapport a dû être déclenché à la main, des heures plus tard.
 *
 * Cette route repasse sur les paiements restés sans rapport et réveille la page
 * qui le rédige. Sans risque à rejouer : la page ne réécrit pas ce qui existe.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "non autorisé" }, { status: 401 });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "stockage indisponible" }, { status: 500 });

  /* Trois minutes de battement : le temps qu'une rédaction déjà lancée par le
     client lui-même aille au bout, sans qu'on la double inutilement. */
  const limite = new Date(Date.now() - 3 * 60_000).toISOString();
  const q =
    "franklin_reports?status=eq.paid&report_html=is.null" +
    `&created_at=lt.${limite}&select=token,prenom&order=created_at.asc&limit=3`;

  let restes: Array<{ token: string; prenom: string }>;
  try {
    const res = await fetch(`${url}/rest/v1/${q}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`supabase ${res.status}`);
    restes = await res.json();
  } catch (e) {
    console.error("relance, lecture :", e);
    return NextResponse.json({ error: "lecture impossible" }, { status: 502 });
  }

  if (!restes.length) return NextResponse.json({ ok: true, relances: 0 });

  /* On n'attend pas la réponse : la rédaction prend une à deux minutes, bien plus
     que le budget de cette route. La page tourne dans sa propre invocation et
     continue sans nous — il suffit de l'avoir réveillée. Le délai dépassé est donc
     le cas normal, pas une panne. */
  const origin = new URL(req.url).origin;
  const lances: string[] = [];
  for (const r of restes) {
    try {
      await fetch(`${origin}/rapport/${r.token}`, {
        signal: AbortSignal.timeout(4000),
        cache: "no-store",
      });
    } catch {
      /* attendu */
    }
    lances.push(r.prenom);
  }

  console.error(`relance : ${lances.length} rapport(s) payé(s) sans livraison — ${lances.join(", ")}`);
  return NextResponse.json({ ok: true, relances: lances.length });
}
