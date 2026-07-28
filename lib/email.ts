/** Livraison du rapport par email (Resend). Silencieux si RESEND_API_KEY absent. */

const FROM = process.env.EMAIL_FROM ?? "Franklin AI <franklin@amfmentor.com>";

export async function sendReportEmail(to: string, prenom: string, reportUrl: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const subject = `${prenom}, ton rapport Franklin est prêt`;
  const text = `${prenom},\n\nFranklin a fini de lire ton relevé. Ton portrait financier complet est là :\n${reportUrl}\n\nCe lien est privé — ne le partage qu'avec des gens que tu aimes vraiment.\nTes fichiers ont été supprimés juste après l'analyse. Le rapport s'efface automatiquement sous 30 jours.\n\nFranklin est un divertissement lucide, pas un conseiller financier.`;
  const html = `<!DOCTYPE html>
<html lang="fr"><body style="margin:0;padding:0;background:#fbfbf8;font-family:Helvetica,Arial,sans-serif;color:#14161f;">
  <div style="max-width:520px;margin:0 auto;padding:36px 24px;">
    <div style="font-weight:900;font-size:20px;margin-bottom:28px;">FRANKLIN <span style="background:#2f4df0;color:#ffffff;padding:1px 7px;border-radius:5px;font-size:16px;">AI</span></div>
    <h1 style="font-size:28px;line-height:1.1;margin:0 0 14px;">${prenom}, ton relevé<br>a fini de parler.</h1>
    <p style="font-size:16px;line-height:1.6;margin:0 0 22px;">Archétype, mensonges, fuites, bulletin, verdict — et tes 4 cartes à partager. Tout est là.</p>
    <a href="${reportUrl}" style="display:inline-block;background:#2f4df0;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 26px;border:2px solid #14161f;">LIRE MON RAPPORT →</a>
    <p style="font-size:13px;color:#6b6f7e;line-height:1.6;margin:28px 0 0;">Ce lien est privé — ne le partage qu'avec des gens que tu aimes vraiment.<br>
    Tes fichiers ont été supprimés juste après l'analyse. Le rapport s'efface automatiquement sous 30 jours.<br><br>
    Franklin est un divertissement lucide, pas un conseiller financier. Il lit, il raconte, il taquine.</p>
  </div>
</body></html>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, html, text }),
    });
    if (!res.ok) console.error("resend:", res.status, (await res.text()).slice(0, 200));
  } catch (e) {
    console.error("resend:", e); // l'email ne doit jamais faire échouer le webhook
  }
}
