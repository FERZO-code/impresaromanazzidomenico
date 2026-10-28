/* Preventivo / conto lavori in PDF, identico al modello RD
   ("Preventivo - Coniugi Didonna.pdf", nato da una pagina HTML stampata
   con Chrome). Tutte le misure sono in px CSS come nel modello
   (pagina 794 × 1123 px, 1 px = 0,75 pt) e vengono convertite qui sotto.

   Due accorgimenti per avere lo stesso aspetto della stampa di Chrome:
   - caratteri Barlow e Barlow Condensed incorporati (cartella fonts/);
   - Chrome arrotonda la larghezza di ogni lettera al pixel intero (lo si
     vede negli spostamenti del modello): le misure e la spaziatura qui
     fanno lo stesso, così righe e a capo cadono negli stessi punti. */
import fs from "node:fs";
import { PDFDocument, rgb, setCharacterSpacing } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { IMPRESA } from "./impresa.js";
import { LOGO_PNG } from "./logo.js";

const FONT_FILES = {
  regular: "Barlow-Regular.ttf",
  semibold: "Barlow-SemiBold.ttf",
  bold: "Barlow-Bold.ttf",
  cond: "BarlowCondensed-Bold.ttf",
};
const fontBytes = Object.fromEntries(Object.entries(FONT_FILES).map(([k, f]) =>
  [k, fs.readFileSync(new URL("./fonts/" + f, import.meta.url))]));
const metrics = Object.fromEntries(Object.entries(fontBytes).map(([k, b]) => [k, fontkit.create(b)]));

/* ---------- colori del modello ---------- */
const hex = (h) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const C = {
  ink: hex("#0B0B0B"), text: hex("#1D1D1D"), flare: hex("#FF680B"), flareText: hex("#B94400"),
  sub: hex("#C9CAC7"), info: hex("#555555"), muted: hex("#67676A"), cond: hex("#444444"),
  rule: hex("#E4E2DD"), footRule: hex("#E3E3E3"), panel: hex("#F2F1EE"), zebra: hex("#FAF9F7"),
  ivaNote: hex("#A8A8A6"), sign: hex("#777777"), signLine: hex("#333333"), foot: hex("#999999"), white: rgb(1, 1, 1),
};

/* ---------- pagina e unità ---------- */
const PW = 594.96, PH = 841.92;      // pt, come il modello
const K = 0.75;                      // pt per px
const L = 53, R = 741, CW = R - L;   // margini in px
const TOP = 38, LIMIT = 1065;        // inizio pagine successive, ultimo px utile per il contenuto
const FOOT_RULE = 1085, FOOT_TEXT = 1108;

const UNITA = { mq: "m²", ml: "ml", pz: "pz", cad: "cad", h: "ore", kg: "kg", "a corpo": "a corpo" };

const euro = (n) => new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" }).format(n) + " €";
const qta = (n) => new Intl.NumberFormat("it-IT", { maximumFractionDigits: 3, useGrouping: false }).format(n);
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const round2 = (n) => Math.round(n * 100) / 100;

export function dataIt(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

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

export const CONDIZIONI_PREDEFINITE = [
  "I prezzi si intendono validi per il periodo indicato nel presente preventivo e esclusi di IVA.",
  "Eventuali lavori non espressamente indicati saranno quantificati a parte, previo accordo.",
  "Le quantità sono stimate: il consuntivo sarà redatto sulla base delle misure effettivamente eseguite.",
  "Sono esclusi, salvo diversa indicazione: pratiche edilizie, oneri comunali, progettazione e direzione lavori.",
  "Il cantiere sarà consegnato pulito e sgombero da materiali di risulta.",
  "I lavori saranno eseguiti a regola d'arte",
];

export async function buildPdf(d) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const conto = d.tipo === "conto";
  const titolo = conto ? "CONTO LAVORI" : "PREVENTIVO";
  const cliente = d.cliente || {};
  doc.setTitle(`${conto ? "Conto lavori" : "Preventivo"} - ${cliente.nome || IMPRESA.nome}`);
  doc.setAuthor(IMPRESA.nome);
  doc.setCreator(IMPRESA.sito);
  doc.setLanguage("it-IT");

  const F = {};
  for (const k of Object.keys(fontBytes)) F[k] = await doc.embedFont(fontBytes[k], { subset: true });
  const logo = await doc.embedPng(Uint8Array.from(atob(LOGO_PNG), (c) => c.charCodeAt(0)));

  /* ---------- testo: misure "alla Chrome" ---------- */
  const clean = (k, s) => {
    // caratteri che il font non ha (emoji, simboli rari) diventano la forma base o spariscono
    let out = "";
    for (const ch of String(s ?? "").replace(/[\r\t\n]/g, " ")) {
      if (metrics[k].hasGlyphForCodePoint(ch.codePointAt(0))) out += ch;
      else out += ch.normalize("NFKD").replace(/[^\x20-\x7E]/g, "");
    }
    return out;
  };
  const glyphs = (k, s, size) => metrics[k].layout(s).positions.map((p) => p.xAdvance / metrics[k].unitsPerEm * size);
  /* larghezza come la calcola Chrome: ogni avanzamento arrotondato al px, più la spaziatura */
  const width = (k, s, size, ls = 0, hint = true) => {
    s = clean(k, s);
    return glyphs(k, s, size).reduce((a, g) => a + (hint ? Math.round(g) : g) + ls, 0);
  };
  let page;
  const pages = [];
  /* x e y in px (y = linea di base, dall'alto) */
  const text = (s, x, y, { f = "regular", size = 14, color = C.text, ls = 0, align = "left", hint = true } = {}) => {
    s = clean(f, s);
    if (!s) return 0;
    const g = glyphs(f, s, size);
    const nat = g.reduce((a, b) => a + b, 0);
    const w = g.reduce((a, b) => a + (hint ? Math.round(b) : b) + ls, 0);
    const tc = (w - nat) / g.length; // spaziatura che porta la larghezza naturale a quella di Chrome
    const x0 = align === "right" ? x - w + ls : align === "center" ? x - (w - ls) / 2 : x;
    page.pushOperators(setCharacterSpacing(tc * K));
    page.drawText(s, { x: x0 * K, y: PH - y * K, size: size * K, font: F[f], color });
    page.pushOperators(setCharacterSpacing(0));
    return w;
  };
  const box = (x, y, w, h, color) => page.drawRectangle({ x: x * K, y: PH - (y + h) * K, width: w * K, height: h * K, color });
  const stroke = (x, y, w, h, color) => page.drawRectangle({ x: x * K, y: PH - (y + h) * K, width: w * K, height: h * K, borderColor: color, borderWidth: K });
  /* a capo come il browser: per parole, con la larghezza "alla Chrome"
     (2 px di tolleranza per gli arrotondamenti che il browser non fa) */
  const wrap = (s, max, f, size, ls = 0) => {
    max += 2;
    const out = [];
    for (const para of String(s ?? "").split("\n")) {
      let line = "";
      for (const word of para.split(/ +/).filter(Boolean)) {
        const t = line ? line + " " + word : word;
        if (width(f, t, size, ls) <= max) { line = t; continue; }
        if (line) out.push(line);
        line = word;
        while (width(f, line, size, ls) > max && line.length > 1) {
          let i = line.length - 1;
          while (i > 1 && width(f, line.slice(0, i), size, ls) > max) i--;
          out.push(line.slice(0, i)); line = line.slice(i);
        }
      }
      if (line || !out.length) out.push(line);
    }
    return out;
  };
  const label = (s, x, y, size = 9.33) => text(s.toUpperCase(), x, y, { f: "bold", size, color: C.flareText, ls: size * 0.12 });

  const piede = `${IMPRESA.nome} · ${dataIt(d.data) || dataIt(new Date().toISOString().slice(0, 10))}${cliente.nome ? " · " + cliente.nome : ""}`;
  const footer = (ruleY) => {
    box(L, ruleY, CW, 1, C.footRule);
    text(piede, L + CW / 2, ruleY + 23, { size: 9.33, color: C.foot, align: "center" });
  };
  const newPage = () => {
    page = doc.addPage([PW, PH]);
    pages.push(page);
  };

  /* ================= pagina 1: testata ================= */
  newPage();
  box(L, 38, CW, 86, C.ink);
  box(L, 120, CW, 4, C.flare);
  page.drawImage(logo, { x: 70 * K, y: PH - (52 + 54) * K, width: 54 * K, height: 54 * K });
  text(IMPRESA.nome.toUpperCase(), 138.9, 78, { f: "cond", size: 25.33, color: C.white, ls: 25.33 * 0.026 });
  text(IMPRESA.attivita.toUpperCase(), 138.9, 99, { f: "semibold", size: 13.33, color: C.sub, ls: 13.33 * 0.19 });
  const punto = width("cond", ".", 40, 40 * 0.04);
  text(".", 721, 95, { f: "cond", size: 40, color: C.flare, ls: 40 * 0.04, align: "right" });
  text(titolo, 721 - punto, 95, { f: "cond", size: 40, color: C.white, ls: 40 * 0.04, align: "right" });

  /* riga dei contatti: indirizzo a sinistra, il resto a destra con i punti arancioni */
  text(IMPRESA.indirizzo + (IMPRESA.piva ? " · P.IVA " + IMPRESA.piva : ""), 54.9, 142, { size: 10.4, color: C.info });
  const parti = [`Tel. ${IMPRESA.telefoni.join(" · ")}`, IMPRESA.email, IMPRESA.sito_breve].filter(Boolean);
  /* in questa riga Chrome non arrotonda le lettere: larghezze naturali */
  let xr = 739;
  for (let i = parti.length - 1; i >= 0; i--) {
    xr -= text(parti[i], xr, 142, { size: 10.4, color: C.info, align: "right", hint: false });
    if (i > 0) { xr -= 6; xr -= text("·", xr, 142, { size: 10.4, color: C.flare, align: "right", hint: false }); xr -= 6; }
  }
  box(L, 153, CW, 1, C.rule);

  /* ---------- riquadro cliente / luogo / date ---------- */
  const col1 = [cliente.indirizzo, cliente.codice_fiscale_piva && "C.F./P.IVA " + cliente.codice_fiscale_piva, cliente.telefono && "Tel. " + cliente.telefono].filter(Boolean)
    .flatMap((r) => wrap(r, 299 - 66 - 10, "regular", 12.26));
  const nomeCl = wrap(cliente.nome || "—", 299 - 66 - 10, "bold", 14);
  const luogo = wrap(d.cantiere || cliente.indirizzo || "—", 544 - 312 - 10, "regular", 12.26);
  const h1 = 209 + (nomeCl.length - 1) * 18 + col1.length * 18;   // ultima linea di base colonna 1
  const h2 = 207 + (luogo.length - 1) * 18;
  const fondo = Math.max(242, Math.max(h1, h2) + 15);           // nel modello: 168 + 74
  box(544, 169, 196, fondo - 169, C.panel);
  stroke(53.5, 168.5, 687, fondo - 168, C.rule);
  box(299, 169, 1, fondo - 169, C.rule);
  box(544, 169, 1, fondo - 169, C.rule);
  label("Cliente", 65.9, 188);
  nomeCl.forEach((l, i) => text(l, 65.9, 209 + i * 18, { f: "bold", size: 14 }));
  col1.forEach((l, i) => text(l, 65.9, 227 + (nomeCl.length - 1) * 18 + i * 18, { size: 12.26 }));
  label("Luogo dei lavori", 312, 188);
  luogo.forEach((l, i) => text(l, 312, 207 + i * 18, { size: 12.26 }));
  const dateRighe = [["Data", dataIt(d.data)]];
  if (!conto && d.valido_fino) dateRighe.push(["Valido fino al", dataIt(d.valido_fino)]);
  dateRighe.forEach(([k, v], i) => {
    text(k, 557, 199 + i * 21, { size: 11.73, color: C.muted });
    text(v || "—", 733, 199 + i * 21, { f: "bold", size: 12.26, align: "right" });
  });
  let y = fondo + 13;

  /* ---------- oggetto ---------- */
  if (d.oggetto && d.oggetto.trim()) {
    const righe = wrap(d.oggetto.trim().toUpperCase(), CW - 16, "cond", 20, 20 * 0.01);
    box(L, y, 4, 21 + righe.length * 23, C.flare);
    label("Oggetto", 68.9, y + 13);
    righe.forEach((l, i) => text(l, 68.9, y + 36 + i * 23, { f: "cond", size: 20, color: C.ink, ls: 20 * 0.01 }));
    y += 21 + righe.length * 23 + 12;
  }

  /* ---------- tabella delle voci ---------- */
  const prezzi = !!d.mostra_prezzi;
  const cols = prezzi
    ? [["N.", 30], ["Descrizione dei lavori", 0], ["U.M.", 64], ["Q.tà", 50], ["Prezzo", 78], ["Importo", 86]]
    : [["N.", 30], ["Descrizione dei lavori", 0], ["U.M.", 64], ["Q.tà", 50]];
  cols[1][1] = CW - cols.reduce((s, c) => s + c[1], 0);
  const cx = []; cols.reduce((x, c) => (cx.push(x), x + c[1]), L);
  box(L, y, CW, 26, C.ink);
  cols.forEach(([t, w], i) => {
    const right = i >= 4;
    text(t.toUpperCase(), right ? cx[i] + w - 8 : cx[i] + 8, y + 17,
      { f: "bold", size: 9.73, color: C.white, ls: 9.73 * 0.12, align: right ? "right" : "left" });
  });
  y += 26;

  const descW = cols[1][1] - 16;
  (d.voci || []).forEach((v, i) => {
    const tit = wrap(v.descrizione || "—", descW, "bold", 14);
    const det = v.dettaglio && v.dettaglio.trim() ? wrap(v.dettaglio.trim(), descW, "regular", 12.8) : [];
    const ultima = 23 + (tit.length - 1) * 20 + (det.length ? 21 + (det.length - 1) * 18 : 0);
    const h = ultima + 14.5; // nel modello le righe sono alte 37,5 px
    if (y + h > LIMIT) { footer(FOOT_RULE); newPage(); y = TOP; }
    if (i % 2 === 1) box(L, y, CW, h, C.zebra);
    text(String(i + 1), 60.9, y + 23, { f: "bold", size: 14, color: C.flareText });
    tit.forEach((l, j) => text(l, 90.9, y + 23 + j * 20, { f: "bold", size: 14 }));
    det.forEach((l, j) => text(l, 90.9, y + 23 + (tit.length - 1) * 20 + 21 + j * 18, { size: 12.8, color: C.info }));
    text(UNITA[v.unita] ?? v.unita ?? "", cx[2] + cols[2][1] / 2, y + 23, { size: 14, align: "center" });
    if (isNum(v.quantita)) text(qta(v.quantita), cx[3] + cols[3][1] - 8, y + 23, { size: 14, align: "right" });
    if (prezzi) {
      if (isNum(v.prezzo_unitario)) text(euro(v.prezzo_unitario), cx[4] + cols[4][1] - 8, y + 23, { size: 14, align: "right" });
      text(euro(importoVoce(v)), cx[5] + cols[5][1] - 8, y + 23, { f: "bold", size: 14, align: "right" });
    }
    y += h;
    box(L, y, CW, 1, C.rule);
  });
  y += 17;

  /* ---------- condizioni generali + totali ---------- */
  const t = totali(d);
  const condizioni = (d.condizioni || []).map((c) => c.trim()).filter(Boolean)
    .flatMap((c) => wrap("- " + c.replace(/^[-–•]\s*/, ""), 390, "regular", 11.46));
  const condH = condizioni.length ? 38 + (condizioni.length - 1) * 18 + 15 : 0;
  const righeTot = [["Totale lavori", euro(t.lavori)], ["Oneri per la sicurezza", euro(t.oneri)]];
  if (t.aliquota !== null) righeTot.push([`IVA ${qta(t.aliquota)}%`, euro(t.iva)]);
  /* acconti già versati: righe sotto il totale e un secondo blocco "da saldare" */
  const totH = righeTot.length * 29 + 1 + 54 + (t.acconti.length ? t.acconti.length * 29 + 55 : 0);
  const bloccoH = Math.max(condH, totH);
  if (y + bloccoH > LIMIT) { footer(FOOT_RULE); newPage(); y = TOP; }
  if (condizioni.length) {
    box(L, y, 414, condH, C.panel);
    label("Condizioni generali", 64.9, y + 19);
    condizioni.forEach((l, i) => text(l, 64.9, y + 38 + i * 18, { size: 11.46, color: C.cond }));
  }
  righeTot.forEach(([k, v], i) => {
    const ty = y + i * 29;
    text(k, 499, ty + 19, { size: 12.66 });
    text(v, 733, ty + 19, { size: 12.66, align: "right" });
    box(491, ty + 28, 250, 1, C.rule);
  });
  const by = y + righeTot.length * 29 + 1;
  box(491, by, 250, 54, C.ink);
  text("TOTALE", 501, by + 29, { f: "cond", size: 20, color: C.white, ls: 20 * 0.02 });
  text(t.aliquota === null ? "IVA ESCLUSA" : "IVA INCLUSA", 501, by + 44, { f: "semibold", size: 9.06, color: C.ivaNote, ls: 9.06 * 0.1 });
  text(euro(t.totale), 733, by + 35, { f: "cond", size: 20, color: C.flare, align: "right" });
  if (t.acconti.length) {
    t.acconti.forEach((a, i) => {
      const ay = by + 54 + i * 29;
      const nome = a.descrizione || ("Acconto" + (a.data ? " del " + dataIt(a.data) : ""));
      text(nome, 499, ay + 19, { size: 12.66 });
      text("− " + euro(a.importo), 733, ay + 19, { size: 12.66, align: "right" });
      box(491, ay + 28, 250, 1, C.rule);
    });
    const sy = by + 54 + t.acconti.length * 29 + 1;
    box(491, sy, 250, 54, C.ink);
    text("DA SALDARE", 501, sy + 29, { f: "cond", size: 20, color: C.white, ls: 20 * 0.02 });
    text("AL NETTO DEGLI ACCONTI", 501, sy + 44, { f: "semibold", size: 9.06, color: C.ivaNote, ls: 9.06 * 0.1 });
    text(euro(t.saldo), 733, sy + 35, { f: "cond", size: 20, color: C.flare, align: "right" });
  }
  y += bloccoH;

  /* ---------- note ---------- */
  if (d.note && d.note.trim()) {
    const righe = wrap(d.note.trim(), CW, "regular", 11.46);
    y += 22;
    if (y + 20 + righe.length * 18 > LIMIT) { footer(FOOT_RULE); newPage(); y = TOP; }
    label("Note", L, y + 10);
    righe.forEach((l, i) => text(l, L, y + 29 + i * 18, { size: 11.46, color: C.cond }));
    y += 29 + (righe.length - 1) * 18 + 4;
  }

  /* ---------- firme ---------- */
  if (y + 35 + 48 + 30 > 1100) { footer(FOOT_RULE); newPage(); y = TOP - 35; }
  const fy = y + 35;
  label("L'impresa", 52.9, fy);
  label(conto ? "Il committente" : "Per accettazione – il committente", 422, fy);
  text(IMPRESA.titolare, 52.9, fy + 41, { size: 11.33, color: C.sign });
  text("Data ____________", 422, fy + 41, { size: 11.33, color: C.sign });
  box(L, fy + 47, 319, 1, C.signLine);
  box(422, fy + 47, 319, 1, C.signLine);
  footer(fy + 48);

  /* ================= galleria: foto dei lavori ================= */
  const foto = d.foto || [];
  if (foto.length) {
    const GAP = 16, cw = (CW - GAP) / 2, bh = 250, rowH = bh + 52, PER = 3;
    let n = 0;
    for (const f of foto) {
      if (n % (PER * 2) === 0) {
        if (n) footer(FOOT_RULE);
        newPage();
        box(L, TOP, 4, 44, C.flare);
        label("Documentazione", 68.9, TOP + 13);
        text("FOTO DEI LAVORI", 68.9, TOP + 36, { f: "cond", size: 20, color: C.ink, ls: 20 * 0.01 });
        text(foto.length === 1 ? "1 foto" : `${foto.length} foto`, R, TOP + 36, { size: 11.46, color: C.muted, align: "right" });
        y = TOP + 44 + 18;
      }
      const col = n % 2, row = Math.floor((n % (PER * 2)) / 2);
      const x = L + col * (cw + GAP), top = y + row * rowH;
      box(x, top, cw, bh, C.panel);
      const img = f.tipo === "png" ? await doc.embedPng(f.bytes) : await doc.embedJpg(f.bytes);
      const k = Math.min((cw - 12) / (img.width / K), (bh - 12) / (img.height / K)) / K; // px per pixel immagine
      const iw = img.width * k, ih = img.height * k;
      page.drawImage(img, { x: (x + (cw - iw) / 2) * K, y: PH - (top + (bh + ih) / 2) * K, width: iw * K, height: ih * K });
      let cap = wrap(f.didascalia || "", cw, "regular", 11.46);
      if (cap.length > 2) { // al massimo due righe: la terza diventa "…"
        let l = cap[1];
        while (l && width("regular", l + "…", 11.46) > cw) l = l.slice(0, -1);
        cap = [cap[0], l.trimEnd() + "…"];
      }
      cap.forEach((l, j) => text(l, x, top + bh + 18 + j * 18, { size: 11.46, color: C.info }));
      n++;
    }
    footer(FOOT_RULE);
  }

  return doc.save();
}
