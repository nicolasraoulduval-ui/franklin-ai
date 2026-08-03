/** Rapport Franklin -> PDF, en JavaScript pur (pdf-lib).
 *
 *  Pourquoi pas une capture HTML : imprimer une page web demande un Chrome
 *  headless, trop lourd pour le runtime serverless. On dessine donc le PDF
 *  directement — c'est plus de code, mais le résultat est dans la charte et
 *  la génération prend quelques centaines de millisecondes.
 *
 *  Le PDF a un vrai rôle produit : le lien privé expire à 30 jours, le PDF
 *  reste. C'est ce que promettent les CGV.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Rapport } from "./franklin";

const INK = rgb(0.078, 0.086, 0.121);
const BLUE = rgb(0.184, 0.302, 0.941);
const HL = rgb(0.612, 0.765, 1);
const SOFT = rgb(0.29, 0.31, 0.376);
const RED = rgb(0.902, 0.224, 0.18);
const TICKET = rgb(1, 0.992, 0.973);

const A4 = { w: 595.28, h: 841.89 };
const M = 56;                       // marge
const LARG = A4.w - M * 2;

/** Les polices standard PDF encodent en WinAnsi : ça couvre le français
 *  (accents, «», —, ’) mais pas les emoji ni les espaces fines insécables.
 *  On remplace ce qui n'est pas encodable plutôt que de laisser pdf-lib jeter. */
function net(s: string): string {
  return (s ?? "")
    .replace(/ | | /g, " ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
}

interface Ctx {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  reg: PDFFont;
  bold: PDFFont;
}

function nouvellePage(c: Ctx): void {
  c.page = c.doc.addPage([A4.w, A4.h]);
  c.y = A4.h - M;
}

function place(c: Ctx, hauteur: number): void {
  if (c.y - hauteur < M + 30) nouvellePage(c);
}

function coupe(txt: string, font: PDFFont, taille: number, largeur: number): string[] {
  const mots = net(txt).split(/\s+/).filter(Boolean);
  const lignes: string[] = [];
  let cur = "";
  for (const mot of mots) {
    const essai = cur ? `${cur} ${mot}` : mot;
    if (font.widthOfTextAtSize(essai, taille) > largeur && cur) {
      lignes.push(cur);
      cur = mot;
    } else cur = essai;
  }
  if (cur) lignes.push(cur);
  return lignes;
}

function para(c: Ctx, txt: string, opts: { taille?: number; font?: PDFFont; couleur?: typeof INK; interligne?: number; x?: number; largeur?: number } = {}): void {
  const taille = opts.taille ?? 11;
  const font = opts.font ?? c.reg;
  const il = opts.interligne ?? taille * 1.55;
  const x = opts.x ?? M;
  const larg = opts.largeur ?? LARG;
  for (const l of coupe(txt, font, taille, larg)) {
    place(c, il);
    c.page.drawText(l, { x, y: c.y - taille, size: taille, font, color: opts.couleur ?? INK });
    c.y -= il;
  }
}

function titreSection(c: Ctx, txt: string): void {
  place(c, 62);
  c.y -= 20;
  c.page.drawLine({ start: { x: M, y: c.y }, end: { x: A4.w - M, y: c.y }, thickness: 2, color: INK });
  c.y -= 10;
  para(c, txt.toUpperCase(), { taille: 9, font: c.bold, couleur: BLUE, interligne: 18 });
  c.y -= 4;
}

/** Encadré ticket : sert aux punchlines, qui sont le cœur du rapport. */
function encadre(c: Ctx, txt: string, accent = BLUE): void {
  const taille = 12;
  const lignes = coupe(txt, c.reg, taille, LARG - 34);
  const h = lignes.length * taille * 1.5 + 26;
  place(c, h + 12);
  const haut = c.y;
  c.page.drawRectangle({ x: M, y: haut - h, width: LARG, height: h, color: TICKET });
  c.page.drawRectangle({ x: M, y: haut - h, width: 4, height: h, color: accent });
  let yy = haut - 20;
  for (const l of lignes) {
    c.page.drawText(l, { x: M + 18, y: yy - taille, size: taille, font: c.reg, color: INK });
    yy -= taille * 1.5;
  }
  c.y = haut - h - 14;
}

export async function rapportEnPdf(rapport: Rapport, prenom: string, date: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Rapport Franklin - ${prenom}`);
  doc.setAuthor("Franklin AI");
  doc.setSubject("Portrait financier");

  const c: Ctx = {
    doc,
    page: doc.addPage([A4.w, A4.h]),
    y: A4.h - M,
    reg: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  // ---------- en-tête ----------
  c.page.drawText("FRANKLIN", { x: M, y: c.y - 18, size: 18, font: c.bold, color: INK });
  const wF = c.bold.widthOfTextAtSize("FRANKLIN", 18);
  c.page.drawRectangle({ x: M + wF + 8, y: c.y - 20, width: 26, height: 20, color: BLUE });
  c.page.drawText("AI", { x: M + wF + 14, y: c.y - 15, size: 12, font: c.bold, color: rgb(1, 1, 1) });
  c.page.drawText(net(`${prenom} - ${date}`), {
    x: A4.w - M - c.reg.widthOfTextAtSize(net(`${prenom} - ${date}`), 9),
    y: c.y - 14, size: 9, font: c.reg, color: SOFT,
  });
  c.y -= 52;

  // ---------- archétype ----------
  para(c, "TON ARCHETYPE", { taille: 9, font: c.bold, couleur: BLUE, interligne: 18 });
  const t = net(rapport.archetype.titre).toUpperCase();
  const tl = coupe(t, c.bold, 26, LARG);
  for (const l of tl) {
    place(c, 34);
    const w = c.bold.widthOfTextAtSize(l, 26);
    c.page.drawRectangle({ x: M - 3, y: c.y - 28, width: w + 8, height: 24, color: HL });
    c.page.drawText(l, { x: M, y: c.y - 26, size: 26, font: c.bold, color: INK });
    c.y -= 34;
  }
  c.y -= 4;
  if (rapport.archetype.sous_titre) para(c, rapport.archetype.sous_titre, { taille: 12, couleur: SOFT });
  c.y -= 6;
  para(c, rapport.archetype.texte);

  // ---------- mensonges ----------
  if (rapport.mensonges?.length) {
    titreSection(c, "Ce que tu te racontes");
    for (const m of rapport.mensonges) {
      place(c, 40);
      para(c, `« ${m.mensonge} »`, { taille: 12, font: c.bold });
      para(c, m.verite, { couleur: SOFT });
      encadre(c, m.punchline);
    }
  }

  // ---------- fuites ----------
  if (rapport.fuites?.lignes?.length) {
    titreSection(c, "Ce que ca te coute");
    if (rapport.fuites.intro) para(c, rapport.fuites.intro, { couleur: SOFT });
    c.y -= 6;
    for (const l of rapport.fuites.lignes) {
      place(c, 20);
      const mt = net(l.montant_json);
      c.page.drawText(net(l.label), { x: M, y: c.y - 11, size: 11, font: c.reg, color: INK });
      c.page.drawText(mt, {
        x: A4.w - M - c.bold.widthOfTextAtSize(mt, 11),
        y: c.y - 11, size: 11, font: c.bold, color: RED,
      });
      c.page.drawLine({
        start: { x: M, y: c.y - 17 }, end: { x: A4.w - M, y: c.y - 17 },
        thickness: 0.5, color: rgb(0.85, 0.85, 0.83),
      });
      c.y -= 22;
    }
    if (rapport.fuites.total_label) { c.y -= 4; para(c, rapport.fuites.total_label, { font: c.bold }); }
    if (rapport.fuites.punchline) encadre(c, rapport.fuites.punchline, RED);
  }

  // ---------- toi vs toi ----------
  if (rapport.toi_vs_toi) {
    titreSection(c, rapport.toi_vs_toi.titre || "Toi contre toi");
    const col = (LARG - 20) / 2;
    const depart = c.y;
    let bas = depart;
    [rapport.toi_vs_toi.gauche, rapport.toi_vs_toi.droite].forEach((cote, i) => {
      const x = M + i * (col + 20);
      c.y = depart;
      para(c, cote.label, { taille: 10, font: c.bold, couleur: BLUE, x, largeur: col, interligne: 16 });
      for (const f of cote.faits) para(c, `- ${f}`, { taille: 10, x, largeur: col, interligne: 15 });
      bas = Math.min(bas, c.y);
    });
    c.y = bas - 6;
    if (rapport.toi_vs_toi.punchline) encadre(c, rapport.toi_vs_toi.punchline);
  }

  // ---------- bulletin ----------
  if (rapport.bulletin?.length) {
    titreSection(c, "Ton bulletin");
    for (const b of rapport.bulletin) {
      place(c, 30);
      c.page.drawText(net(b.matiere), { x: M, y: c.y - 11, size: 11, font: c.bold, color: INK });
      c.page.drawText(net(b.note), {
        x: A4.w - M - c.bold.widthOfTextAtSize(net(b.note), 13),
        y: c.y - 12, size: 13, font: c.bold, color: BLUE,
      });
      c.y -= 16;
      para(c, b.appreciation, { taille: 10, couleur: SOFT, largeur: LARG - 60, interligne: 14 });
      c.y -= 4;
    }
  }

  // ---------- signature ----------
  if (rapport.signature) {
    titreSection(c, rapport.signature.titre || "Ta signature");
    para(c, rapport.signature.texte);
  }

  // ---------- verdict ----------
  titreSection(c, "Le verdict");
  para(c, rapport.verdict.texte);
  c.y -= 8;
  para(c, rapport.verdict.derniere_ligne, { taille: 15, font: c.bold });

  // ---------- cartes ----------
  if (rapport.cartes?.length) {
    nouvellePage(c);
    para(c, "A PARTAGER", { taille: 9, font: c.bold, couleur: BLUE, interligne: 20 });
    para(c, "Aucun montant, aucun nom de banque. Tu partages la verite, pas ton salaire.",
      { taille: 10, couleur: SOFT });
    c.y -= 10;
    const larg = (LARG - 18) / 2, haut = 150;
    rapport.cartes.slice(0, 4).forEach((carte, i) => {
      const col = i % 2, rang = Math.floor(i / 2);
      const x = M + col * (larg + 18);
      const yTop = c.y - rang * (haut + 18);
      const fonds = [BLUE, TICKET, INK, HL];
      const encres = [rgb(1, 1, 1), INK, rgb(1, 1, 1), INK];
      c.page.drawRectangle({ x, y: yTop - haut, width: larg, height: haut, color: fonds[i] });
      const lignes = coupe(carte.texte, c.bold, 13, larg - 32);
      let yy = yTop - haut / 2 + (lignes.length * 18) / 2;
      for (const l of lignes) {
        c.page.drawText(l, {
          x: x + (larg - c.bold.widthOfTextAtSize(l, 13)) / 2,
          y: yy - 13, size: 13, font: c.bold, color: encres[i],
        });
        yy -= 18;
      }
    });
    c.y -= 2 * (haut + 18) + 10;
  }

  // ---------- pied de page sur chaque page ----------
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(net(`Franklin AI - divertissement & lucidite, pas un conseil financier`), {
      x: M, y: 30, size: 8, font: c.reg, color: SOFT,
    });
    const n = `${i + 1}/${pages.length}`;
    p.drawText(n, { x: A4.w - M - c.reg.widthOfTextAtSize(n, 8), y: 30, size: 8, font: c.reg, color: SOFT });
  });

  return doc.save();
}
