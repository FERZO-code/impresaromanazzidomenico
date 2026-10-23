import { sessionCookie } from "./_lib/auth.js";

export function POST() {
  return new Response(null, {
    status: 303,
    headers: { Location: "/admin/login.html?uscito=1", "Set-Cookie": sessionCookie("", 0) },
  });
}
