import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from 'sonner'
import { getAppName } from "@/lib/helpers/config-helpers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const appName = await getAppName();
  return {
    title: `${appName} - Gestión de Presupuestos Profesionales`,
    description: "Sistema de gestión de presupuestos profesionales para empresas y autónomos",
  };
}

// Forzar revalidación de metadata cuando cambie app_name en BD
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            classNames: {
              error: 'bg-red-50 border-red-200 text-red-800',
              success: 'bg-green-50 border-green-200 text-green-800',
              warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
              info: 'bg-gray-50 border-gray-200 text-gray-900',
            },
          }}
        />
      </body>
    </html>
  );
}
