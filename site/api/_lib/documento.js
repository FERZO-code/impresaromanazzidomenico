/* Un preventivo o conto come arriva dal modulo, ripulito: usato sia per il
   PDF sia per l'archivio, così i due vedono sempre gli stessi campi. */
const str = (v, max = 2000) => (typeof v === "string" ? v.slice(0, max) : "");
const n = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const MAX_FOTO = 24;
const FOTO = /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/;

export function pulisciDocumento(b) {
  const c = b.cliente || {};
  return {
    tipo: b.tipo === "conto" ? "conto" : "preventivo",
    numero: str(b.numero, 40),
    data: str(b.data, 10),
    cliente: { nome: str(c.nome, 200), indirizzo: str(c.indirizzo, 300), codice_fiscale_piva: str(c.codice_fiscale_piva, 40), telefono: str(c.telefono, 40) },
    cliente_id: /^[\w-]{8,60}$/.test(b.cliente_id || "") ? b.cliente_id : "",
    cantiere: str(b.cantiere, 300),
    oggetto: str(b.oggetto, 200),
    valido_fino: str(b.valido_fino, 10),
    voci: (Array.isArray(b.voci) ? b.voci : []).slice(0, 200).map((v) => ({
      descrizione: str(v.descrizione, 1000), dettaglio: str(v.dettaglio, 1000), unita: str(v.unita, 20),
      quantita: n(v.quantita), prezzo_unitario: n(v.prezzo_unitario), importo: n(v.importo),
    })),
    mostra_prezzi: b.mostra_prezzi === true,
    totale_manuale: n(b.totale_manuale),
    oneri_sicurezza: n(b.oneri_sicurezza),
    iva_percentuale: n(b.iva_percentuale),
    acconti: (Array.isArray(b.acconti) ? b.acconti : []).slice(0, 20).map((a) => ({ descrizione: str(a.descrizione, 100), data: str(a.data, 10), importo: n(a.importo) })),
    condizioni: (Array.isArray(b.condizioni) ? b.condizioni : []).slice(0, 30).map((x) => str(x, 500)),
    note: str(b.note, 4000),
    foto: (Array.isArray(b.foto) ? b.foto : []).slice(0, MAX_FOTO)
      .filter((f) => f && typeof f.src === "string" && FOTO.test(f.src))
      .map((f) => ({ src: f.src, didascalia: str(f.didascalia, 200) })),
  };
}

/* Per il PDF le foto servono come byte. */
export function fotoPerPdf(f) {
  const m = f.src.match(/^data:image\/(jpeg|png);base64,(.+)$/);
  return m ? { tipo: m[1] === "png" ? "png" : "jpg", bytes: Buffer.from(m[2], "base64"), didascalia: f.didascalia } : null;
}

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const round2 = (x) => Math.round(x * 100) / 100;

/* Importo di riga: quantità × prezzo quando ci sono entrambi, altrimenti
   l'importo scritto (le voci "a corpo" hanno spesso solo quello). */
export function importoVoce(v) {
  if (isNum(v.quantita) && isNum(v.prezzo_unitario)) return round2(v.quantita * v.prezzo_unitario);
  return isNum(v.importo) ? round2(v.importo) : 0;
}

export function totali(d) {
  const somma = round2((d.voci || []).reduce((s, v) => s + importoVoce(v), 0));
  const lavori = isNum(d.totale_manuale) ? round2(d.totale_manuale) : somma;
  const oneri = isNum(d.oneri_sicurezza) ? round2(d.oneri_sicurezza) : 0;
  const imponibile = round2(lavori + oneri);
  const aliquota = isNum(d.iva_percentuale) ? d.iva_percentuale : null;
  const iva = aliquota === null ? 0 : round2(imponibile * aliquota / 100);
  const totale = round2(imponibile + iva);
  const acconti = (d.acconti || []).filter((a) => isNum(a.importo) && a.importo > 0);
  const versato = round2(acconti.reduce((s, a) => s + a.importo, 0));
  return { lavori, oneri, imponibile, aliquota, iva, totale, acconti, versato, saldo: round2(totale - versato) };
}

