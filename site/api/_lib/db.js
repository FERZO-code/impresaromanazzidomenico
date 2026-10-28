/* Archivio di clienti e documenti (preventivi e conti) su Neon Postgres,
   collegato da Vercel → Storage. Ogni record è un JSON completo (lo stesso
   che usa il modulo) più qualche colonna per elenchi e ricerche.

   Variabile d'ambiente: DATABASE_URL o POSTGRES_URL, anche con prefisso (la crea l'integrazione Neon).
   Le tabelle si creano da sole alla prima richiesta.
   Solo per le prove in locale: RD_DB_MEMORY=1 tiene tutto in memoria. */
import { neon } from "@neondatabase/serverless";

/* L'integrazione Neon di Vercel crea DATABASE_URL, ma con un prefisso
   scelto in fase di collegamento diventa per esempio RD_DATABASE_URL:
   si accetta qualsiasi variabile che finisce per DATABASE_URL o POSTGRES_URL,
   preferendo quella "pooled" (non UNPOOLED / NON_POOLING). */
const URL_DB = () => {
  const e = process.env;
  if (e.DATABASE_URL) return e.DATABASE_URL;
  if (e.POSTGRES_URL) return e.POSTGRES_URL;
  const k = Object.keys(e).find((n) => /(DATABASE|POSTGRES)_URL$/.test(n) && !/UNPOOLED|NON_POOLING/.test(n) && /^postgres(ql)?:\/\//.test(e[n] || ""));
  return k ? e[k] : undefined;
};
export const dbConfigurato = () => Boolean(URL_DB() || process.env.RD_DB_MEMORY);

let sql = null, pronto = null;
async function db() {
  if (!sql) sql = neon(URL_DB());
  if (!pronto) {
    pronto = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS clienti (
        id text PRIMARY KEY, nome text NOT NULL, dati jsonb NOT NULL, aggiornato timestamptz NOT NULL DEFAULT now())`;
      await sql`CREATE TABLE IF NOT EXISTS documenti (
        id text PRIMARY KEY, tipo text NOT NULL, data text, cliente_id text, cliente_nome text,
        oggetto text, totale numeric, dati jsonb NOT NULL,
        creato timestamptz NOT NULL DEFAULT now(), aggiornato timestamptz NOT NULL DEFAULT now())`;
    })().catch((e) => { pronto = null; throw e; });
  }
  await pronto;
  return sql;
}

/* ---------- memoria (solo prove locali) ---------- */
const MEM = { clienti: new Map(), documenti: new Map() };
const mem = () => process.env.RD_DB_MEMORY && !URL_DB();

/* ---------- clienti ---------- */
export async function listaClienti() {
  if (mem()) return [...MEM.clienti.values()].sort((a, b) => a.nome.localeCompare(b.nome, "it", { sensitivity: "base" }));
  const s = await db();
  const rows = await s`SELECT dati FROM clienti ORDER BY lower(nome)`;
  return rows.map((r) => r.dati);
}
export async function salvaCliente(c) {
  if (mem()) { MEM.clienti.set(c.id, c); return c; }
  const s = await db();
  await s`INSERT INTO clienti (id, nome, dati, aggiornato) VALUES (${c.id}, ${c.nome}, ${JSON.stringify(c)}::jsonb, now())
          ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, dati = EXCLUDED.dati, aggiornato = now()`;
  return c;
}
export async function eliminaCliente(id) {
  if (mem()) return MEM.clienti.delete(id);
  const s = await db();
  const r = await s`DELETE FROM clienti WHERE id = ${id} RETURNING id`;
  return r.length > 0;
}

/* ---------- documenti ---------- */
const riassunto = (d) => ({ id: d.id, tipo: d.tipo, data: d.data, cliente_id: d.cliente_id || "", cliente_nome: (d.cliente && d.cliente.nome) || "",
  oggetto: d.oggetto || "", totale: d._totale ?? null, foto: (d.foto || []).length, aggiornato: d.aggiornato });

export async function listaDocumenti() {
  if (mem()) return [...MEM.documenti.values()].map(riassunto).sort((a, b) => (b.aggiornato || "").localeCompare(a.aggiornato || ""));
  const s = await db();
  const rows = await s`SELECT id, tipo, data, cliente_id, cliente_nome, oggetto, totale::float AS totale,
                              coalesce(jsonb_array_length(dati->'foto'), 0) AS foto, aggiornato
                       FROM documenti ORDER BY aggiornato DESC LIMIT 500`;
  return rows;
}
export async function leggiDocumento(id) {
  if (mem()) return MEM.documenti.get(id) || null;
  const s = await db();
  const r = await s`SELECT dati FROM documenti WHERE id = ${id}`;
  return r.length ? r[0].dati : null;
}
export async function salvaDocumento(d) {
  if (mem()) { MEM.documenti.set(d.id, d); return riassunto(d); }
  const s = await db();
  await s`INSERT INTO documenti (id, tipo, data, cliente_id, cliente_nome, oggetto, totale, dati, aggiornato)
          VALUES (${d.id}, ${d.tipo}, ${d.data}, ${d.cliente_id || null}, ${(d.cliente && d.cliente.nome) || ""}, ${d.oggetto || ""},
                  ${d._totale}, ${JSON.stringify(d)}::jsonb, now())
          ON CONFLICT (id) DO UPDATE SET tipo = EXCLUDED.tipo, data = EXCLUDED.data, cliente_id = EXCLUDED.cliente_id,
            cliente_nome = EXCLUDED.cliente_nome, oggetto = EXCLUDED.oggetto, totale = EXCLUDED.totale,
            dati = EXCLUDED.dati, aggiornato = now()`;
  return riassunto(d);
}
export async function eliminaDocumento(id) {
  if (mem()) return MEM.documenti.delete(id);
  const s = await db();
  const r = await s`DELETE FROM documenti WHERE id = ${id} RETURNING id`;
  return r.length > 0;
}
