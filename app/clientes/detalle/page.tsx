'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDatos } from '@/lib/data-context';
import { fichaClientes, ultimaVentaDeCliente } from '@/lib/calc';
import { fechaCorta, hoy, money } from '@/lib/format';
import {
  Aviso, Boton, Celda, Dinero, Fila, Kpi, Tabla, Titulo, Vacio,
} from '@/components/ui';

// Ficha de un cliente. No es ruta dinámica (`?id=`) a propósito: la app
// exporta estático, sin servidor Next en runtime, así que no hay forma de
// pre-generar `/clientes/[id]` para clientes que viven en la planilla.
function Ficha() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id');
  const { data, cargando } = useDatos();

  const cliente = useMemo(
    () => fichaClientes(data, hoy()).find((c) => c.id === id),
    [data, id],
  );

  const ventas = useMemo(
    () => data.ventas
      .filter((v) => v.cliente_id === id)
      .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0)),
    [data.ventas, id],
  );

  if (cargando && !cliente) return <p className="py-10 text-center text-sm text-muted">Buscando…</p>;
  if (!cliente) return <Vacio>No encontramos ese cliente.</Vacio>;

  const ultima = ultimaVentaDeCliente(data, cliente.id);

  return (
    <>
      <Titulo
        subtitulo={cliente.telefono || 'Sin teléfono cargado'}
        accion={
          ultima && (
            <Link href={`/ventas/nueva/?repetir=${ultima.id}`}>
              <Boton tipo="primario">Repetir última venta</Boton>
            </Link>
          )
        }
      >
        {cliente.nombre}
      </Titulo>

      {cliente.nombre_dudoso && (
        <div className="mb-5">
          <Aviso tono="alerta">
            El nombre de este cliente vino incompleto. Corregilo desde{' '}
            <Link href="/clientes/" className="underline underline-offset-2">Clientes</Link>.
          </Aviso>
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiqueta="Compras" valor={String(cliente.compras)} />
        <Kpi etiqueta="Facturación histórica" valor={money(cliente.facturacion)} />
        <Kpi etiqueta="Ticket promedio" valor={money(cliente.ticket)} />
        <Kpi etiqueta="Estado" valor={cliente.estado} />
      </div>

      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        Historial de ventas
      </h2>
      <Tabla
        cabeceras={[
          { texto: 'Fecha' }, { texto: 'Producto' }, { texto: 'Precio', alineado: 'der' },
        ]}
        vacio="Todavía no tiene ventas cargadas en el sistema."
      >
        {ventas.map((v) => (
          <Fila key={v.id}>
            <Celda mono className="whitespace-nowrap text-muted">{fechaCorta(v.fecha)}</Celda>
            <Celda>{v.producto}</Celda>
            <Celda der><Dinero v={v.precio} /></Celda>
          </Fila>
        ))}
      </Tabla>

      <div className="mt-8">
        <Boton onClick={() => router.push('/clientes/')}>Volver</Boton>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-muted">Buscando…</p>}>
      <Ficha />
    </Suspense>
  );
}
