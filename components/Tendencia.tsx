'use client';

import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { money } from '@/lib/format';
import { INK, MUTED, RULE, SERIE_1 } from '@/lib/chart-colors';

const ejeCompacto = (v: number) =>
  Math.abs(v) >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${Math.round(v / 1000)}k`;

// Línea con área degradada para una serie de facturación en el tiempo,
// ya sea día a día o mes a mes: ambas vistas son el mismo gráfico, solo
// cambia qué se agrupa antes de llegar acá.
export default function Tendencia({
  datos, etiquetaTooltip, vacio = 'Todavía no hay ventas para mostrar.',
}: {
  datos: { x: string | number; total: number }[];
  etiquetaTooltip?: (x: string | number) => string;
  vacio?: string;
}) {
  const hayDatos = datos.some((f) => f.total > 0);
  if (datos.length === 0 || !hayDatos) {
    return <p className="py-10 text-center text-sm text-muted">{vacio}</p>;
  }

  // No apretar el eje con demasiados ticks en vistas largas (ej. 31 días).
  const salto = Math.max(1, Math.ceil(datos.length / 8));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={datos} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="tendenciaVentas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIE_1} stopOpacity={0.22} />
              <stop offset="100%" stopColor={SERIE_1} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={RULE} vertical={false} />
          <XAxis
            dataKey="x"
            interval={salto - 1}
            tick={{ fontSize: 11, fill: MUTED }}
            tickLine={false}
            axisLine={{ stroke: RULE }}
          />
          <YAxis tickFormatter={ejeCompacto} tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(v: number) => money(v)}
            labelFormatter={(x) => (etiquetaTooltip ? etiquetaTooltip(x) : String(x))}
            contentStyle={{ border: `1px solid ${RULE}`, borderRadius: 8, fontSize: 13, backgroundColor: '#FFFFFF', color: INK }}
            labelStyle={{ color: INK }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke={SERIE_1}
            strokeWidth={2}
            fill="url(#tendenciaVentas)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
