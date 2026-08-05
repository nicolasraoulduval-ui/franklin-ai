const SITE = "https://www.franklinai.fr";
const TITRE = "Franklin AI — ton relevé bancaire a des choses à te dire";
const DESCRIPTION =
  "Franklin lit ton relevé ligne par ligne et t'écrit le portrait financier le plus " +
  "drôle et le plus juste qu'on t'ait jamais fait. Chaque chiffre est vérifié par du code.";

/* Le partage est le seul canal d'acquisition gratuit du produit. Sans ces
   métadonnées, un lien collé dans WhatsApp ou iMessage s'affiche comme une URL
   nue : pas d'image, pas de titre, et un taux de clic plusieurs fois inférieur. */
export const metadata = {
  metadataBase: new URL(SITE),
  title: TITRE,
  description: DESCRIPTION,
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Franklin AI",
    title: TITRE,
    description: DESCRIPTION,
    url: SITE,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Franklin AI — ta banque voit tout, elle ne dit rien" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITRE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Gabarito:wght@700;900&family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, background: "#fbfbf8", color: "#14161f", fontFamily: "'IBM Plex Sans',sans-serif" }}>{children}</body>
    </html>
  );
}
