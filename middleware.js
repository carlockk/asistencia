export const config = {
  matcher: ["/admin/:path*", "/employee/:path*", "/evaluations/:path*"]
};

// La lógica principal de protección se maneja en los Server Components
// con verifyToken y redirect, así que aquí no hacemos nada aún.
export function middleware() {
  return;
}
