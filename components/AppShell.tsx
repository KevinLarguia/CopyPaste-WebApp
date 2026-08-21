'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { borrarClave } from '@/lib/api';
import { useDatos } from '@/lib/data-context';

const SECCIONES = [
  {
    grupo: 'Inicio',
    items: [
      { href: '/', texto: 'Panel del mes' },
    ],
  },
  {
    grupo: 'Todos los días',
    items: [
      { href: '/ventas/nueva/', texto: 'Cargar venta' },
      { href: '/ventas/rapida/', texto: 'Cargar rápido' },
      { href: '/gastos/nuevo/', texto: 'Cargar gasto' },
      { href: '/ventas/pendientes/', texto: 'Pendientes de completar' },
    ],
  },
  {
    grupo: 'Registro',
    items: [
      { href: '/ventas/', texto: 'Ventas' },
      { href: '/gastos/', texto: 'Gastos' },
      { href: '/clientes/', texto: 'Clientes' },
      { href: '/clientes/reactivar/', texto: 'Reactivar clientes' },
    ],
  },
  {
    grupo: 'Análisis',
    items: [
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
              className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                activo(i.href)
                  ? 'bg-spot/10 font-medium text-spot'
                  : 'text-muted hover:bg-ink/[0.03] hover:text-ink'
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
    <div className="min-h-screen bg-surface lg:flex">
      {/* Barra fija de escritorio */}
      <aside className="hidden w-60 shrink-0 border-r border-rule bg-paper lg:flex lg:flex-col">
        <div className="flex items-center gap-2.5 border-b border-rule px-5 py-5">
          <LogoMarca />
          <div>
            <div className="text-[15px] font-semibold leading-tight tracking-tight">Copy-Paste</div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted">Panel del local</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-5">{nav}</div>
        <div className="border-t border-rule px-3 py-3">
          <button
            onClick={() => recargar(true)}
            className="w-full cursor-pointer rounded-lg px-3 py-1.5 text-left text-xs text-muted hover:bg-ink/[0.03] hover:text-ink"
          >
            {cargando ? 'Actualizando…' : 'Actualizar datos'}
          </button>
          <button
            onClick={() => { borrarClave(); location.reload(); }}
            className="w-full cursor-pointer rounded-lg px-3 py-1.5 text-left text-xs text-muted hover:bg-ink/[0.03] hover:text-ink"
          >
            Salir de este dispositivo
          </button>
        </div>
      </aside>

      {/* Barra de celular */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-rule bg-paper/95 px-4 py-3 backdrop-blur lg:hidden">
        <span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <LogoMarca chico /> Copy-Paste
        </span>
        <button
          onClick={() => setAbierto((v) => !v)}
          className="cursor-pointer rounded-lg border border-rule px-3 py-1.5 text-xs"
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
          <div className="mb-6 rounded-xl border border-rule border-l-[3px] border-l-neg bg-neg/[0.05] px-4 py-3 text-sm">
            {error}{' '}
            <button onClick={() => recargar(true)} className="cursor-pointer underline underline-offset-2">
              Reintentar
            </button>
          </div>
        )}
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

// Guiño al logo: la impresora suelta un abanico CMY. Cuatro trazos, sin texto.
function LogoMarca({ chico = false }: { chico?: boolean }) {
  const s = chico ? 22 : 30;
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none" aria-hidden="true" className="shrink-0">
      <rect x="5" y="11" width="22" height="13" rx="2.5" fill="#16161A" />
      <rect x="10" y="4" width="12" height="8" rx="1" fill="#16161A" />
      <rect x="9" y="21" width="14" height="8" rx="1" fill="#FFFFFF" stroke="#16161A" strokeWidth="1.5" />
      <path d="M11 17 L9 24 H13 Z" fill="#0891B2" />
      <path d="M15 17 L13.5 24 H17.5 Z" fill="#C2255C" />
      <path d="M19 17 L17.5 24 H21.5 Z" fill="#C98500" />
    </svg>
  );
}
