import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

//Middleware qui verifie l auth
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isPublicPage = ["/login", "/register", "/mdpForget", "/resetPassword"].includes(req.nextUrl.pathname);

  //On renvoit sur login
  if (!isLoggedIn && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
