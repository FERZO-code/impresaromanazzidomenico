/* Preventivo / conto lavori in PDF, A4, con l'identità del sito:
   nero inchiostro, arancione RD, fughe sottili e righe a piastrella. */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { IMPRESA } from "./impresa.js";
import { LOGO_PNG } from "./logo.js";

const hex = (h) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const INK = hex("#0B0B0B");
const FLARE = hex("#FF680B");
const FLARE_TEXT = hex("#B94400");
const PAPER2 = hex("#F2F1EE");
const MARBLE = hex("#ECE8E1");
const ASH = hex("#5C5C5C");
const WHITE = rgb(1, 1, 1);

const W = 595.28, H = 841.89, M = 48; // A4 in punti, margine
const UNITA = { mq: "m²", ml: "ml", pz: "pz", h: "h", "a corpo": "a corpo" };

/* useGrouping "always": in italiano Intl non separa le migliaia sotto i
   10.000 ("1360,00 €"), ma su un conto "1.360,00 €" si legge meglio. */
const euro = (n) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", useGrouping: "always" }).format(n);
const num = (n) => new Intl.NumberFormat("it-IT", { maximumFractionDigits: 3, useGrouping: "always" }).format(n);
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const round2 = (n) => Math.round(n * 100) / 100;

export function dataIt(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/* Importo di riga: quantità × prezzo quando ci sono entrambi, altrimenti
   l'importo scritto (le voci "a corpo" hanno solo quello). */
export function importoVoce(v) {
  if (isNum(v.quantita) && isNum(v.prezzo_unitario)) return round2(v.quantita * v.prezzo_unitario);
  return isNum(v.importo) ? round2(v.importo) : 0;
}

export function totali(d) {
  const imponibile = round2((d.voci || []).reduce((s, v) => s + importoVoce(v), 0));
  const aliquota = isNum(d.iva_percentuale) ? d.iva_percentuale : null;
  const iva = aliquota === null ? 0 : round2(imponibile * aliquota / 100);
  return { imponibile, aliquota, iva, totale: round2(imponibile + iva) };
}

export async function buildPdf(d) {
  const doc = await PDFDocument.create();
  const tipoTitolo = d.tipo === "conto" ? "Conto lavori" : "Preventivo";
  doc.setTitle(`${tipoTitolo}${d.numero ? " n. " + d.numero : ""} - ${IMPRESA.nome}`);
  doc.setAuthor(IMPRESA.nome);
  doc.setCreator(IMPRESA.sito);
  doc.setLanguage("it-IT");

  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await doc.embedPng(Uint8Array.from(atob(LOGO_PNG), (c) => c.charCodeAt(0)));

  /* Helvetica copre solo l'alfabeto WinAnsi: ogni carattere fuori (emoji,
     virgolette strane, simboli) diventa la sua forma base o sparisce, invece
     di far fallire l'intero PDF. */
  const safe = (font, s) => {
    let out = "";
    for (const ch of String(s ?? "").replace(/[\r\t]/g, " ")) {
      try { font.encodeText(ch); out += ch; } catch {
        const base = ch.normalize("NFKD").replace(/[^\x20-\x7E]/g, "");
        out += base;
      }
    }
    return out;
  };
  const width = (font, s, size) => font.widthOfTextAtSize(safe(font, s), size);
  const wrap = (font, s, size, max) => {
    const lines = [];
    for (const para of String(s ?? "").split("\n").map((p) => safe(font, p))) {
      let line = "";
      for (const word of para.split(/ +/)) {
        const t = line ? line + " " + word : word;
        if (font.widthOfTextAtSize(t, size) <= max) { line = t; continue; }
        if (line) lines.push(line);
        line = word;
        while (font.widthOfTextAtSize(line, size) > max && line.length > 1) { // parola più lunga della colonna
          let i = line.length - 1;
          while (i > 1 && font.widthOfTextAtSize(line.slice(0, i), size) > max) i--;
          lines.push(line.slice(0, i));
          line = line.slice(i);
        }
      }
      lines.push(line);
    }
    return lines;
  };

  let page, y;
  const pages = [];
  const text = (s, x, yy, { font = reg, size = 9.5, color = INK, align = "left" } = {}) => {
    const t = safe(font, s);
    const dx = align === "right" ? -font.widthOfTextAtSize(t, size) : align === "center" ? -font.widthOfTextAtSize(t, size) / 2 : 0;
    page.drawText(t, { x: x + dx, y: yy, size, font, color });
  };
  const rect = (x, yy, w, h, color) => page.drawRectangle({ x, y: yy, width: w, height: h, color });

  /* ---------- testata: solo sulla prima pagina ---------- */
  const newPage = (first) => {
    page = doc.addPage([W, H]);
    pages.push(page);
    rect(0, H - 6, W, 6, FLARE); // la fuga arancione in alto, come la barra del sito
    if (first) {
      page.drawImage(logo, { x: M, y: H - 46 - 56, width: 56, height: 56 });
      const x = M + 56 + 14;
      text(IMPRESA.nome.toUpperCase(), x, H - 62, { font: bold, size: 14 });
      text(IMPRESA.attivita.toUpperCase(), x, H - 76, { font: bold, size: 7.5, color: FLARE_TEXT });
      text(IMPRESA.indirizzo, x, H - 89, { size: 8.5, color: ASH });
      text("Tel. " + IMPRESA.telefoni.join(" / ") + "  ·  " + IMPRESA.email, x, H - 100, { size: 8.5, color: ASH });
      const fisc = [IMPRESA.piva && "P.IVA " + IMPRESA.piva, IMPRESA.codice_fiscale && "C.F. " + IMPRESA.codice_fiscale].filter(Boolean).join("  ·  ");
      if (fisc) text(fisc, x, H - 111, { size: 8.5, color: ASH });

      /* titolo del documento a destra, con la piastrella arancione */
      text(tipoTitolo.toUpperCase(), W - M, H - 66, { font: bold, size: 22, align: "right" });
      rect(W - M - 34, H - 80, 34, 4, FLARE);
      const meta = [d.numero && "N. " + d.numero, dataIt(d.data) && "Data " + dataIt(d.data)].filter(Boolean).join("   ");
      if (meta) text(meta, W - M, H - 96, { size: 9.5, align: "right" });
      y = H - 140;
    } else {
      text(IMPRESA.nome.toUpperCase(), M, H - 34, { font: bold, size: 9 });
      text(`${tipoTitolo}${d.numero ? " n. " + d.numero : ""}`, W - M, H - 34, { size: 9, align: "right", color: ASH });
      y = H - 56;
    }
  };

  newPage(true);

  /* ---------- cliente e cantiere: due piastrelle affiancate ---------- */
  const c = d.cliente || {};
  const boxW = (W - 2 * M - 10) / 2;
  const blocco = (x, label, righe) => {
    const linee = righe.filter(Boolean).flatMap((r, i) => wrap(i === 0 ? bold : reg, r, i === 0 ? 11 : 9, boxW - 28).map((l) => [l, i === 0]));
    return { x, label, linee, h: 30 + linee.length * 13 + 8 };
  };
  const bl = [blocco(M, d.tipo === "conto" ? "INTESTATO A" : "SPETT.LE", [c.nome || "-", c.indirizzo, c.codice_fiscale_piva && "C.F./P.IVA " + c.codice_fiscale_piva, c.telefono && "Tel. " + c.telefono])];
  if (d.cantiere) bl.push(blocco(M + boxW + 10, "CANTIERE", [d.cantiere]));
  const bh = Math.max(...bl.map((b) => b.h));
  for (const b of bl) {
    rect(b.x, y - bh, boxW, bh, PAPER2);
    rect(b.x, y - bh, 3, bh, FLARE);
    text(b.label, b.x + 14, y - 18, { font: bold, size: 7.5, color: FLARE_TEXT });
    b.linee.forEach(([l, first], i) => text(l, b.x + 14, y - 34 - i * 13, { font: first ? bold : reg, size: first ? 11 : 9 }));
  }
  y -= bh + 26;

  /* ---------- tabella delle voci ---------- */
  const cols = [
    { k: "descrizione", label: "DESCRIZIONE", w: 0, align: "left" },
    { k: "unita", label: "U.M.", w: 46, align: "center" },
    { k: "quantita", label: "Q.TÀ", w: 54, align: "right" },
    { k: "prezzo", label: "PREZZO", w: 72, align: "right" },
    { k: "importo", label: "IMPORTO", w: 80, align: "right" },
  ];
  cols[0].w = W - 2 * M - cols.slice(1).reduce((s, c) => s + c.w, 0);
  const pad = 8;
  const header = () => {
    rect(M, y - 22, W - 2 * M, 22, INK);
    let x = M;
    for (const col of cols) {
      const tx = col.align === "right" ? x + col.w - pad : col.align === "center" ? x + col.w / 2 : x + pad;
      text(col.label, tx, y - 14.5, { font: bold, size: 7.5, color: WHITE, align: col.align });
      x += col.w;
    }
    y -= 22;
  };
  const FOOT = 70; // spazio riservato al piè di pagina
  header();
  (d.voci || []).forEach((v, i) => {
    const desc = wrap(reg, v.descrizione || "-", 9.5, cols[0].w - 2 * pad);
    const rh = Math.max(24, 10 + desc.length * 12.5);
    if (y - rh < FOOT) { newPage(false); header(); }
    if (i % 2 === 1) rect(M, y - rh, W - 2 * M, rh, PAPER2);
    page.drawLine({ start: { x: M, y: y - rh }, end: { x: W - M, y: y - rh }, thickness: 0.5, color: MARBLE });
    desc.forEach((l, j) => text(l, M + pad, y - 15.5 - j * 12.5, { size: 9.5 }));
    const val = {
      unita: UNITA[v.unita] || v.unita || "",
      quantita: isNum(v.quantita) ? num(v.quantita) : "",
      prezzo: isNum(v.prezzo_unitario) ? euro(v.prezzo_unitario) : "",
      importo: euro(importoVoce(v)),
    };
    let x = M + cols[0].w;
    for (const col of cols.slice(1)) {
      const tx = col.align === "right" ? x + col.w - pad : x + col.w / 2;
      text(val[col.k], tx, y - 15.5, { size: 9.5, align: col.align, font: col.k === "importo" ? bold : reg });
      x += col.w;
    }
    y -= rh;
  });

  /* ---------- totali ---------- */
  const t = totali(d);
  const righe = [["Imponibile", euro(t.imponibile)]];
  if (t.aliquota !== null) righe.push([`IVA ${num(t.aliquota)}%`, euro(t.iva)]);
  const totH = righe.length * 18 + 40 + 20;
  if (y - totH < FOOT) { newPage(false); }
  y -= 14;
  const tx = W - M - 230;
  for (const [l, v] of righe) {
    text(l, tx + 12, y - 12, { size: 9.5, color: ASH });
    text(v, W - M - pad, y - 12, { size: 9.5, align: "right" });
    y -= 18;
  }
  rect(tx, y - 36, 230, 34, FLARE);
  text(t.aliquota === null ? "TOTALE" : "TOTALE IVA INCLUSA", tx + 12, y - 23, { font: bold, size: 9, color: INK });
  text(euro(t.totale), W - M - pad, y - 24, { font: bold, size: 15, color: INK, align: "right" });
  y -= 36 + 26;
  if (t.aliquota === null) {
    text("Importi IVA esclusa.", W - M, y + 12, { size: 8, color: ASH, align: "right" });
  }

  /* ---------- note ---------- */
  if (d.note && d.note.trim()) {
    const linee = wrap(reg, d.note.trim(), 9, W - 2 * M);
    let first = true;
    for (const l of linee) {
      if (y - 14 < FOOT) { newPage(false); first = true; }
      if (first) { text("NOTE", M, y, { font: bold, size: 7.5, color: FLARE_TEXT }); y -= 14; first = false; }
      text(l, M, y, { size: 9 });
      y -= 12.5;
    }
    y -= 14;
  }

  /* ---------- firme ---------- */
  if (y - 70 < FOOT) newPage(false);
  y -= 30;
  const firma = (x, label) => {
    page.drawLine({ start: { x, y }, end: { x: x + 200, y }, thickness: 0.8, color: INK });
    text(label, x, y - 12, { size: 8, color: ASH });
  };
  firma(M, "Per l'impresa");
  firma(W - M - 200, d.tipo === "conto" ? "Il cliente" : "Per accettazione, il cliente");

  /* ---------- galleria: le foto dei lavori, due per riga ----------
     Ogni foto sta in una piastrella color marmo e mantiene le sue
     proporzioni: verticali e orizzontali convivono senza tagli. */
  const foto = d.foto || [];
  if (foto.length) {
    const GAP = 14, COLS = 2, ROWS = 3;
    const cw = (W - 2 * M - GAP) / COLS, bh = 172, ch = bh + 34;
    let n = 0;
    for (const f of foto) {
      if (n % (COLS * ROWS) === 0) {
        newPage(false);
        text("FOTO DEI LAVORI", M, y - 20, { font: bold, size: 18 });
        rect(M, y - 30, 34, 4, FLARE);
        text(foto.length === 1 ? "1 foto" : `${foto.length} foto`, W - M, y - 20, { size: 9, color: ASH, align: "right" });
        y -= 52;
      }
      const col = n % COLS, row = Math.floor((n % (COLS * ROWS)) / COLS);
      const x = M + col * (cw + GAP), top = y - row * ch;
      rect(x, top - bh, cw, bh, MARBLE);
      const img = f.tipo === "png" ? await doc.embedPng(f.bytes) : await doc.embedJpg(f.bytes);
      const k = Math.min((cw - 8) / img.width, (bh - 8) / img.height);
      const iw = img.width * k, ih = img.height * k;
      page.drawImage(img, { x: x + (cw - iw) / 2, y: top - bh + (bh - ih) / 2, width: iw, height: ih });
      let cap = wrap(reg, f.didascalia || "", 8.5, cw);
      if (cap.length > 2) { // due righe al massimo: la terza diventa "…"
        let l = cap[1];
        while (l && reg.widthOfTextAtSize(l + "…", 8.5) > cw) l = l.slice(0, -1);
        cap = [cap[0], l.trimEnd() + "…"];
      }
      cap.forEach((l, j) => text(l, x, top - bh - 13 - j * 11, { size: 8.5, color: ASH }));
      n++;
    }
  }

  /* ---------- piè di pagina: fila di piastrelle e numero di pagina ---------- */
  pages.forEach((p, i) => {
    page = p;
    for (let k = 0; k < 6; k++) rect(M + k * 9, 30, 7, 7, k === 0 ? FLARE : MARBLE);
    text(IMPRESA.sito, M + 62, 30.5, { size: 7.5, color: ASH });
    text(`Pagina ${i + 1} di ${pages.length}`, W - M, 30.5, { size: 7.5, color: ASH, align: "right" });
  });

  return doc.save();
}
