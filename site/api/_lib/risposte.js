import { isLoggedIn } from "./auth.js";
import { dbConfigurato } from "./db.js";

/* Controlli comuni delle API dell'archivio. */
export async function guard(request) {
  if (!(await isLoggedIn(request))) return Response.json({ errore: "Sessione scaduta: accedi di nuovo." }, { status: 401 });
  if (!dbConfigurato()) return Response.json({ errore: "Database non ancora collegato: su Vercel apri Storage e collega Neon (vedi LEGGIMI)." }, { status: 503 });
  return null;
}
export function risposta(fn) {
  return fn().catch((err) => {
    console.error(err);
    return Response.json({ errore: "Il database non risponde. Riprova fra poco." }, { status: 502 });
  });
}
export const idValido = (id) => /^[\w-]{8,60}$/.test(id || "");
