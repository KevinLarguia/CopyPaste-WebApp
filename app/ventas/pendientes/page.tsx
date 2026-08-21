'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useDatos } from '@/lib/data-context';
import { fechaCorta } from '@/lib/format';
import {
  Boton, Cargando, Celda, Dinero, Fila, Tabla, Titulo, Vacio,
} from '@/components/ui';

// Ventas cargadas desde "Cargar rápido" (completo: false). Se revisan todas
// juntas acá al cerrar, en vez de completar cada una en medio de la producción.
export default function Pendientes() {
  const { data, cargando } = useDatos();

  const pendientes = useMemo(
    () => data.ventas
      .filter((v) => v.completo === false)
      .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0)),
    [data.ventas],
  );

  return (
    <>
      <Titulo
        subtitulo="Ventas cargadas rápido que todavía les falta algún dato."
        accion={
          <Link href="/ventas/rapida/">
            <Boton tipo="primario">Cargar rápido</Boton>
          </Link>
        }
      >
        Pendientes de completar
      </Titulo>

      {cargando && data.ventas.length === 0 ? (
        <Cargando que="las ventas pendientes" />
      ) : pendientes.length === 0 ? (
        <Vacio>No hay ventas pendientes de completar.</Vacio>
      ) : (
        <Tabla
          cabeceras={[
            { texto: 'Fecha' }, { texto: 'Cliente' }, { texto: 'Producto' },
            { texto: 'Precio', alineado: 'der' }, { texto: '', alineado: 'der' },
          ]}
        >
          {pendientes.map((v) => (
            <Fila key={v.id}>
              <Celda mono className="whitespace-nowrap text-muted">{fechaCorta(v.fecha)}</Celda>
              <Celda>{v.cliente_nombre}</Celda>
              <Celda>{v.producto}</Celda>
              <Celda der><Dinero v={v.precio} /></Celda>
              <Celda der>
                <Link href={`/ventas/nueva/?id=${v.id}`} className="text-xs underline underline-offset-2 hover:text-spot">
                  Completar
                </Link>
              </Celda>
            </Fila>
          ))}
        </Tabla>
      )}
    </>
  );
}
