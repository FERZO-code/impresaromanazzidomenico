import { createToken, passwordMatches, sessionCookie, MAX_AGE } from "./_lib/auth.js";

/* Il modulo di login invia la password qui. Una risposta sbagliata arriva
   dopo un secondo: rende lenti i tentativi a raffica. */
export async function POST(request) {
  const form = await request.formData().catch(() => null);
  const ok = form && (await passwordMatches(form.get("password")));
  if (!ok) {
    await new Promise((r) => setTimeout(r, 1000));
    return new Response(null, { status: 303, headers: { Location: "/admin/login.html?errore=1" } });
  }
  return new Response(null, {
    status: 303,
    headers: { Location: "/admin/", "Set-Cookie": sessionCookie(await createToken(), MAX_AGE) },
  });
}
