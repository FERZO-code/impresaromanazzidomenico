/* Vercel Routing Middleware: senza sessione valida le pagine di /admin
   rimandano al login. Le API controllano la sessione anche per conto loro:
   questo è solo il primo cancello. */
import { next } from "@vercel/functions";
import { isLoggedIn } from "./api/_lib/auth.js";

export const config = { matcher: ["/admin", "/admin/:path*"] };

export default async function middleware(request) {
  const { pathname } = new URL(request.url);
  if (pathname === "/admin/login.html") return next();
  if (await isLoggedIn(request)) {
    return next({ headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  }
  return Response.redirect(new URL("/admin/login.html", request.url), 303);
}
