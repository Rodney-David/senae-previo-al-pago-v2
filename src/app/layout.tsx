import type { Metadata } from "next";
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: "SENAE - Control Financiero Previo al Pago",
  description: "Sistema de Control Financiero y Gestión de Pagos del Servicio Nacional de Aduana del Ecuador",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full bg-slate-900 text-slate-900 antialiased overflow-hidden">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
