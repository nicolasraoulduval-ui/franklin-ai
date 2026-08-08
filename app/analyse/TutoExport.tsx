"use client";
import { useState } from "react";

/** Étape 1 du parcours : comment récupérer son relevé.
 *
 *  C'est le seul vrai frein à l'entrée — quelqu'un qui ne sait pas exporter
 *  son relevé abandonne avant même d'avoir vu ce que Franklin sait faire.
 *  On montre le chemin par banque, on l'anime, et on double d'un tutoriel
 *  écrit dépliable pour ceux qui préfèrent lire.
 */

/* Dépose ici l'URL d'une vidéo (MP4 servi depuis /public, ou embed YouTube/Loom).
   Tant que c'est vide, les vignettes animées ci-dessous font le travail. */
const VIDEO = "";

const mono = "'IBM Plex Mono',monospace";
const gab = "'Gabarito',sans-serif";

const BANQUES = [
  { id: "sg", nom: "Société Générale",
    ecrans: [["MES COMPTES", "COMPTE COURANT", "LIVRET A"], ["VIREMENTS", "DOCUMENTS", "RELEVÉS DE COMPTE"], ["JUIN 2026 · PDF", "MAI 2026 · PDF", "AVRIL 2026 · PDF"]],
    cible: [1, 2, 0],
    titres: ["Ouvre l'app", "Va dans Documents", "Télécharge 3 à 6 mois"],
    ecrit: ["Connecte-toi à l'application Société Générale.", "Ouvre <b>Mes comptes</b> et sélectionne ton compte courant.", "Va dans <b>Documents</b>, puis <b>Relevés de compte</b>.", "Choisis le mois et télécharge le <b>PDF</b>. Répète pour les mois précédents."] },
  { id: "bnp", nom: "BNP Paribas",
    ecrans: [["MES COMPTES", "COMPTE CHÈQUES", "LIVRET"], ["OPÉRATIONS", "DOCUMENTS", "E-RELEVÉS"], ["JUIN 2026 · PDF", "MAI 2026 · PDF", "AVRIL 2026 · PDF"]],
    cible: [1, 2, 0],
    titres: ["Ouvre l'app", "Rubrique Documents", "Télécharge 3 à 6 mois"],
    ecrit: ["Connecte-toi à l'application BNP Paribas ou à mabanque.bnpparibas.", "Ouvre <b>Mes comptes</b>, puis <b>Documents</b>.", "Sélectionne <b>e-Relevés</b> et le compte concerné.", "Télécharge au format <b>PDF</b>, un fichier par mois."] },
  { id: "ca", nom: "Crédit Agricole",
    ecrans: [["MES COMPTES", "COMPTE DE DÉPÔT", "LIVRET A"], ["SYNTHÈSE", "MES E-DOCUMENTS", "RELEVÉS DE COMPTE"], ["JUIN 2026 · PDF", "MAI 2026 · PDF", "AVRIL 2026 · PDF"]],
    cible: [1, 2, 0],
    titres: ["Ouvre l'app", "Mes e-documents", "Télécharge 3 à 6 mois"],
    ecrit: ["Connecte-toi à l'application Crédit Agricole de ta région.", "Sélectionne ton compte courant, puis <b>Mes e-documents</b>.", "Choisis <b>Relevés de compte</b> et le mois voulu.", "Télécharge en <b>PDF</b>."] },
  { id: "bourso", nom: "BoursoBank",
    ecrans: [["MON COMPTE", "COMPTE BANCAIRE", "ÉPARGNE"], ["OPÉRATIONS", "DOCUMENTS", "RELEVÉS"], ["JUIN 2026 · PDF", "MAI 2026 · CSV", "AVRIL 2026 · PDF"]],
    cible: [1, 2, 0],
    titres: ["Ouvre ton compte", "Section Documents", "PDF ou CSV"],
    ecrit: ["Connecte-toi à BoursoBank.", "Ouvre <b>Mon compte</b>, puis <b>Documents</b> et <b>Relevés</b>.", "Télécharge en <b>PDF</b> — ou en <b>CSV</b>, Franklin lit les deux."] },
  { id: "neo", nom: "Revolut · N26",
    ecrans: [["ACCUEIL", "PROFIL", "CARTES"], ["SÉCURITÉ", "RELEVÉS", "ABONNEMENT"], ["6 DERNIERS MOIS", "FORMAT PDF", "GÉNÉRER"]],
    cible: [1, 1, 2],
    titres: ["Ouvre ton profil", "Section Relevés", "Choisis la période"],
    ecrit: ["Ouvre l'application et va dans ton <b>profil</b>.", "Cherche <b>Relevés</b> (ou <b>Statements</b>).", "Choisis la période — six mois si possible — et le format <b>PDF</b>.", "Le relevé arrive dans l'app ou par email."] },
];

function Ecran({ lignes, cible }: { lignes: string[]; cible: number }) {
  return (
    <div style={{ height: 116, background: "#edf1fb", borderBottom: "2px solid #14161f", position: "relative", overflow: "hidden" }}>
      {lignes.map((l, i) => (
        <div key={i} style={{
          position: "absolute", left: 14, right: 14, top: 14 + i * 30, height: 24,
          borderRadius: 6, border: "2px solid #14161f",
          background: i === cible ? "#9cc3ff" : "#fff",
          opacity: i === cible ? 1 : 0.5,
          display: "flex", alignItems: "center", padding: "0 8px",
          fontFamily: mono, fontSize: 8.5, fontWeight: 700,
        }}>{l}</div>
      ))}
      <div style={{
        position: "absolute", left: 30, top: 20 + cible * 30, width: 13, height: 13,
        border: "2px solid #14161f", borderRadius: "50%", background: "rgba(47,77,240,.25)",
        animation: "tclic 2.6s ease infinite",
      }} />
      <style>{`@keyframes tclic{0%,25%{opacity:0;transform:scale(1.7)}40%,60%{opacity:1;transform:scale(1)}75%,100%{opacity:0}}`}</style>
    </div>
  );
}

export default function TutoExport() {
  const [b, setB] = useState(BANQUES[0]);
  return (
    <>
      <h1 style={{ fontFamily: gab, fontWeight: 900, fontSize: 34, lineHeight: 1.05 }}>
        Récupérer tes relevés,<br />c&apos;est une minute.
      </h1>
      <p style={{ color: "#6b6f7e", margin: "10px 0 22px" }}>
        Choisis ta banque : le chemin est toujours le même — ton compte, tes documents, ton relevé.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {BANQUES.map((x) => (
          <button key={x.id} onClick={() => setB(x)} style={{
            fontFamily: mono, fontSize: 12.5, fontWeight: 700, padding: "9px 13px",
            border: "2px solid #14161f", borderRadius: 9, cursor: "pointer",
            background: x.id === b.id ? "#14161f" : "#fff", color: x.id === b.id ? "#fff" : "#14161f",
          }}>{x.nom}</button>
        ))}
      </div>

      {VIDEO ? (
        <div style={{ border: "2.5px solid #14161f", borderRadius: 12, overflow: "hidden", marginBottom: 18, aspectRatio: "16/9" }}>
          <iframe src={VIDEO} style={{ width: "100%", height: "100%", border: 0 }} allowFullScreen title="Tutoriel" />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
          {b.ecrans.map((lignes, i) => (
            <div key={i} style={{ border: "2.5px solid #14161f", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
              <Ecran lignes={lignes} cible={b.cible[i]} />
              <div style={{ padding: "10px 12px", fontSize: 13 }}>
                <b style={{ fontFamily: mono, fontSize: 10, letterSpacing: ".1em", color: "#2f4df0", display: "block", marginBottom: 3 }}>
                  ÉTAPE 0{i + 1}
                </b>
                {b.titres[i]}
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={{ textAlign: "center", fontSize: 13.5, color: "#6b6f7e", margin: "0 0 14px", lineHeight: 1.6 }}>
        Ta banque n&apos;est pas dans la liste ? <strong style={{ color: "#14161f" }}>Aucune importance.</strong>{" "}
        Franklin lit le relevé PDF de n&apos;importe quelle banque — le chemin pour l&apos;exporter est
        toujours le même : ton compte, tes documents, ton relevé.
      </p>

      <details style={{ marginBottom: 6 }}>
        <summary style={{ cursor: "pointer", fontSize: 14, color: "#6b6f7e", textAlign: "center", listStyle: "none" }}>
          Besoin d&apos;aide ? <u style={{ textUnderlineOffset: 3 }}>Voir le tutoriel écrit</u>
        </summary>
        <div style={{ border: "2px solid #14161f", borderRadius: 12, background: "#fffdf8", padding: "18px 20px", marginTop: 12, fontSize: 14.5, lineHeight: 1.7 }}>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {b.ecrit.map((l, i) => <li key={i} style={{ marginBottom: 8 }} dangerouslySetInnerHTML={{ __html: l }} />)}
          </ol>
          <p style={{ margin: "12px 0 0", fontSize: 13.5, color: "#6b6f7e" }}>
            Ta banque n&apos;est pas listée ? Si elle exporte un relevé en PDF ou en CSV — elles le font toutes — c&apos;est compatible.
          </p>
        </div>
      </details>
    </>
  );
}
