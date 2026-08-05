import { NextResponse } from "next/server";
import { EVENEMENTS, journaliser, type Evenement } from "../../../lib/evt";

export const runtime = "nodejs";

/** Réception des événements du tunnel. Liste fermée de noms, aucune donnée
 *  personnelle, réponse toujours 204 : le suivi ne doit jamais ralentir ni
 *  interrompre le parcours d'un client. */
export async function POST(req: Request) {
  try {
    const { nom, session, props } = await req.json();
    if (EVENEMENTS.includes(nom)) {
      await journaliser(nom as Evenement, String(session ?? "anon"), typeof props === "object" && props ? props : {});
    }
  } catch {
    /* un événement perdu ne vaut pas une erreur affichée */
  }
  return new NextResponse(null, { status: 204 });
}
