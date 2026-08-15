import type { Metadata } from 'next';
import './globals.css';
import { ProveedorDatos } from '@/lib/data-context';
import AppShell from '@/components/AppShell';
import Gate from '@/components/Gate';

export const metadata: Metadata = {
  title: 'CopyPaste — Panel',
  description: 'Registro de ventas, gastos y clientes del local.',
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <head>
        {/* Inter por link y no por next/font a propósito: si Google Fonts no
            responde, la app abre igual con la tipografía del sistema en vez
            de romper el build o quedarse en blanco. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <Gate>
          <ProveedorDatos>
            <AppShell>{children}</AppShell>
          </ProveedorDatos>
        </Gate>
      </body>
    </html>
  );
}
