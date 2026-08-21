'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useDatos } from '@/lib/data-context';
import { fichaClientes, type FilaCliente } from '@/lib/calc';
import { hoy, waLink } from '@/lib/format';
import {
  Aviso, Cargando, Celda, Dinero, Fila, Input, Tabla, Titulo, Vacio,
} from '@/components/ui';

// Clientes ordenados por hace cuánto no compran y cuánto facturaron
// históricamente — la oportunidad comercial más barata del negocio, según
// la auditoría original: 164 clientes hace más de 60 días que no compran.
export default function Reactivar() {
  const { data, cargando } = useDatos();
  const [texto, setTexto] = useState('');

  const fichas = useMemo(() => fichaClientes(data, hoy()), [data]);

  const conHistorial = useMemo(
    () => fichas
      .filter((c) => c.diasSinComprar !== null)
      .sort((a, b) => {
        const d = (b.diasSinComprar ?? 0) - (a.diasSinComprar ?? 0);
        return d !== 0 ? d : b.facturacion - a.facturacion;
      }),
    [fichas],
  );

  const filtrados = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return !q ? conHistorial : conHistorial.filter((c) => c.nombre.toLowerCase().includes(q));
  }, [conHistorial, texto]);

  const masDe60 = conHistorial.filter((c) => (c.diasSinComprar ?? 0) > 60).length;
  const sinTelefono = conHistorial.filter((c) => !c.telefono).length;

  return (
    <>
      <Titulo subtitulo="Ordenados por hace cuánto no compran y cuánto facturaron.">
        Reactivar clientes
      </Titulo>

      <div className="mb-5 space-y-2">
        {masDe60 > 0 && (
          <Aviso tono="alerta">
            <strong>{masDe60}</strong> clientes hace más de 60 días que no compran.
          </Aviso>
        )}
        {sinTelefono > 0 && (
          <Aviso>
            <strong>{sinTelefono}</strong> de estos clientes no tienen teléfono cargado — no se
            los puede contactar por WhatsApp. Cargalo la próxima vez que compren.
          </Aviso>
        )}
      </div>

      <div className="mb-5">
        <Input placeholder="Buscar por nombre" value={texto} onChange={(e) => setTexto(e.target.value)} />
      </div>

      {cargando && data.clientes.length === 0 ? (
        <Cargando que="los clientes" />
      ) : filtrados.length === 0 ? (
        <Vacio>No hay clientes con historial de compras todavía.</Vacio>
      ) : (
        <Tabla
          cabeceras={[
            { texto: 'Cliente' }, { texto: 'Días sin comprar', alineado: 'der' },
            { texto: 'Facturación', alineado: 'der' }, { texto: 'Estado' }, { texto: '' },
          ]}
        >
          {filtrados.slice(0, 300).map((c: FilaCliente) => {
            const link = waLink(c.telefono);
            return (
              <Fila key={c.id}>
                <Celda>
                  <Link href={`/clientes/detalle/?id=${c.id}`} className="hover:text-spot">{c.nombre}</Link>
                </Celda>
                <Celda der mono>{c.diasSinComprar}</Celda>
                <Celda der><Dinero v={c.facturacion} /></Celda>
                <Celda className="whitespace-nowrap text-xs text-muted">{c.estado}</Celda>
                <Celda der>
                  {link ? (
                    <a href={link} target="_blank" rel="noreferrer" className="text-xs underline underline-offset-2 hover:text-spot">
                      WhatsApp
                    </a>
                  ) : (
                    <span className="text-xs text-muted">Sin teléfono</span>
                  )}
                </Celda>
              </Fila>
            );
          })}
        </Tabla>
      )}

      {filtrados.length > 300 && (
        <p className="mt-3 text-xs text-muted">
          Se muestran los primeros 300. Usá el buscador para el resto.
        </p>
      )}
    </>
  );
}
