'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { borrarClave } from '@/lib/api';
import { useDatos } from '@/lib/data-context';

const SECCIONES = [
  {
    grupo: 'Todos los días',
    items: [
      { href: '/ventas/nueva/', texto: 'Cargar venta' },
      { href: '/gastos/nuevo/', texto: 'Cargar gasto' },
    ],
  },
  {
    grupo: 'Registro',
    items: [
      { href: '/ventas/', texto: 'Ventas' },
      { href: '/gastos/', texto: 'Gastos' },
      { href: '/clientes/', texto: 'Clientes' },
    ],
  },
  {
    grupo: 'Análisis',
    items: [
      { href: '/', texto: 'Panel del mes' },
      { href: '/productos/', texto: 'Por producto' },
      { href: '/evolucion/', texto: 'Evolución' },
    ],
  },
  { grupo: 'Ajustes', items: [{ href: '/config/', texto: 'Listas' }] },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [abierto, setAbierto] = useState(false);
  const { cargando, error, recargar } = useDatos();

  const activo = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));

  const nav = (
    <nav className="space-y-6">
      {SECCIONES.map((s) => (
        <div key={s.grupo}>
          <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            {s.grupo}
          </div>
          {s.items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              onClick={() => setAbierto(false)}
              className={`block border-l-2 px-3 py-2 text-sm transition-colors ${
                activo(i.href)
                  ? 'border-l-spot bg-paper/[0.05] font-medium text-ink'
                  : 'border-l-transparent text-muted hover:text-ink'
              }`}
            >
              {i.texto}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Barra fija de escritorio */}
      <aside className="hidden w-60 shrink-0 border-r border-rule bg-paper lg:flex lg:flex-col">
        <div className="border-b border-rule px-5 py-5">
          <div className="text-[15px] font-semibold tracking-tight">CopyPaste</div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted">Panel del local</div>
        </div>
        <div className="flex-1 overflow-y-auto py-5">{nav}</div>
        <div className="border-t border-rule px-3 py-3">
          <button
            onClick={() => recargar(true)}
            className="w-full px-3 py-1.5 text-left text-xs text-muted hover:text-ink"
          >
            {cargando ? 'Actualizando…' : 'Actualizar datos'}
          </button>
          <button
            onClick={() => { borrarClave(); location.reload(); }}
            className="w-full px-3 py-1.5 text-left text-xs text-muted hover:text-ink"
          >
            Salir de este dispositivo
          </button>
        </div>
      </aside>

      {/* Barra de celular */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-rule bg-paper/95 px-4 py-3 backdrop-blur lg:hidden">
        <span className="text-sm font-semibold tracking-tight">CopyPaste</span>
        <button
          onClick={() => setAbierto((v) => !v)}
          className="border border-rule px-3 py-1.5 text-xs"
          aria-expanded={abierto}
        >
          {abierto ? 'Cerrar' : 'Menú'}
        </button>
      </header>
      {abierto && (
        <div className="border-b border-rule bg-paper px-2 py-4 lg:hidden">{nav}</div>
      )}

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-10 lg:py-9">
        {error && (
          <div className="mb-6 border border-rule border-l-2 border-l-neg bg-neg/[0.04] px-4 py-3 text-sm">
            {error}{' '}
            <button onClick={() => recargar(true)} className="underline underline-offset-2">
              Reintentar
            </button>
          </div>
        )}
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
