import { NextResponse, type NextRequest } from "next/server";

/**
 * En-têtes de sécurité — jusqu'ici seul HSTS était posé, par défaut par Vercel.
 *
 * Le point qui compte vraiment est le noindex sur /rapport/*. Le lien d'un rapport
 * est à la fois son adresse et son mot de passe : il n'y a pas de compte. Or le
 * produit encourage le partage. Il suffirait qu'un client colle le sien une fois
 * sur une page publique pour que son portrait financier devienne consultable
 * dans les résultats de recherche.
 *
 * Referrer-Policy joue le même rôle côté fuite : elle empêche l'URL de partir
 * dans l'en-tête Referer vers les domaines tiers appelés par la page.
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");

  if (req.nextUrl.pathname.startsWith("/rapport/")) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
