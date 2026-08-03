"use client";

/** Aperçu du partage, affiché juste avant le paiement.
 *
 *  C'est le dernier écran avant la carte bancaire : plutôt que de décrire les
 *  cartes à partager, on montre ce qui se passe quand on les envoie. La
 *  maquette imite WhatsApp d'assez près pour être crédible — bulles, ergots,
 *  couleurs de pseudo, horodatage, doubles coches, réaction. Une maquette
 *  approximative se voit et décrédibilise la promesse.
 */

const SYS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

/* couleurs WhatsApp */
const FOND = "#EFEAE2";
const ENTETE = "#F0F2F5";
const SORTANT = "#D9FDD3";
const ENTRANT = "#FFFFFF";
const META = "#667781";
const COCHE = "#53BDEB";
const OMBRE = "0 1px 0.5px rgba(11,20,26,.13)";

/* le fond quadrillé de WhatsApp, en SVG inline : quelques traits suffisent à
   donner la texture sans alourdir la page */
const MOTIF =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill='none' stroke='%23D9CFC2' stroke-width='1.1' stroke-linecap='round' opacity='.55'%3E%3Cpath d='M8 12h7M11.5 8.5v7'/%3E%3Ccircle cx='44' cy='16' r='4'/%3E%3Cpath d='M20 40c3-3 7-3 10 0'/%3E%3Cpath d='M48 44l4 4M52 44l-4 4'/%3E%3Cpath d='M6 52h8'/%3E%3C/g%3E%3C/svg%3E\")";

function Coches() {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" style={{ marginLeft: 3, verticalAlign: -1 }}>
      <path d="M1 5.5 4 8.5 9.5 2" fill="none" stroke={COCHE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 5.5 9 8.5 14.5 2" fill="none" stroke={COCHE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Avatar({ c }: { c: string }) {
  return (
    <div style={{ width: 28, height: 28, borderRadius: "50%", background: c, flexShrink: 0, alignSelf: "flex-end" }}>
      <svg viewBox="0 0 28 28" width="28" height="28">
        <circle cx="14" cy="10.5" r="4.6" fill="rgba(255,255,255,.9)" />
        <path d="M4.5 27c1.4-5.4 5-8 9.5-8s8.1 2.6 9.5 8z" fill="rgba(255,255,255,.9)" />
      </svg>
    </div>
  );
}

/** ergot de bulle — le petit triangle qui rattache la bulle à son côté */
function Ergot({ cote, couleur }: { cote: "g" | "d"; couleur: string }) {
  return (
    <svg width="9" height="13" viewBox="0 0 9 13" style={{
      position: "absolute", top: 0, [cote === "g" ? "left" : "right"]: -8,
      transform: cote === "d" ? "scaleX(-1)" : undefined,
    } as React.CSSProperties}>
      <path d="M9 0H4C1 0 0 2 0 4v0c0 2 2 3 4 3h5z" fill={couleur} />
    </svg>
  );
}

function Entrant({ nom, couleur, heure, children }: { nom: string; couleur: string; heure: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 3, alignItems: "flex-end" }}>
      <Avatar c={couleur} />
      <div style={{
        position: "relative", background: ENTRANT, borderRadius: "0 7.5px 7.5px 7.5px",
        padding: "6px 9px 6px 10px", maxWidth: "76%", boxShadow: OMBRE, fontSize: 14.2, lineHeight: 1.36,
      }}>
        <Ergot cote="g" couleur={ENTRANT} />
        <div style={{ color: couleur, fontSize: 12.8, fontWeight: 600, marginBottom: 1 }}>{nom}</div>
        <span>{children}</span>
        <span style={{ fontSize: 11, color: META, float: "right", margin: "6px 0 -2px 8px" }}>{heure}</span>
      </div>
    </div>
  );
}

export default function PartageChat() {
  return (
    <div style={{
      border: "2.5px solid #14161f", borderRadius: 18, overflow: "hidden",
      boxShadow: "6px 6px 0 rgba(20,22,31,.12)", fontFamily: SYS, background: FOND,
    }}>
      {/* barre de discussion */}
      <div style={{ background: ENTETE, padding: "9px 12px", display: "flex", alignItems: "center", gap: 10 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#54656F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#D1D7DB", display: "grid", placeItems: "center" }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#8696A0">
            <path d="M12 12a4 4 0 100-8 4 4 0 000 8zm-8 8c0-4 3.6-6 8-6s8 2 8 6z" />
          </svg>
        </div>
        <div style={{ lineHeight: 1.25 }}>
          <div style={{ fontSize: 15.5, fontWeight: 600, color: "#111B21" }}>Les survivants 🫠</div>
          <div style={{ fontSize: 12.5, color: META }}>Vous, Camille, Jules, Léo, +4</div>
        </div>
      </div>

      {/* fil */}
      <div style={{ background: `${MOTIF} repeat`, backgroundColor: FOND, padding: "14px 10px 10px" }}>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <span style={{
            background: "#FFFFFF", color: META, fontSize: 12.2, padding: "5px 12px",
            borderRadius: 8, boxShadow: OMBRE,
          }}>Aujourd&apos;hui</span>
        </div>

        {/* message sortant : la carte partagée */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 3 }}>
          <div style={{
            position: "relative", background: SORTANT, borderRadius: "7.5px 0 7.5px 7.5px",
            padding: 3, maxWidth: "78%", boxShadow: OMBRE,
          }}>
            <Ergot cote="d" couleur={SORTANT} />
            <div style={{
              background: "#2f4df0", color: "#fff", borderRadius: 6, padding: "30px 16px",
              textAlign: "center", fontFamily: "'Gabarito',sans-serif", fontWeight: 900,
              fontSize: 19, lineHeight: 1.15, letterSpacing: "-.01em",
            }}>
              LE MÉCÈNE<br />DES ABONNEMENTS
            </div>
            <div style={{ padding: "5px 7px 3px", fontSize: 14.2, lineHeight: 1.36 }}>
              mon rapport Franklin. lisez ça.
              <span style={{ fontSize: 11, color: META, float: "right", margin: "6px 0 -2px 8px" }}>
                21:47<Coches />
              </span>
            </div>
          </div>
        </div>

        {/* réaction sur le message partagé */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10, marginRight: 8 }}>
          <div style={{
            background: "#FFFFFF", borderRadius: 14, padding: "2px 7px", fontSize: 13,
            boxShadow: OMBRE, display: "flex", gap: 2, alignItems: "center",
          }}>
            😂❤️<span style={{ fontSize: 11.5, color: META, marginLeft: 2 }}>4</span>
          </div>
        </div>

        <Entrant nom="Camille" couleur="#E542A3" heure="21:48">JE PLEURE</Entrant>
        <Entrant nom="Jules" couleur="#1F7AEC" heure="21:49">
          attends le mien est pire, il m&apos;a appelé «&nbsp;le stratège du dimanche soir&nbsp;»
        </Entrant>
        <Entrant nom="Léo" couleur="#00A884" heure="21:52">bon je le fais</Entrant>
      </div>
    </div>
  );
}
