import { listaDocumenti, leggiDocumento, salvaDocumento, eliminaDocumento } from "./_lib/db.js";
import { guard, risposta, idValido } from "./_lib/risposte.js";
import { pulisciDocumento, totali } from "./_lib/documento.js";

/* Archivio di preventivi e conti.
   GET              → elenco (senza foto)
   GET ?id=         → documento completo, da riaprire nel modulo
   POST {id?, ...}  → salva (crea o aggiorna)
   DELETE ?id=      → elimina */
export async function GET(request) {
  const no = await guard(request);
  if (no) return no;
  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    if (!idValido(id)) return Response.json({ errore: "Documento non valido." }, { status: 400 });
    return risposta(async () => {
      const d = await leggiDocumento(id);
      return d ? Response.json({ documento: d }) : Response.json({ errore: "Documento non trovato: forse è stato eliminato." }, { status: 404 });
    });
  }
  return risposta(async () => Response.json({ documenti: await listaDocumenti() }));
}

export async function POST(request) {
  const no = await guard(request);
  if (no) return no;
  const b = await request.json().catch(() => null);
  if (!b || !Array.isArray(b.voci)) return Response.json({ errore: "Dati del documento mancanti." }, { status: 400 });
  const d = pulisciDocumento(b);
  d.id = idValido(b.id) ? b.id : crypto.randomUUID();
  d.aggiornato = new Date().toISOString();
  d._totale = totali(d).totale;
  return risposta(async () => Response.json({ documento: await salvaDocumento(d) }));
}

export async function DELETE(request) {
  const no = await guard(request);
  if (no) return no;
  const id = new URL(request.url).searchParams.get("id");
  if (!idValido(id)) return Response.json({ errore: "Documento non valido." }, { status: 400 });
  return risposta(async () => Response.json({ eliminato: await eliminaDocumento(id) }));
}
