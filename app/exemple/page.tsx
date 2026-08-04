import Link from "next/link";
import { PRIX_AFFICHE } from "../../lib/prix";

/** Page d'exemple : le meilleur argument de vente est le produit lui-même.
 *
 *  Contenu fictif, annoncé comme tel en haut de page. C'est une démonstration,
 *  pas un témoignage — la distinction est juridique autant qu'éthique : montrer
 *  ce qu'on fabrique est légitime, faire croire qu'un client a dit quelque
 *  chose ne l'est pas. */

export const metadata = {
  title: "Un exemple de rapport — Franklin AI",
  description: "Voilà à quoi ressemble un portrait écrit par Franklin. Exemple complet, du premier mensonge au verdict.",
};

const mono = "'IBM Plex Mono',monospace";
const gab = "'Gabarito',sans-serif";

const MENSONGES = [
  {
    m: "Je vais m'y remettre en septembre.",
    v: "8 prélèvements FITNESS PARK. 0 passage détecté depuis mars.",
    p: "Huit mois d'abonnement, une carte de membre comme neuve. Il y a quelque chose de beau dans cet optimisme.",
  },
  {
    m: "Je cuisine, ça revient moins cher.",
    v: "Courses le samedi, livraison le dimanche. Six fois en six mois.",
    p: "Le frigo se remplit, le livreur aussi. Quelqu'un dans cette histoire mange à sa faim, et ce n'est pas ton porte-monnaie.",
  },
  {
    m: "J'épargne tous les mois.",
    v: "50 € vers le livret A le 1er. Rapatriés le 12. Cinq mois d'affilée.",
    p: "Ton épargne fait l'aller-retour comme un pigeon voyageur. Au moins, elle voyage.",
  },
];

const FUITES = [
  ["Abonnements actifs (9)", "148,18 € / mois"],
  ["Sur un an", "1 778,16 €"],
  ["Frais bancaires sur la période", "41,35 €"],
  ["Options bancaires", "5,62 € / mois"],
];

const BULLETIN = [
  ["Épargne", "08/20", "Des intentions solides, une exécution qui tient onze jours."],
  ["Restauration", "04/20", "Assidu. Trop assidu."],
  ["Abonnements", "02/20", "Ne relit jamais ses relevés. Cela se voit."],
  ["Transport", "14/20", "Rien à redire. C'est bien la seule ligne."],
  ["Discipline nocturne", "06/20", "Trois virements après 23 h. Les grandes décisions se prennent rarement avant minuit."],
];

const CARTES = [
  { t: "LE MÉCÈNE DES ABONNEMENTS", bg: "#2f4df0", c: "#fff" },
  { t: "Neuf abonnements actifs. Zéro souvenir d'en avoir signé un seul.", bg: "#fffdf8", c: "#14161f" },
  { t: "« Quatorze passages. Ils devraient graver ton nom sur un tabouret. »", bg: "#14161f", c: "#fff" },
  { t: "Ta banque voit tout. Elle ne dit rien.", bg: "#9cc3ff", c: "#14161f" },
];

export default function Exemple() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "36px 24px 70px", fontFamily: "'IBM Plex Sans',system-ui,sans-serif", color: "#14161f" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
        <Link href="/" style={{ fontFamily: gab, fontWeight: 900, fontSize: 20, textDecoration: "none", color: "#14161f" }}>
          FRANKLIN <span style={{ background: "#2f4df0", color: "#fff", padding: "1px 7px", borderRadius: 5, fontSize: 16 }}>AI</span>
        </Link>
        <Link href="/analyse" style={{ fontFamily: mono, fontSize: 12, color: "#4a4f60" }}>faire le mien →</Link>
      </div>

      {/* L'avertissement est en haut, pas en bas en petit : c'est un exemple, on le dit. */}
      <div style={{ border: "2px solid #14161f", borderLeft: "6px solid #2f4df0", borderRadius: 10, background: "#edf1fb", padding: "13px 16px", marginBottom: 30, fontFamily: mono, fontSize: 12.5, lineHeight: 1.6 }}>
        <strong>EXEMPLE.</strong> Ce rapport est fictif : personnage inventé, chiffres inventés.
        Il est écrit exactement comme Franklin écrit les vrais, à partir de vraies statistiques.
        Le tien parlera de toi, et il sera plus précis.
      </div>

      <div style={{ fontFamily: mono, fontSize: 11.5, fontWeight: 700, letterSpacing: ".14em", color: "#2f4df0", marginBottom: 12 }}>
        RAPPORT — LUCAS · 6 MOIS · 392 TRANSACTIONS
      </div>

      <h1 style={{ fontFamily: gab, fontWeight: 900, fontSize: 40, lineHeight: 1.03, margin: "0 0 6px" }}>
        <span style={{ background: "#9cc3ff", padding: "0 6px", borderRadius: 4, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>
          Le mécène des abonnements.
        </span>
      </h1>
      <p style={{ fontSize: 17, color: "#4a4f60", margin: "14px 0 8px" }}>
        Neuf abonnements actifs. Zéro souvenir d&apos;en avoir signé un seul.
      </p>
      <p style={{ fontSize: 16.5, lineHeight: 1.7, marginBottom: 8 }}>
        Tu ne t&apos;abonnes pas à des services : tu leur verses une pension. Sur six mois
        et 392 lignes, une constante se dégage — tu paies avec une régularité admirable
        des choses dont tu as oublié l&apos;existence. 148,18 € par mois quittent ton compte
        sans que personne ne les réclame, sans que tu les voies partir. Ce n&apos;est pas
        de la négligence. C&apos;est une forme de générosité.
      </p>

      <Section titre="Ce que tu te racontes" />
      {MENSONGES.map((x, i) => (
        <div key={i} style={{ marginBottom: 26 }}>
          <p style={{ fontFamily: gab, fontWeight: 900, fontSize: 19, margin: "0 0 4px" }}>« {x.m} »</p>
          <p style={{ fontFamily: mono, fontSize: 13, color: "#4a4f60", margin: "0 0 10px" }}>{x.v}</p>
          <div style={{ borderLeft: "3px solid #2f4df0", background: "#fffdf8", padding: "13px 16px", fontSize: 16, lineHeight: 1.6 }}>
            {x.p}
          </div>
        </div>
      ))}

      <Section titre="Ce que ça te coûte" />
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: mono, fontSize: 13.5, marginBottom: 18 }}>
        <tbody>
          {FUITES.map(([l, m], i) => (
            <tr key={i}>
              <td style={{ padding: "10px 0", borderBottom: "1px dashed rgba(20,22,31,.15)" }}>{l}</td>
              <td style={{ padding: "10px 0", borderBottom: "1px dashed rgba(20,22,31,.15)", textAlign: "right", fontWeight: 700, color: "#e6392e" }}>{m}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ borderLeft: "3px solid #e6392e", background: "#fffdf8", padding: "13px 16px", fontSize: 16, lineHeight: 1.6 }}>
        Ce n&apos;est pas un problème d&apos;argent. C&apos;est un problème d&apos;attention.
      </div>

      <Section titre="Ton bulletin" />
      {BULLETIN.map(([mat, note, app], i) => (
        <div key={i} style={{ display: "flex", gap: 16, alignItems: "baseline", padding: "12px 0", borderBottom: "1px dashed rgba(20,22,31,.15)" }}>
          <span style={{ fontFamily: mono, fontWeight: 700, fontSize: 14, minWidth: 150 }}>{mat}</span>
          <span style={{ fontFamily: gab, fontWeight: 900, fontSize: 20, color: "#2f4df0", minWidth: 62 }}>{note}</span>
          <span style={{ fontSize: 14.5, color: "#4a4f60", lineHeight: 1.5 }}>{app}</span>
        </div>
      ))}

      <Section titre="Le verdict" />
      <p style={{ fontSize: 16.5, lineHeight: 1.7 }}>
        Tu gagnes correctement ta vie et tu la dépenses par prélèvement automatique,
        sans jamais avoir à décider. C&apos;est confortable. C&apos;est aussi la raison
        pour laquelle 1 778,16 € partent chaque année vers des services que tu ne
        saurais pas nommer si on te réveillait la nuit.
      </p>
      <p style={{ fontFamily: gab, fontWeight: 900, fontSize: 24, lineHeight: 1.2, margin: "18px 0 0" }}>
        Le lundi, tu répares le week-end. Le reste du mois, tu répares le lundi.
      </p>

      <Section titre="À partager" />
      <p style={{ fontSize: 14.5, color: "#4a4f60", marginBottom: 18 }}>
        Aucun montant, aucun nom de banque. Tu partages le verdict, pas ton salaire.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {CARTES.map((c, i) => (
          <div key={i} style={{
            background: c.bg, color: c.c, border: "2.5px solid #14161f", borderRadius: 14,
            padding: "30px 20px", minHeight: 155, display: "flex", alignItems: "center",
            justifyContent: "center", textAlign: "center", fontFamily: gab, fontWeight: 900,
            fontSize: 17, lineHeight: 1.25, boxShadow: "4px 4px 0 #14161f",
          }}>{c.t}</div>
        ))}
      </div>

      <div style={{ marginTop: 46, textAlign: "center" }}>
        <p style={{ fontSize: 17, marginBottom: 16 }}>
          Le tien dira autre chose. Franklin ne connaît que tes lignes.
        </p>
        <Link href="/analyse" style={{
          display: "inline-block", background: "#2f4df0", color: "#fff", textDecoration: "none",
          fontFamily: mono, fontWeight: 700, fontSize: 15, padding: "16px 30px",
          border: "2.5px solid #14161f", borderRadius: 12, boxShadow: "4px 4px 0 #14161f",
        }}>FAIRE PARLER MON RELEVÉ →</Link>
        <p style={{ marginTop: 12, fontFamily: mono, fontSize: 12, color: "#4a4f60" }}>
          Aperçu gratuit · aucune carte bancaire demandée · {PRIX_AFFICHE} pour le rapport complet
        </p>
      </div>

      <p style={{ marginTop: 46, fontSize: 12, color: "#4a4f60", fontFamily: mono, textAlign: "center" }}>
        <Link href="/confidentialite" style={{ color: "inherit" }}>Confidentialité</Link> · <Link href="/cgv" style={{ color: "inherit" }}>CGV</Link> · <Link href="/mentions-legales" style={{ color: "inherit" }}>Mentions légales</Link>
      </p>
    </main>
  );
}

function Section({ titre }: { titre: string }) {
  return (
    <h2 style={{
      fontFamily: mono, fontSize: 11.5, fontWeight: 700, letterSpacing: ".14em",
      color: "#2f4df0", textTransform: "uppercase", borderTop: "2px solid #14161f",
      paddingTop: 14, margin: "44px 0 18px",
    }}>{titre}</h2>
  );
}
