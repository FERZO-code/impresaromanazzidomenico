import { listaClienti, salvaCliente, eliminaCliente } from "./_lib/db.js";
import { guard, risposta, idValido } from "./_lib/risposte.js";

/* Rubrica clienti.
   GET              → elenco
   POST {cliente}   → crea (senza id) o aggiorna (con id)
   POST {clienti:[]}→ importa più clienti insieme (dal vecchio file o dal browser)
   DELETE ?id=      → elimina */
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const pulisci = (c) => ({
  id: idValido(c.id) ? c.id : crypto.randomUUID(),
  nome: str(c.nome, 200), indirizzo: str(c.indirizzo, 300), codice_fiscale_piva: str(c.codice_fiscale_piva, 40),
  telefono: str(c.telefono, 40), email: str(c.email, 200), note: str(c.note, 2000),
  aggiornato: new Date().toISOString(),
});

export async function GET(request) {
  return (await guard(request)) || risposta(async () => Response.json({ clienti: await listaClienti() }));
}

export async function POST(request) {
  const no = await guard(request);
  if (no) return no;
  const b = await request.json().catch(() => null);
  if (b && Array.isArray(b.clienti)) {
    const validi = b.clienti.slice(0, 2000).filter((c) => c && str(c.nome, 200)).map(pulisci);
    return risposta(async () => { for (const c of validi) await salvaCliente(c); return Response.json({ importati: validi.length }); });
  }
  const c = b && b.cliente;
  if (!c || !str(c.nome, 200)) return Response.json({ errore: "Il nome del cliente è obbligatorio." }, { status: 400 });
  return risposta(async () => Response.json({ cliente: await salvaCliente(pulisci(c)) }));
}

export async function DELETE(request) {
  const no = await guard(request);
  if (no) return no;
  const id = new URL(request.url).searchParams.get("id");
  if (!idValido(id)) return Response.json({ errore: "Cliente non valido." }, { status: 400 });
  return risposta(async () => Response.json({ eliminato: await eliminaCliente(id) }));
}
