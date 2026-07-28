export function LegalLayout({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px", lineHeight: 1.65 }}>
      <div style={{ fontFamily: "'Gabarito',sans-serif", fontWeight: 900, fontSize: 20, marginBottom: 32 }}>
        FRANKLIN <span style={{ background: "#2f4df0", color: "#fff", padding: "1px 7px", borderRadius: 5, fontSize: 16 }}>AI</span>
      </div>
      <h1 style={{ fontFamily: "'Gabarito',sans-serif", fontWeight: 900, fontSize: 34 }}>{titre}</h1>
      <style>{`
        main h2{font-family:'Gabarito',sans-serif;font-weight:900;font-size:20px;margin:28px 0 8px}
        main p{margin:0 0 12px;font-size:15.5px}
        main ul{margin:0 0 12px;padding-left:22px;font-size:15.5px}
        main a{color:#2f4df0}
      `}</style>
      {children}
    </main>
  );
}
