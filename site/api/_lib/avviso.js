/* Avviso via e-mail (Resend) a ogni nuova richiesta di preventivo.
   Variabili d'ambiente su Vercel:
   RESEND_API_KEY   obbligatoria (resend.com → API Keys)
   RESEND_FROM      mittente su un dominio verificato in Resend,
                    es. "Sito Romanazzi <richieste@impresaromanazzidomenico.it>".
                    Senza dominio verificato Resend accetta solo onboarding@resend.dev,
                    che consegna esclusivamente all'indirizzo del proprio account Resend.
   RICHIESTE_EMAIL  destinatario (predefinito: l'e-mail del sito). */
const DEST = "impresaromanazzid@virgilio.it";

const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export const avvisoConfigurato = () => Boolean(process.env.RESEND_API_KEY);

export async function inviaAvviso(r) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const righe = [
    ["Nome", r.nome], ["Telefono", r.telefono], ["E-mail", r.email], ["Comune", r.comune],
    ["Lavoro", r.lavoro], ["Metri quadri", r.mq], ["Quando", r.quando],
  ].filter(([, v]) => v);
  const tel = r.telefono.replace(/[^\d+]/g, "");
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1C2226;max-width:560px">
<h2 style="margin:0 0 4px;font-size:20px">Nuova richiesta di preventivo</h2>
<p style="margin:0 0 18px;color:#5B6360">Dal modulo del sito impresaromanazzidomenico.it</p>
<table style="border-collapse:collapse;width:100%">${righe.map(([k, v]) =>
    `<tr><td style="padding:7px 12px 7px 0;color:#5B6360;border-bottom:1px solid #e3e4df;width:130px">${k}</td><td style="padding:7px 0;border-bottom:1px solid #e3e4df"><b>${esc(v)}</b></td></tr>`).join("")}</table>
${r.messaggio ? `<p style="margin:18px 0 6px;color:#5B6360">Descrizione</p><p style="margin:0;white-space:pre-wrap">${esc(r.messaggio)}</p>` : ""}
<p style="margin:24px 0 0"><a href="tel:${esc(tel)}" style="background:#FF680B;color:#14100D;padding:11px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Chiama ${esc(r.telefono)}</a></p>
<p style="margin:18px 0 0;font-size:13px;color:#5B6360">La trovi anche nell'area riservata, sezione Richieste.</p></div>`;
  const text = righe.map(([k, v]) => `${k}: ${v}`).join("\n") + (r.messaggio ? `\n\n${r.messaggio}` : "");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "Sito Romanazzi <onboarding@resend.dev>",
      to: [process.env.RICHIESTE_EMAIL || DEST],
      reply_to: r.email || undefined,
      subject: `Richiesta di preventivo: ${r.nome}${r.comune ? " · " + r.comune : ""}`,
      html, text,
    }),
  });
  if (!res.ok) { console.error("Resend", res.status, await res.text().catch(() => "")); return false; }
  return true;
}
