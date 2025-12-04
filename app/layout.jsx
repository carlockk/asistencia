import "./globals.css";

export const metadata = {
  title: "Asistencia Empleados",
  description: "Control de entrada y salida de empleados"
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <div className="app-shell">
          <main className="app-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
