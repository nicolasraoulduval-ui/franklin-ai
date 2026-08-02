"use client";
import { useEffect, useRef, useState } from "react";

/* Écran d'analyse — s'affiche pendant que /api/upload travaille.
   Usage :  {busy && <FranklinLoader />}                                    */

const LIGNES: [string, string, 0 | 1 | 2][] = [
  ["UBER *EATS", "18,40 €", 1],
  ["LE BALTO", "12,00 €", 0],
  ["MONOPRIX", "46,12 €", 0],
  ["BASIC-FIT", "34,99 €", 2],
  ["SNCF CONNECT", "89,00 €", 0],
  ["AMAZON EU", "27,90 €", 1],
  ["SPOTIFY", "11,99 €", 2],
  ["UBER *TRIP", "14,60 €", 0],
  ["FRAIS DECOUVERT", "8,00 €", 2],
  ["FRANPRIX", "23,85 €", 0],
  ["UBER *EATS", "21,30 €", 1],
  ["NETFLIX", "19,99 €", 2],
  ["VIR LIVRET A", "50,00 €", 1],
  ["TOTALENERGIES", "62,40 €", 0],
  ["UBER *EATS", "16,75 €", 1],
  ["APPLE.COM/BILL", "2,99 €", 2],
  ["LE BALTO", "9,50 €", 0],
  ["DELIVEROO", "24,10 €", 1],
];

const PHASES = [
  { t: "LECTURE DES LIGNES", d: 9000, say: "Bon. Voyons voir ce qu'on a là." },
  { t: "CATÉGORISATION", d: 9000, say: "Ça, c'est pas des courses. Ça, c'est un dîner." },
  { t: "DÉTECTION DES RÉCURRENCES", d: 9000, say: "Tiens. Tous les 3 du mois, comme une horloge." },
  { t: "CHASSE AUX FUITES", d: 10000, say: "Alors ça… ça va te faire mal." },
  { t: "RÉDACTION DU PORTRAIT", d: 12000, say: "J'ai tout. Je te prépare ça bien." },
];

export default function FranklinLoader() {
  const [lignes, setLignes] = useState<number[]>([]);
  const [phase, setPhase] = useState(0);
  const [n, setN] = useState(0);
  const i = useRef(0);

  // défilement du ticket
  useEffect(() => {
    const id = setInterval(() => {
      setLignes((prev) => [...prev, i.current++].slice(-11));
      setN((p) => p + Math.floor(Math.random() * 4) + 2);
    }, 340);
    return () => clearInterval(id);
  }, []);

  // enchaînement des phases (la dernière reste affichée si l'API est lente)
  useEffect(() => {
    const ids: ReturnType<typeof setTimeout>[] = [];
    let t = 0;
    PHASES.forEach((p, idx) => {
      t += p.d;
      ids.push(setTimeout(() => setPhase(idx + 1 < PHASES.length ? idx + 1 : idx), t));
    });
    return () => ids.forEach(clearTimeout);
  }, []);

  const p = PHASES[phase];
  // la barre s'arrête à 92 % : les 8 % restants = arrivée réelle du rapport
  const pct = Math.round(((phase + 1) / PHASES.length) * 92);

  return (
    <div className="fl-ov" role="status" aria-live="polite" aria-label="Analyse en cours">
      <style>{CSS}</style>
      <div className="fl-stage">
        {/* imprimante */}
        <div className="fl-printer">
          <span className="fl-slot-label">FRANKLIN · LECTURE EN COURS</span>
          <div className="fl-slot" />
          <div className="fl-tape">
            <div className="fl-paper">
              {lignes.map((k) => {
                const [lbl, amt, kind] = LIGNES[k % LIGNES.length];
                return (
                  <div key={k} className={`fl-line${kind === 1 ? " fl-mark" : kind === 2 ? " fl-flag" : ""}`}>
                    <span className="fl-lbl">{lbl}</span>
                    <span className="fl-amt">{amt}</span>
                  </div>
                );
              })}
            </div>
            <div className="fl-head" />
          </div>
          <div className="fl-teeth" />
        </div>

        {/* Franklin + statut */}
        <div className="fl-side">
          <div className="fl-bubble"><span key={phase}>{p.say}</span></div>

          <svg className="fl-mascotte" width="104" height="140" viewBox="0 0 195 265" aria-hidden="true">
            <path d="M45 30 L149 30 L149 232 L141 224 L133 232 L125 224 L117 232 L109 224 L101 232 L93 224 L85 232 L77 224 L69 232 L61 224 L53 232 L45 224 Z" fill="#fffdf8" stroke="#14161f" strokeWidth="5" />
            <path d="M45 30 L53 22 L61 30 L69 22 L77 30 L85 22 L93 30 L101 22 L109 30 L117 22 L125 30 L133 22 L141 30 L149 30" fill="#fffdf8" stroke="#14161f" strokeWidth="5" />
            <path d="M70 84 Q78 74 88 82" stroke="#14161f" strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d="M108 86 Q116 83 124 86" stroke="#14161f" strokeWidth="6" fill="none" strokeLinecap="round" />
            <g className="fl-eye" style={{ transformOrigin: "80px 100px" }}><circle cx="80" cy="100" r="7" fill="#14161f" /></g>
            <g className="fl-eye" style={{ transformOrigin: "116px 100px" }}><circle cx="116" cy="100" r="7" fill="#14161f" /></g>
            <path d="M84 124 Q97 132 112 122" stroke="#14161f" strokeWidth="5.5" fill="none" strokeLinecap="round" />
            <circle cx="68" cy="112" r="6" fill="#e6392e" opacity=".35" />
            <circle cx="128" cy="112" r="6" fill="#e6392e" opacity=".35" />
            <path d="M60 152 H134 M60 166 H134" stroke="#c9c4b8" strokeWidth="4" />
            <rect x="58" y="159" width="80" height="12" fill="#9cc3ff" opacity=".9" />
            <text x="60" y="210" fontFamily="IBM Plex Mono" fontWeight="700" fontSize="17" fill="#e6392e">TOTAL: AÏE.</text>
          </svg>

          <div className="fl-status">
            <div className="fl-phase">{p.t}</div>
            <div className="fl-bar"><i style={{ width: `${pct}%` }} /></div>
            <div className="fl-count"><b>{n}</b> transactions lues</div>
          </div>
        </div>

        <div className="fl-foot">ton fichier est supprimé dès le rapport écrit · rien n&apos;est stocké</div>
      </div>
    </div>
  );
}

const CSS = `
.fl-ov{position:fixed;inset:0;z-index:9999;background:#edf1fb;display:flex;
  align-items:center;justify-content:center;padding:24px;animation:fl-in .4s ease}
@keyframes fl-in{from{opacity:0}to{opacity:1}}
.fl-ov::before{content:"";position:absolute;inset:0;pointer-events:none;
  background-image:repeating-linear-gradient(0deg,transparent 0 27px,rgba(20,22,31,.045) 27px 28px)}
.fl-stage{position:relative;width:100%;max-width:880px;display:grid;
  grid-template-columns:1fr 300px;gap:44px;align-items:center}

.fl-printer{position:relative;padding-top:20px}
.fl-slot{position:relative;z-index:3;height:26px;border-radius:8px;background:#14161f;
  box-shadow:0 3px 0 rgba(20,22,31,.25);display:flex;align-items:center;justify-content:center}
.fl-slot::after{content:"";width:calc(100% - 34px);height:5px;border-radius:99px;background:#fbfbf8;opacity:.85}
.fl-slot-label{position:absolute;top:-18px;left:2px;font-family:'IBM Plex Mono',monospace;
  font-size:10.5px;font-weight:700;letter-spacing:.14em;color:#2f4df0}

.fl-tape{position:relative;margin:0 14px;height:330px;overflow:hidden;
  -webkit-mask-image:linear-gradient(180deg,#000 0 76%,transparent 100%);
          mask-image:linear-gradient(180deg,#000 0 76%,transparent 100%)}
.fl-paper{position:absolute;inset:0;background:#fffdf8;border-left:2.5px solid #14161f;
  border-right:2.5px solid #14161f;box-shadow:inset 0 10px 18px -12px rgba(20,22,31,.5);
  padding:16px 20px 0;display:flex;flex-direction:column;gap:9px}
.fl-teeth{position:absolute;left:14px;right:14px;bottom:52px;height:14px;z-index:2;
  background:linear-gradient(-45deg,#edf1fb 25%,transparent 25%) 0 0/14px 14px,
             linear-gradient(45deg,#edf1fb 25%,transparent 25%) 0 0/14px 14px}

.fl-line{font-family:'IBM Plex Mono',monospace;font-size:12.5px;line-height:1.45;
  display:flex;justify-content:space-between;gap:14px;align-items:baseline;
  opacity:0;transform:translateY(-10px);white-space:nowrap;
  animation:fl-feed .5s cubic-bezier(.2,.7,.3,1) forwards}
.fl-line .fl-lbl{overflow:hidden;text-overflow:ellipsis}
.fl-line .fl-amt{font-weight:700;flex-shrink:0}
.fl-line.fl-flag .fl-amt{color:#e6392e}
.fl-line.fl-mark .fl-lbl{background-image:linear-gradient(#9cc3ff,#9cc3ff);
  background-repeat:no-repeat;background-position:0 60%;background-size:0 78%;
  animation:fl-swipe .45s .25s ease forwards;padding:0 3px;border-radius:3px}
@keyframes fl-feed{to{opacity:1;transform:none}}
@keyframes fl-swipe{to{background-size:100% 78%}}

.fl-head{position:absolute;left:14px;right:14px;height:34px;z-index:2;pointer-events:none;
  background:linear-gradient(180deg,transparent,rgba(47,77,240,.14) 45%,rgba(47,77,240,.14) 55%,transparent);
  border-top:1px solid rgba(47,77,240,.35);border-bottom:1px solid rgba(47,77,240,.35);
  animation:fl-scan 2.6s cubic-bezier(.6,0,.4,1) infinite}
@keyframes fl-scan{0%{top:-34px}100%{top:330px}}

.fl-side{display:flex;flex-direction:column;align-items:center;gap:18px;text-align:center}
.fl-bubble{font-family:'IBM Plex Mono',monospace;font-size:12.5px;line-height:1.5;background:#fff;
  border:2.5px solid #14161f;border-radius:12px;padding:13px 15px;position:relative;
  min-height:66px;display:flex;align-items:center;box-shadow:3px 3px 0 #14161f}
.fl-bubble::after{content:"";position:absolute;bottom:-10px;left:50%;margin-left:-8px;width:15px;height:15px;
  background:#fff;border-right:2.5px solid #14161f;border-bottom:2.5px solid #14161f;transform:rotate(45deg)}
.fl-bubble span{animation:fl-pop .35s ease}
@keyframes fl-pop{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
.fl-mascotte{animation:fl-bob 2.4s ease-in-out infinite}
@keyframes fl-bob{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-7px) rotate(1deg)}}
.fl-eye{animation:fl-blink 4.2s infinite}
@keyframes fl-blink{0%,94%,100%{transform:scaleY(1)}97%{transform:scaleY(.1)}}

.fl-status{width:100%;max-width:300px}
.fl-phase{font-family:'IBM Plex Mono',monospace;font-size:11.5px;font-weight:700;
  letter-spacing:.11em;color:#2f4df0;margin-bottom:9px;min-height:17px}
.fl-bar{height:7px;background:#fff;border:2px solid #14161f;border-radius:99px;overflow:hidden}
.fl-bar i{display:block;height:100%;background:#2f4df0;transition:width .7s cubic-bezier(.4,0,.2,1)}
.fl-count{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#4a4f60;margin-top:9px}
.fl-count b{color:#14161f;font-weight:700}

.fl-foot{position:absolute;bottom:-58px;left:0;right:0;text-align:center;
  font-family:'IBM Plex Mono',monospace;font-size:11px;color:#4a4f60}

@media(max-width:760px){
  .fl-stage{grid-template-columns:1fr;gap:26px;max-width:420px}
  .fl-side{order:-1}
  .fl-mascotte{display:none}
  .fl-tape{height:230px}
  .fl-foot{position:static;margin-top:20px}
}
@media(prefers-reduced-motion:reduce){
  .fl-head,.fl-mascotte,.fl-eye{animation:none}
  .fl-line{animation-duration:.01s}
}
`;
