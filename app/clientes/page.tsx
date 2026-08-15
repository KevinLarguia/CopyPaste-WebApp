'use client';

import { useMemo, useState } from 'react';
import { useDatos } from '@/lib/data-context';
import { api, ErrorApi } from '@/lib/api';
import { fichaClientes, type FilaCliente } from '@/lib/calc';
import { fechaCorta, hoy, money, num } from '@/lib/format';
import {
  Aviso, Boton, Cargando, Celda, Dinero, Fila, Input, Select, Tabla, Titulo, Vacio,
} from '@/components/ui';

const ESTADOS: FilaCliente['estado'][] = [
  'Escribirle esta semana', 'Hace más de 2 meses', 'Pronto', 'Está activo', 'Sin compras',
];

const colorEstado = (e: FilaCliente['estado']) =>
  e === 'Hace más de 2 meses' || e === 'Escribirle esta semana'
    ? 'text-neg'
    : e === 'Pronto' ? 'text-spot' : 'text-muted';

export default function Clientes() {
  const { data, cargando, recargar } = useDatos();
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState('');
  const [soloDudosos, setSoloDudosos] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fichas = useMemo(() => fichaClientes(data, hoy()), [data]);

  const filtrados = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return fichas
      .filter((c) => !soloDudosos || c.nombre_dudoso)
      .filter((c) => !estado || c.estado === estado)
      .filter((c) => !q || c.nombre.toLowerCase().includes(q) || (c.telefono || '').includes(q))
      .sort((a, b) => b.facturacion - a.facturacion);
  }, [fichas, texto, estado, soloDudosos]);

  const dudosos = fichas.filter((c) => c.nombre_dudoso).length;

  async function guardarNombre(c: FilaCliente) {
    const nombre = nuevoNombre.trim();
    if (!nombre) return;
    setError(null);
    try {
      await api.editar('clientes', {
        id: c.id,
        nombre,
        nombre_normalizado: nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),
        telefono: c.telefono,
        hist_compras: c.hist_compras,
        hist_facturacion: c.hist_facturacion,
        hist_ultima_compra: c.hist_ultima_compra,
        nombre_dudoso: false,
      });
      setEditando(null);
      await recargar(true);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo guardar el nombre.');
    }
  }

  return (
    <>
      <Titulo>Clientes</Titulo>

      {error && <div className="mb-4"><Aviso tono="error">{error}</Aviso></div>}

      {dudosos > 0 && !soloDudosos && (
        <div className="mb-5">
          <Aviso tono="alerta">
            Hay <strong>{dudosos}</strong> clientes con el nombre cortado por MercadoPago
            (“Danila Eluney Milena M”). Mientras estén así, no se los puede encontrar bien al
            cargar una venta.{' '}
            <button onClick={() => setSoloDudosos(true)} className="underline underline-offset-2">
              Verlos
            </button>
          </Aviso>
        </div>
      )}

      <div className="mb-5 grid gap-2 sm:grid-cols-3">
        <Input placeholder="Buscar por nombre o teléfono" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <Select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado">
          <option value="">Todos</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
        </Select>
        <label className="flex h-11 items-center gap-2 border border-rule bg-paper px-3 text-sm">
          <input type="checkbox" checked={soloDudosos} onChange={(e) => setSoloDudosos(e.target.checked)} />
          Solo nombres incompletos
        </label>
      </div>

      <p className="mb-3 text-sm text-muted">
        <span className="cifra font-mono text-ink">{num(filtrados.length)}</span> clientes ·{' '}
        <span className="cifra font-mono text-ink">
          {money(filtrados.reduce((a, c) => a + c.facturacion, 0))}
        </span>{' '}
        facturados históricamente
      </p>

      {cargando && data.clientes.length === 0 ? (
        <Cargando que="los clientes" />
      ) : filtrados.length === 0 ? (
        <Vacio>No hay clientes que coincidan con el filtro.</Vacio>
      ) : (
        <Tabla
          cabeceras={[
            { texto: 'Cliente' }, { texto: 'Teléfono' },
            { texto: 'Compras', alineado: 'der' }, { texto: 'Facturación', alineado: 'der' },
            { texto: 'Ticket', alineado: 'der' }, { texto: 'Última' },
            { texto: 'Días', alineado: 'der' }, { texto: 'Estado' },
          ]}
        >
          {filtrados.slice(0, 300).map((c) => (
            <Fila key={c.id}>
              <Celda>
                {editando === c.id ? (
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      className="h-9"
                    />
                    <Boton onClick={() => guardarNombre(c)} className="h-9 shrink-0">Guardar</Boton>
                    <Boton onClick={() => setEditando(null)} className="h-9 shrink-0">✕</Boton>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditando(c.id); setNuevoNombre(c.nombre); }}
                    className="text-left hover:text-spot"
                    title="Tocá para corregir el nombre"
                  >
                    {c.nombre}
                    {c.nombre_dudoso && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-spot">incompleto</span>
                    )}
                  </button>
                )}
              </Celda>
              <Celda mono className="whitespace-nowrap text-muted">{c.telefono || '—'}</Celda>
              <Celda der mono>{c.compras}</Celda>
              <Celda der><Dinero v={c.facturacion} /></Celda>
              <Celda der><Dinero v={c.ticket} /></Celda>
              <Celda mono className="whitespace-nowrap text-muted">{fechaCorta(c.ultimaCompra)}</Celda>
              <Celda der mono>{c.diasSinComprar ?? '—'}</Celda>
              <Celda className={`whitespace-nowrap text-xs ${colorEstado(c.estado)}`}>{c.estado}</Celda>
            </Fila>
          ))}
        </Tabla>
      )}

      {filtrados.length > 300 && (
        <p className="mt-3 text-xs text-muted">
          Se muestran los primeros 300 por facturación. Usá el buscador para el resto.
        </p>
      )}
    </>
  );
}
