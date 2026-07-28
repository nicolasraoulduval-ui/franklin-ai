"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Inner() {
  const rid = useSearchParams().get("rid") ?? "";
  const [busy, setBusy] = useState(false);
  const pay = async () => {
    setBusy(true);
    const r = await fetch("/api/mock-pay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ report_id: rid }) });
    const j = await r.json();
    if (j.url) window.location.href = j.url;
  };
  return (
    <main style={{ maxWidth: 480, margin: "80px auto", padding: 24, textAlign: "center" }}>
      <h1 style={{ fontFamily: "'Gabarito',sans-serif", fontWeight: 900, fontSize: 32 }}>Paiement de test</h1>
      <p>Stripe n&apos;est pas encore branché. Ce bouton simule un paiement réussi de <strong>12,90 €</strong>.</p>
      <button onClick={pay} disabled={busy}
        style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700, fontSize: 16, padding: "14px 28px", background: "#2f4df0", color: "#fff", border: "2px solid #14161f", cursor: "pointer" }}>
        {busy ? "GÉNÉRATION DU RAPPORT…" : "PAYER 12,90 € (TEST) →"}
      </button>
      {busy && <p style={{ color: "#6b6f7e" }}>Franklin écrit ton rapport, ça prend une à deux minutes…</p>}
    </main>
  );
}

export default function Page() {
  return <Suspense><Inner /></Suspense>;
}
