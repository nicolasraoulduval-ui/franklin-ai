import { NextResponse } from "next/server";
import { purgerAncien } from "../../../lib/db";

export const runtime = "nodejs";

/**
 * Purge quotidienne — rend vraie l'affirmation des CGV et de la politique de
 * confidentialité : « supprimé automatiquement 30 jours après l'analyse ».
 *
 * Avant cette route, cette phrase était fausse : la requête de suppression
 * n'existait que sous forme de commentaire dans supabase-schema.sql. Sur un
 * produit dont l'argument central est le traitement de relevés bancaires,
 * c'était l'endroit le plus coûteux où se tromper.
 *
 * Déclenchée par le cron Vercel (vercel.json). Vercel ajoute automatiquement
 * l'en-tête « Authorization: Bearer <CRON_SECRET> » dès que la variable
 * d'environnement CRON_SECRET est définie sur le projet.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "non autorisé" }, { status: 401 });
  }
  try {
    const n = await purgerAncien(30);
    console.log(`purge : ${n.rapports} rapport(s), ${n.debit} débit, ${n.evenements} événement(s)`);
    return NextResponse.json({ ok: true, ...n });
  } catch (e) {
    console.error("purge :", e);
    return NextResponse.json({ error: "purge impossible" }, { status: 500 });
  }
}
