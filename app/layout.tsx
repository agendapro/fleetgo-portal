import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FleetGo · Portal del Dueño",
  description: "Portal de auto-consulta y asistente IA para dueños de vehículos en FleetGo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-bg text-ink">{children}</body>
    </html>
  );
}
