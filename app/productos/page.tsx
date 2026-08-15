'use client';

import { useMemo, useState } from 'react';
import { useDatos } from '@/lib/data-context';
import { mesesConDatos, porProducto } from '@/lib/calc';
import { money, nombreMes, num, pct } from '@/lib/format';
import { Aviso, Celda, Dinero, Fila, Porcentaje, Seccion, Tabla, Titulo, Vacio } from '@/components/ui';
import MesSelector from '@/components/MesSelector';

export default function PorProducto() {
  const { data } = useDatos();
  const meses = useMemo(() => mesesConDatos(data), [data]);
  const [mes, setMes] = useState<number | null>(null);
  const mesActivo = mes ?? meses[0] ?? 0;
  const filas = useMemo(() => porProducto(data, mesActivo), [data, mesActivo]);

  const total = filas.reduce(
    (a, f) => ({
      trabajos: a.trabajos + f.trabajos,
      facturacion: a.facturacion + f.facturacion,
      costo: a.costo + f.costo,
      margen: a.margen + f.margen,
      horas: a.horas + f.horas,
    }),
    { trabajos: 0, facturacion: 0, costo: 0, margen: 0, horas: 0 },
  );

  const mejor = filas.find((f) => f.margenPorHora !== null);
  const masFactura = [...filas].sort((a, b) => b.facturacion - a.facturacion)[0];

  return (
    <>
      <Titulo accion={<MesSelector meses={meses} valor={mesActivo} onChange={setMes} />}>
        Por producto
      </Titulo>

      {filas.length === 0 ? (
        <Vacio>No hay ventas cargadas en {nombreMes(mesActivo)}.</Vacio>
      ) : (
        <>
          {mejor && masFactura && mejor.producto !== masFactura.producto && (
            <div className="mb-6">
              <Aviso tono="alerta">
                <strong>{masFactura.producto}</strong> es lo que más factura, pero{' '}
                <strong>{mejor.producto}</strong> deja {money(mejor.margenPorHora)} por hora
                contra {money(masFactura.margenPorHora)}. Casi nunca son el mismo producto.
              </Aviso>
            </div>
          )}

          <Seccion titulo="Ordenado por margen por hora" nota="La columna que decide qué empujar.">
            <Tabla
              cabeceras={[
                { texto: 'Producto' }, { texto: 'Trabajos', alineado: 'der' },
                { texto: 'Facturación', alineado: 'der' }, { texto: '% del total', alineado: 'der' },
                { texto: 'Costo', alineado: 'der' }, { texto: 'Margen', alineado: 'der' },
                { texto: 'Margen %', alineado: 'der' }, { texto: 'Ticket', alineado: 'der' },
                { texto: 'Horas', alineado: 'der' }, { texto: 'Margen/hora', alineado: 'der' },
              ]}
            >
              {filas.map((f) => (
                <Fila key={f.producto}>
                  <Celda>{f.producto}</Celda>
                  <Celda der mono>{f.trabajos}</Celda>
                  <Celda der><Dinero v={f.facturacion} /></Celda>
                  <Celda der className="text-muted"><Porcentaje v={f.porcentaje} /></Celda>
                  <Celda der className="text-muted"><Dinero v={f.costo} /></Celda>
                  <Celda der><Dinero v={f.margen} /></Celda>
                  <Celda der><Porcentaje v={f.margenPct} /></Celda>
                  <Celda der><Dinero v={f.ticket} /></Celda>
                  <Celda der mono className="text-muted">{num(f.horas, 1)}</Celda>
                  <Celda der className="font-semibold"><Dinero v={f.margenPorHora} /></Celda>
                </Fila>
              ))}
              <Fila>
                <Celda className="font-semibold">Total</Celda>
                <Celda der mono className="font-semibold">{total.trabajos}</Celda>
                <Celda der className="font-semibold"><Dinero v={total.facturacion} /></Celda>
                <Celda der>—</Celda>
                <Celda der className="font-semibold"><Dinero v={total.costo} /></Celda>
                <Celda der className="font-semibold"><Dinero v={total.margen} /></Celda>
                <Celda der className="font-semibold">
                  {total.facturacion ? pct(total.margen / total.facturacion) : '—'}
                </Celda>
                <Celda der className="font-semibold">
                  {total.trabajos ? money(total.facturacion / total.trabajos) : '—'}
                </Celda>
                <Celda der mono className="font-semibold">{num(total.horas, 1)}</Celda>
                <Celda der className="font-semibold">
                  {total.horas ? money(total.margen / total.horas) : '—'}
                </Celda>
              </Fila>
            </Tabla>
          </Seccion>
        </>
      )}
    </>
  );
}
