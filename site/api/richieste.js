import { salvaRichiesta, listaRichieste, statoRichiesta, eliminaRichiesta, dbConfigurato } from "./_lib/db.js";
import { guard, risposta, idValido } from "./_lib/risposte.js";
import { inviaAvviso, avvisoConfigurato } from "./_lib/avviso.js";

/* Richieste di preventivo dal modulo della pagina Contatti.
   POST (pubblico)        → salva una richiesta; JSON o form classico (senza JavaScript)
   GET  (area admin)      → elenco
   PATCH ?id= {stato}     → nuova / letta / gestita
   DELETE ?id=            → elimina */
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const LAVORI = ["Pavimenti e rivestimenti", "Bagno completo", "Massetti", "Impermeabilizzazioni", "Grandi formati", "Altro"];
const STATI = ["nuova", "letta", "gestita"];

async function leggiCorpo(request) {
  const tipo = request.headers.get("content-type") || "";
  if (tipo.includes("application/json")) return { dati: await request.json().catch(() => ({})), json: true };
  const f = await request.formData().catch(() => null);
  return { dati: f ? Object.fromEntries(f.entries()) : {}, json: false };
}

export async function POST(request) {
  const { dati: b, json } = await leggiCorpo(request);
  const fine = (ok, errore, status) => json
    ? Response.json(ok ? { ok: true } : { errore }, { status: status || (ok ? 200 : 400) })
    : Response.redirect(new URL(ok ? "/contatti.html?inviata=1#preventivo" : "/contatti.html?errore=1#preventivo", request.url), 303);

  /* trappola per i robot: campo nascosto che una persona lascia vuoto,
     e un modulo inviato in meno di 3 secondi dall'apertura */
  if (str(b.sito, 200)) return fine(true);
  const t = Number(b.t);
  if (Number.isFinite(t) && t > 0 && Date.now() - t < 3000) return fine(true);

  const r = {
    id: crypto.randomUUID(),
    nome: str(b.nome, 120), telefono: str(b.telefono, 40), email: str(b.email, 160),
    comune: str(b.comune, 80), lavoro: LAVORI.includes(b.lavoro) ? b.lavoro : "Altro",
    mq: str(b.mq, 20), quando: str(b.quando, 60), messaggio: str(b.messaggio, 3000),
  };
  if (!r.nome || r.telefono.replace(/\D/g, "").length < 6) return fine(false, "Servono il nome e un numero di telefono valido.");
  if (b.privacy !== "on" && b.privacy !== true) return fine(false, "Serve il consenso al trattamento dei dati.");
  /* si salva nell'archivio e si manda l'avviso per e-mail: basta che riesca
     una delle due cose perché la richiesta non vada persa */
  let salvata = false, avvisata = false;
  if (dbConfigurato()) { try { await salvaRichiesta(r); salvata = true; } catch (e) { console.error(e); } }
  if (avvisoConfigurato()) { try { avvisata = await inviaAvviso(r); } catch (e) { console.error(e); } }
  if (!salvata && !avvisata) return fine(false, "Invio non riuscito. Riprova fra poco o chiamaci al 347 176 9861.", 502);
  return fine(true);
}

export async function GET(request) {
  return (await guard(request)) || risposta(async () => Response.json({ richieste: await listaRichieste() }));
}

export async function PATCH(request) {
  const no = await guard(request);
  if (no) return no;
  const id = new URL(request.url).searchParams.get("id");
  const b = await request.json().catch(() => ({}));
  if (!idValido(id) || !STATI.includes(b.stato)) return Response.json({ errore: "Richiesta non valida." }, { status: 400 });
  return risposta(async () => Response.json({ aggiornata: await statoRichiesta(id, b.stato) }));
}

export async function DELETE(request) {
  const no = await guard(request);
  if (no) return no;
  const id = new URL(request.url).searchParams.get("id");
  if (!idValido(id)) return Response.json({ errore: "Richiesta non valida." }, { status: 400 });
  return risposta(async () => Response.json({ eliminata: await eliminaRichiesta(id) }));
}
