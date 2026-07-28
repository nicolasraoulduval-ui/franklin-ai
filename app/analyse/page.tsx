"use client";
import { useRef, useState } from "react";

const mono = "'IBM Plex Mono',monospace";
const gab = "'Gabarito',sans-serif";

export default function Analyse() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [email, setEmail] = useState("");
  const [prenom, setPrenom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string[] | null>(null);
  const [rid, setRid] = useState("");

  const analyser = async () => {
    setError("");
    if (!files.length) { setError("Ajoute au moins un relevé PDF."); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setError("Email invalide."); return; }
    setBusy(true);
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    fd.append("email", email);
    fd.append("prenom", prenom);
    try {
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "erreur");
      setPreview(j.preview);
      setRid(j.report_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "analyse impossible");
    } finally {
      setBusy(false);
    }
  };

  const payer = async () => {
    setBusy(true);
    const r = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ report_id: rid }) });
    const j = await r.json();
    if (j.url) window.location.href = j.url;
    else { setError(j.error ?? "paiement indisponible"); setBusy(false); }
  };

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px" }}>
      <div style={{ fontFamily: gab, fontWeight: 900, fontSize: 20, marginBottom: 32 }}>
        FRANKLIN <span style={{ background: "#2f4df0", color: "#fff", padding: "1px 7px", borderRadius: 5, fontSize: 16 }}>AI</span>
      </div>

      {!preview && (
        <>
          <h1 style={{ fontFamily: gab, fontWeight: 900, fontSize: 38, lineHeight: 1.05 }}>
            Fais parler<br />ton relevé.
          </h1>
          <p style={{ color: "#6b6f7e" }}>
            Un seul relevé suffit — mais plus il y en a, plus Franklin a de choses à raconter.
            Ton fichier est analysé puis <strong>supprimé immédiatement</strong> : rien n&apos;est conservé, rien n&apos;entraîne aucun modèle.
          </p>

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); setFiles([...files, ...Array.from(e.dataTransfer.files).filter((f) => f.name.endsWith(".pdf") || f.name.endsWith(".csv"))]); }}
            style={{ border: "2px dashed #14161f", background: "#edf1fb", padding: "36px 20px", textAlign: "center", cursor: "pointer", margin: "22px 0", fontFamily: mono, fontSize: 14 }}>
            {files.length ? files.map((f) => f.name).join(" · ") : "GLISSE TES RELEVÉS ICI (PDF) OU CLIQUE"}
            <input ref={fileRef} type="file" accept=".pdf,.csv" multiple hidden
              onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])])} />
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <input placeholder="Ton prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)}
              style={{ flex: "1 1 140px", padding: "12px 14px", border: "2px solid #14161f", fontFamily: mono, fontSize: 14 }} />
            <input placeholder="ton@email.fr" value={email} onChange={(e) => setEmail(e.target.value)}
              style={{ flex: "2 1 220px", padding: "12px 14px", border: "2px solid #14161f", fontFamily: mono, fontSize: 14 }} />
          </div>

          <button onClick={analyser} disabled={busy}
            style={{ marginTop: 18, width: "100%", padding: "16px", background: "#2f4df0", color: "#fff", border: "2px solid #14161f", fontFamily: mono, fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
            {busy ? "FRANKLIN LIT TON RELEVÉ… (1-2 MIN)" : "FAIRE PARLER MON RELEVÉ →"}
          </button>
        </>
      )}

      {preview && (
        <>
          <h1 style={{ fontFamily: gab, fontWeight: 900, fontSize: 34, lineHeight: 1.05 }}>
            Franklin a tout lu.<br />Voilà trois choses, gratuites.
          </h1>
          <div style={{ margin: "24px 0" }}>
            {preview.map((f, i) => (
              <div key={i} style={{ border: "2px solid #14161f", background: i === 0 ? "#edf1fb" : "#fff", padding: "16px 20px", marginBottom: 14, boxShadow: "5px 5px 0 rgba(20,22,31,.12)" }}>
                <span style={{ fontFamily: mono, fontWeight: 700, color: "#2f4df0", fontSize: 12 }}>VÉRITÉ N°{i + 1}</span>
                <p style={{ margin: "6px 0 0" }}>{f}</p>
              </div>
            ))}
          </div>
          <p style={{ color: "#6b6f7e" }}>Le portrait complet — archétype, mensonges, fuites, bulletin, verdict et 4 cartes à partager — t&apos;attend derrière.</p>
          <button onClick={payer} disabled={busy}
            style={{ width: "100%", padding: "16px", background: "#2f4df0", color: "#fff", border: "2px solid #14161f", fontFamily: mono, fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
            {busy ? "REDIRECTION…" : "DÉBLOQUER MON RAPPORT — 12,90 € →"}
          </button>
          {error && <p style={{ color: "#e6392e", fontFamily: mono }}>{error}</p>}
        </>
      )}

      {!preview && error && <p style={{ color: "#e6392e", fontFamily: mono }}>{error}</p>}

      <p style={{ marginTop: 48, fontSize: 12, color: "#6b6f7e", fontFamily: mono }}>
        <a href="/confidentialite" style={{ color: "inherit" }}>Confidentialité</a> · <a href="/cgv" style={{ color: "inherit" }}>CGV</a> · <a href="/mentions-legales" style={{ color: "inherit" }}>Mentions légales</a>
      </p>
    </main>
  );
}
