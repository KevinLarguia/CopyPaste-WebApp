'use client';

import { useMemo } from 'react';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useDatos } from '@/lib/data-context';
import { serieMensual } from '@/lib/calc';
import { money, nombreMes, num, pct } from '@/lib/format';
import { Celda, Dinero, Fila, Porcentaje, Seccion, Tabla, Titulo, Vacio } from '@/components/ui';

const ejeCompacto = (v: number) =>
  Math.abs(v) >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${Math.round(v / 1000)}k`;

export default function Evolucion() {
  const { data } = useDatos();
  const serie = useMemo(() => serieMensual(data), [data]);

  const grafico = serie.map((r) => ({
    mes: nombreMes(r.mes),
    Facturación: Math.round(r.facturacion),
    Resultado: Math.round(r.resultado),
    'Margen por hora': r.margenPorHora ? Math.round(r.margenPorHora) : 0,
  }));

  return (
    <>
      <Titulo>Evolución</Titulo>

      {serie.length === 0 ? (
        <Vacio>Todavía no hay meses cargados.</Vacio>
      ) : (
        <>
          <Seccion titulo="Facturación y resultado" nota="Mes a mes, para ver si crece o solo se mueve.">
            <div className="h-72 w-full border border-rule bg-paper p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={grafico} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="#332F27" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#93897d' }} tickLine={false} axisLine={{ stroke: '#332F27' }} />
                  <YAxis tickFormatter={ejeCompacto} tick={{ fontSize: 11, fill: '#93897d' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(v: number) => money(v)}
                    contentStyle={{ border: '1px solid #332F27', borderRadius: 3, fontSize: 13, backgroundColor: '#181815', color: '#F0EFEA' }}
                    labelStyle={{ color: '#F0EFEA' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#F0EFEA' }} />
                  <Bar dataKey="Facturación" fill="#3FB6D4" />
                  <Bar dataKey="Resultado" fill="#F0EFEA" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Seccion>

          <Seccion titulo="Margen por hora" nota="El número que decide qué máquina comprar y qué producto empujar.">
            <div className="h-60 w-full border border-rule bg-paper p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={grafico} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="#332F27" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#93897d' }} tickLine={false} axisLine={{ stroke: '#332F27' }} />
                  <YAxis tickFormatter={ejeCompacto} tick={{ fontSize: 11, fill: '#93897d' }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v: number) => money(v)} contentStyle={{ border: '1px solid #332F27', borderRadius: 3, fontSize: 13, backgroundColor: '#181815', color: '#F0EFEA' }} labelStyle={{ color: '#F0EFEA' }} />
                  <Line type="monotone" dataKey="Margen por hora" stroke="#3FB6D4" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Seccion>

          <Seccion titulo="Detalle mensual">
            <Tabla
              cabeceras={[
                { texto: 'Mes' }, { texto: 'Trabajos', alineado: 'der' },
                { texto: 'Facturación', alineado: 'der' }, { texto: 'Margen bruto', alineado: 'der' },
                { texto: 'Margen %', alineado: 'der' }, { texto: 'Ticket', alineado: 'der' },
                { texto: 'Horas', alineado: 'der' }, { texto: 'Margen/hora', alineado: 'der' },
                { texto: 'Publicidad', alineado: 'der' }, { texto: 'Gastos op.', alineado: 'der' },
                { texto: 'Resultado', alineado: 'der' },
              ]}
            >
              {[...serie].reverse().map((r) => (
                <Fila key={r.mes}>
                  <Celda className="whitespace-nowrap">{nombreMes(r.mes)}</Celda>
                  <Celda der mono>{r.trabajos}</Celda>
                  <Celda der><Dinero v={r.facturacion} /></Celda>
                  <Celda der><Dinero v={r.margenBruto} /></Celda>
                  <Celda der><Porcentaje v={r.margenPct} /></Celda>
                  <Celda der><Dinero v={r.ticket} /></Celda>
                  <Celda der mono className="text-muted">{num(r.horas, 1)}</Celda>
                  <Celda der><Dinero v={r.margenPorHora} /></Celda>
                  <Celda der className="text-muted"><Dinero v={r.publicidad} /></Celda>
                  <Celda der className="text-muted"><Dinero v={r.gastosOperativos} /></Celda>
                  <Celda der className={`font-semibold ${r.resultado < 0 ? 'text-neg' : 'text-pos'}`}>
                    <Dinero v={r.resultado} />
                  </Celda>
                </Fila>
              ))}
            </Tabla>
          </Seccion>
        </>
      )}

      {data.historico.length > 0 && (
        <Seccion
          titulo="Mayo a julio 2026"
          nota="Reconstruido de MercadoPago y Meta antes de que existiera este sistema. Solo lectura."
        >
          <Tabla
            cabeceras={[
              { texto: 'Concepto' }, { texto: 'Mayo', alineado: 'der' },
              { texto: 'Junio', alineado: 'der' }, { texto: 'Julio', alineado: 'der' },
            ]}
          >
            {data.historico.map((h) => (
              <Fila key={h.concepto}>
                <Celda>{h.concepto}</Celda>
                {[h.mayo_2026, h.junio_2026, h.julio_2026].map((v, i) => (
                  <Celda key={i} der mono className={typeof v === 'number' ? '' : 'text-muted'}>
                    {typeof v === 'number'
                      ? (h.concepto.toLowerCase().includes('operaciones') ||
                         h.concepto.toLowerCase().includes('clientes')
                          ? num(v) : money(v))
                      : (v || '—')}
                  </Celda>
                ))}
              </Fila>
            ))}
          </Tabla>
        </Seccion>
      )}
    </>
  );
}
