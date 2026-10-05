import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

// Rutas públicas que no requieren autenticación
const PUBLIC_FILE_EXTENSIONS = [
  ".ico",
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".css",
  ".js",
  ".woff",
  ".woff2",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Permitir archivos estáticos y rutas internas de Next.js
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    PUBLIC_FILE_EXTENSIONS.some((ext) => pathname.endsWith(ext))
  ) {
    return NextResponse.next();
  }

  // 2. Permitir endpoints de autenticación pública (Captcha, Login, y verificación de Sesión)
  if (
    pathname === "/api/auth/captcha" ||
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/session"
  ) {
    return NextResponse.next();
  }

  // 3. Verificar token de sesión criptográfico institucional
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(sessionCookie);
  const isAuthenticated = !!session;

  // 4. Si está en /login
  if (pathname === "/login") {
    // Si ya está autenticado válidamente, redirigir al escritorio
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/escritorio", request.url));
    }
    return NextResponse.next();
  }

  // 5. Si NO está autenticado y trata de acceder a rutas protegidas
  if (!isAuthenticated) {
    // Si es una petición API protegida, retornar 401 No Autorizado
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error: "Acceso denegado. Se requiere una sesión institucional activa y verificada con 2FA.",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    // Si es una página web protegida, redirigir al Login Institucional
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 6. Si la ruta es la raíz "/" y está autenticado, llevar al escritorio
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/escritorio", request.url));
  }

  // 7. Acceso autorizado
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Interceptar todas las rutas excepto archivos con extensiones estáticas obvias
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
