'use client';

import { ReactNode } from 'react';
import { money, num, pct } from '@/lib/format';

export function Titulo({
  children, subtitulo, accion,
}: { children: ReactNode; subtitulo?: ReactNode; accion?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">{children}</h1>
        {subtitulo && <p className="mt-0.5 text-sm text-muted">{subtitulo}</p>}
      </div>
      {accion}
    </div>
  );
}

export function Tarjeta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-surface p-5 shadow-card ${className}`}>{children}</div>
  );
}

export function Seccion({ titulo, nota, accion, children }: {
  titulo: string; nota?: string; accion?: ReactNode; children: ReactNode;
}) {
  return (
    <section className="mb-9">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3 border-b border-rule pb-1.5">
        <div className="flex items-baseline gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{titulo}</h2>
          {nota && <p className="text-xs text-muted">{nota}</p>}
        </div>
        {accion}
      </div>
      {children}
    </section>
  );
}

export function Segmentado<T extends string>({
  valor, opciones, onChange,
}: { valor: T; opciones: { valor: T; etiqueta: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg bg-rule/50 p-0.5">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onChange(o.valor)}
          className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            valor === o.valor ? 'bg-paper text-ink shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}

type TonoKpi = 'normal' | 'pos' | 'neg' | 'alerta';

export function Kpi({
  etiqueta, valor, nota, tono = 'normal', grande = false, cambio,
}: {
  etiqueta: string; valor: string; nota?: string; tono?: TonoKpi; grande?: boolean;
  cambio?: { texto: string; tono: 'pos' | 'neg' };
}) {
  const color =
    tono === 'pos' ? 'text-pos' : tono === 'neg' ? 'text-neg' : tono === 'alerta' ? 'text-neg' : 'text-ink';
  return (
    <div className="rounded-2xl bg-surface p-4 shadow-card">
      <div className="text-[11px] uppercase tracking-[0.1em] text-muted">{etiqueta}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className={`cifra font-mono ${grande ? 'text-3xl' : 'text-2xl'} font-semibold ${color}`}>
          {valor}
        </span>
        {cambio && (
          <span className={`cifra rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
            cambio.tono === 'pos' ? 'bg-pos/10 text-pos' : 'bg-neg/10 text-neg'
          }`}>
            {cambio.texto}
          </span>
        )}
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
  <tr className="border-b border-rule last:border-0 hover:bg-ink/[0.025]">{children}</tr>
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
    primario: 'bg-spot text-paper hover:bg-spot/90 disabled:bg-muted',
    secundario: 'border border-rule bg-paper text-ink hover:bg-surface',
    peligro: 'border border-neg/30 bg-paper text-neg hover:bg-neg/5',
  }[tipo];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 cursor-pointer items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${estilos} ${className}`}
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
  'h-11 w-full rounded-lg border border-rule bg-paper px-3 text-[15px] text-ink placeholder:text-muted/60 focus:border-spot focus:outline-none';

export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={`${claseInput} ${p.className || ''}`} />
);

export const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={`${claseInput} ${p.className || ''}`} />
);

export const Aviso = ({ tono = 'info', children }: { tono?: 'info' | 'alerta' | 'error'; children: ReactNode }) => {
  const c = {
    info: 'border-rule bg-surface text-ink',
    alerta: 'border-l-2 border-l-gold border-y-rule border-r-rule bg-gold/[0.06] text-ink',
    error: 'border-l-2 border-l-neg border-y-rule border-r-rule bg-neg/[0.05] text-ink',
  }[tono];
  return <div className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${c}`}>{children}</div>;
};

export const Vacio = ({ children }: { children: ReactNode }) => (
  <div className="rounded-lg border border-dashed border-rule px-4 py-10 text-center text-sm text-muted">
    {children}
  </div>
);

export const Cargando = ({ que = 'los datos' }: { que?: string }) => (
  <div className="px-4 py-10 text-center text-sm text-muted">Trayendo {que}…</div>
);
