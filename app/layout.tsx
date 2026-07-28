export const metadata = {
  title: "Franklin AI — Faire parler mon relevé",
  description: "Ta banque voit tout. Elle ne dit rien. Franklin, lui, te raconte tout.",
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
