/* Sessione dell'area /admin.
 *
 * Nessun database: dopo il login il browser riceve un cookie che contiene
 * la scadenza e una firma HMAC calcolata con ADMIN_SESSION_SECRET. Chi non
 * conosce il segreto non può fabbricarne uno valido, e il cookie scade da
 * solo. Usa solo Web Crypto, così gira sia nel middleware (Edge) sia nelle
 * funzioni Node. */

export const COOKIE = "rd_admin";
export const MAX_AGE = 12 * 60 * 60; // secondi: una giornata di lavoro

const enc = new TextEncoder();

function b64url(bytes) {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(data) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("ADMIN_SESSION_SECRET mancante o troppo corto (minimo 32 caratteri)");
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

/* Confronto a tempo costante: non rivela quanti caratteri iniziali coincidono. */
function sameString(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createToken() {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  return exp + "." + (await hmac(exp));
}

export async function verifyToken(token) {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp)) return false;
  if (Number(exp) < Date.now() / 1000) return false;
  try {
    return sameString(sig, await hmac(exp));
  } catch {
    return false;
  }
}

export function readCookie(request) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > -1 && part.slice(0, i).trim() === COOKIE) return part.slice(i + 1).trim();
  }
  return "";
}

export async function isLoggedIn(request) {
  return verifyToken(readCookie(request));
}

/* La password si confronta tramite l'hash, così le due stringhe hanno
   sempre la stessa lunghezza e il confronto resta a tempo costante. */
export async function passwordMatches(given) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof given !== "string") return false;
  const h = async (s) => b64url(await crypto.subtle.digest("SHA-256", enc.encode(s)));
  return sameString(await h(given), await h(expected));
}

export function sessionCookie(value, maxAge) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}
