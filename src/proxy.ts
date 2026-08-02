import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isDemo } from "@/lib/demo";

// Middleware qui vérifie l'auth. En démo, tout est public (aucune auth) : on ne wrappe
// même pas `auth()` pour ne pas dépendre d'AUTH_SECRET.
export default isDemo
  ? () => NextResponse.next()
  : auth((req) => {
      const isLoggedIn = !!req.auth;
      const isPublicPage = ["/login", "/register", "/mdpForget", "/resetPassword"].includes(req.nextUrl.pathname);

      // On renvoie sur login
      if (!isLoggedIn && !isPublicPage) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    });

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
