import { isLoggedIn } from "./_lib/auth.js";
import { buildPdf } from "./_lib/pdf.js";

/* Riceve i dati controllati dal modulo e restituisce il PDF da scaricare. */
const str = (v, max = 2000) => (typeof v === "string" ? v.slice(0, max) : "");
const n = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/* Foto dei lavori: arrivano come data URL già ridotti dal browser. */
const MAX_FOTO = 24;
function leggiFoto(f) {
  const m = f && typeof f.src === "string" && f.src.match(/^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return null;
  return { tipo: m[1] === "png" ? "png" : "jpg", bytes: Buffer.from(m[2], "base64"), didascalia: str(f.didascalia, 200) };
}

export async function POST(request) {
  if (!(await isLoggedIn(request))) return Response.json({ errore: "Sessione scaduta: accedi di nuovo." }, { status: 401 });
  const b = await request.json().catch(() => null);
  if (!b || !Array.isArray(b.voci)) return Response.json({ errore: "Dati del conto mancanti." }, { status: 400 });

  const c = b.cliente || {};
  const dati = {
    tipo: b.tipo === "conto" ? "conto" : "preventivo",
    numero: str(b.numero, 40),
    data: str(b.data, 10),
    cliente: { nome: str(c.nome, 200), indirizzo: str(c.indirizzo, 300), codice_fiscale_piva: str(c.codice_fiscale_piva, 40), telefono: str(c.telefono, 40) },
    cantiere: str(b.cantiere, 300),
    oggetto: str(b.oggetto, 200),
    valido_fino: str(b.valido_fino, 10),
    voci: b.voci.slice(0, 200).map((v) => ({
      descrizione: str(v.descrizione, 1000), dettaglio: str(v.dettaglio, 1000), unita: str(v.unita, 20),
      quantita: n(v.quantita), prezzo_unitario: n(v.prezzo_unitario), importo: n(v.importo),
    })),
    mostra_prezzi: b.mostra_prezzi === true,
    totale_manuale: n(b.totale_manuale),
    oneri_sicurezza: n(b.oneri_sicurezza),
    iva_percentuale: n(b.iva_percentuale),
    condizioni: (Array.isArray(b.condizioni) ? b.condizioni : []).slice(0, 30).map((c) => str(c, 500)),
    note: str(b.note, 4000),
    foto: (Array.isArray(b.foto) ? b.foto : []).slice(0, MAX_FOTO).map(leggiFoto).filter(Boolean),
  };

  let bytes;
  try {
    bytes = await buildPdf(dati);
  } catch (err) {
    console.error(err);
    return Response.json({ errore: "Una delle foto non è leggibile: rimuovila e riprova." }, { status: 422 });
  }
  /* come il modello: "Preventivo - Coniugi Didonna.pdf" */
  const nome = `${dati.tipo === "conto" ? "Conto lavori" : "Preventivo"}${dati.numero ? " " + dati.numero.replace(/[^\w-]+/g, "-") : ""} - ${(dati.cliente.nome || "cliente").replace(/[^\w À-ú'.-]+/g, " ").trim()}.pdf`;
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nome.normalize("NFKD").replace(/[^\x20-\x7E]/g, "")}"`,
      "Cache-Control": "no-store",
    },
  });
}
