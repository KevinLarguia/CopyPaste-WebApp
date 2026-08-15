'use client';

import { ReactNode } from 'react';
import { money, num, pct } from '@/lib/format';

export function Titulo({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="regla-doble mb-6 flex flex-wrap items-end justify-between gap-3 pb-3">
      <h1 className="text-[22px] font-semibold tracking-tight">{children}</h1>
      {accion}
    </div>
  );
}

export function Seccion({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <section className="mb-9">
      <div className="mb-3 flex items-baseline gap-3 border-b border-rule pb-1.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{titulo}</h2>
        {nota && <p className="text-xs text-muted">{nota}</p>}
      </div>
      {children}
    </section>
  );
}

type TonoKpi = 'normal' | 'pos' | 'neg' | 'alerta';

export function Kpi({
  etiqueta, valor, nota, tono = 'normal', grande = false,
}: { etiqueta: string; valor: string; nota?: string; tono?: TonoKpi; grande?: boolean }) {
  const color =
    tono === 'pos' ? 'text-pos' : tono === 'neg' ? 'text-neg' : tono === 'alerta' ? 'text-neg' : 'text-ink';
  return (
    <div className="marca border border-rule bg-paper p-4">
      <div className="text-[11px] uppercase tracking-[0.1em] text-muted">{etiqueta}</div>
      <div className={`cifra mt-1.5 font-mono ${grande ? 'text-3xl' : 'text-2xl'} font-semibold ${color}`}>
        {valor}
      </div>
      {nota && <div className="mt-1.5 text-xs leading-snug text-muted">{nota}</div>}
    </div>
  );
}

export function Tabla({ cabeceras, children, vacio }: {
  cabeceras: { texto: string; alineado?: 'izq' | 'der' }[];
  children: ReactNode;
  vacio?: string;
}) {
  const hayFilas = Array.isArray(children) ? children.length > 0 : Boolean(children);
  if (!hayFilas && vacio) return <Vacio>{vacio}</Vacio>;
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink/20">
            {cabeceras.map((c) => (
              <th
                key={c.texto}
                className={`whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted ${
                  c.alineado === 'der' ? 'text-right' : 'text-left'
                }`}
              >
                {c.texto}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export const Fila = ({ children }: { children: ReactNode }) => (
  <tr className="border-b border-rule last:border-0 hover:bg-white/[0.035]">{children}</tr>
);

export const Celda = ({ children, der, mono, className = '' }: {
  children: ReactNode; der?: boolean; mono?: boolean; className?: string;
}) => (
  <td className={`px-3 py-2.5 align-top ${der ? 'text-right' : ''} ${mono ? 'cifra font-mono' : ''} ${className}`}>
    {children}
  </td>
);

export const Dinero = ({ v }: { v: number | null }) => <span className="cifra font-mono">{money(v)}</span>;
export const Porcentaje = ({ v }: { v: number | null }) => <span className="cifra font-mono">{pct(v)}</span>;
export const Numero = ({ v, dec = 0 }: { v: number | null; dec?: number }) => (
  <span className="cifra font-mono">{num(v, dec)}</span>
);

export function Boton({
  children, onClick, tipo = 'secundario', type = 'button', disabled, className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  tipo?: 'primario' | 'secundario' | 'peligro';
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}) {
  const estilos = {
    primario: 'bg-ink text-paper hover:opacity-90 disabled:bg-muted',
    secundario: 'border border-rule bg-paper text-ink hover:border-ink/40',
    peligro: 'border border-neg/30 bg-paper text-neg hover:bg-neg/5',
  }[tipo];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 items-center justify-center px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${estilos} ${className}`}
    >
      {children}
    </button>
  );
}

export function Campo({
  etiqueta, hint, error, children, ancho = 'normal',
}: {
  etiqueta: string; hint?: string; error?: string; children: ReactNode; ancho?: 'normal' | 'full';
}) {
  return (
    <label className={`block ${ancho === 'full' ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        {etiqueta}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-neg">{error}</span>}
    </label>
  );
}

export const claseInput =
  'h-11 w-full border border-rule bg-paper px-3 text-[15px] text-ink placeholder:text-muted/60 focus:border-spot focus:outline-none';

export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={`${claseInput} ${p.className || ''}`} />
);

export const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={`${claseInput} ${p.className || ''}`} />
);

export const Aviso = ({ tono = 'info', children }: { tono?: 'info' | 'alerta' | 'error'; children: ReactNode }) => {
  const c = {
    info: 'border-rule bg-paper text-ink',
    alerta: 'border-l-2 border-l-spot border-y-rule border-r-rule bg-spot/[0.04] text-ink',
    error: 'border-l-2 border-l-neg border-y-rule border-r-rule bg-neg/[0.04] text-ink',
  }[tono];
  return <div className={`border px-4 py-3 text-sm leading-relaxed ${c}`}>{children}</div>;
};

export const Vacio = ({ children }: { children: ReactNode }) => (
  <div className="border border-dashed border-rule px-4 py-10 text-center text-sm text-muted">
    {children}
  </div>
);

export const Cargando = ({ que = 'los datos' }: { que?: string }) => (
  <div className="px-4 py-10 text-center text-sm text-muted">Trayendo {que}…</div>
);
