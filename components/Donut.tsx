'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { money } from '@/lib/format';
import { CATEGORICA } from '@/lib/chart-colors';

// Dona con las 3 categorías más grandes + "Otros". Las 4 tienen el mismo peso
// visual: nunca se cicla el color, y el porcentaje va siempre como etiqueta
// directa (no todo el mensaje puede depender del color del anillo).
export default function Donut({
  filas, vacio = 'Todavía no hay datos para este mes.',
}: { filas: { etiqueta: string; total: number }[]; vacio?: string }) {
  const visibles = filas.filter((f) => f.total > 0);
  if (visibles.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">{vacio}</p>;
  }

  const top = visibles.slice(0, 3);
  const resto = visibles.slice(3);
  const otros = resto.reduce((a, f) => a + f.total, 0);
  const datos = otros > 0 ? [...top, { etiqueta: 'Otros', total: otros }] : top;
  const total = datos.reduce((a, f) => a + f.total, 0);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="h-36 w-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={datos}
              dataKey="total"
              nameKey="etiqueta"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="none"
            >
              {datos.map((_, i) => <Cell key={i} fill={CATEGORICA[i]} />)}
            </Pie>
            <Tooltip
              formatter={(v: number) => money(v)}
              contentStyle={{ border: '1px solid #E4E2DC', borderRadius: 8, fontSize: 13, backgroundColor: '#FFFFFF', color: '#16161A' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-2 text-sm">
        {datos.map((f, i) => (
          <li key={f.etiqueta} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CATEGORICA[i] }} />
              <span className="truncate">{f.etiqueta}</span>
            </span>
            <span className="cifra shrink-0 font-mono text-[13px] font-medium">
              {total ? Math.round((f.total / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
