import "./globals.css";
import ThemeToggle from "./components/ThemeToggle";

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
          <ThemeToggle />
        </div>
      </body>
    </html>
  );
}
