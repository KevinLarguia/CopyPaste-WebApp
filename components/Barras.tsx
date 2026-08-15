'use client';

import { money, num } from '@/lib/format';

// Barras horizontales en HTML. Para 8 filas no hace falta una libreria de
// graficos: menos peso, mismo mensaje, y se lee igual en un celular.
export default function Barras({
  filas, formato = 'dinero', vacio = 'Todavía no hay datos para este mes.',
}: {
  filas: { etiqueta: string; total: number; cantidad?: number }[];
  formato?: 'dinero' | 'minutos';
  vacio?: string;
}) {
  const visibles = filas.filter((f) => f.total > 0);
  if (visibles.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">{vacio}</p>;
  }
  const max = Math.max(...visibles.map((f) => f.total));
  const fmt = (n: number) => (formato === 'dinero' ? money(n) : `${num(n)} min`);

  return (
    <ul className="space-y-2.5">
      {visibles.map((f) => (
        <li key={f.etiqueta}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{f.etiqueta}</span>
            <span className="cifra shrink-0 font-mono text-[13px]">{fmt(f.total)}</span>
          </div>
          <div className="h-1.5 w-full bg-rule">
            <div className="h-full bg-spot" style={{ width: `${(f.total / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
