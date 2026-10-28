import { isLoggedIn } from "./_lib/auth.js";
import { buildPdf } from "./_lib/pdf.js";
import { pulisciDocumento, fotoPerPdf } from "./_lib/documento.js";

/* Riceve i dati controllati dal modulo e restituisce il PDF da scaricare. */
export async function POST(request) {
  if (!(await isLoggedIn(request))) return Response.json({ errore: "Sessione scaduta: accedi di nuovo." }, { status: 401 });
  const b = await request.json().catch(() => null);
  if (!b || !Array.isArray(b.voci)) return Response.json({ errore: "Dati del conto mancanti." }, { status: 400 });
  const dati = pulisciDocumento(b);
  dati.foto = dati.foto.map(fotoPerPdf).filter(Boolean);

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
