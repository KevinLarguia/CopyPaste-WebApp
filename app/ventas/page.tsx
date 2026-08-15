'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useDatos } from '@/lib/data-context';
import { api, ErrorApi } from '@/lib/api';
import { claveMes, margenDe, minutosDe } from '@/lib/calc';
import { fechaCorta, money, num } from '@/lib/format';
import {
  Aviso, Boton, Cargando, Celda, Dinero, Fila, Input, Select, Tabla, Titulo, Vacio, claseInput,
} from '@/components/ui';

export default function ListadoVentas() {
  const { data, cargando, recargar, opciones } = useDatos();
  const [texto, setTexto] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [producto, setProducto] = useState('');
  const [canal, setCanal] = useState('');
  const [borrando, setBorrando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtradas = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return data.ventas
      .filter((v) => (!desde || v.fecha >= desde) && (!hasta || v.fecha <= hasta))
      .filter((v) => !producto || v.producto === producto)
      .filter((v) => !canal || v.canal === canal)
      .filter((v) =>
        !q ||
        v.cliente_nombre.toLowerCase().includes(q) ||
        v.producto.toLowerCase().includes(q) ||
        (v.notas || '').toLowerCase().includes(q))
      .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  }, [data.ventas, texto, desde, hasta, producto, canal]);

  const totales = useMemo(() => ({
    facturacion: filtradas.reduce((a, v) => a + (v.precio || 0), 0),
    margen: filtradas.reduce((a, v) => a + margenDe(v), 0),
    minutos: filtradas.reduce((a, v) => a + minutosDe(v), 0),
  }), [filtradas]);

  async function borrar(id: string, nombre: string) {
    if (!confirm(`¿Borrar la venta de ${nombre}? Se puede recuperar desde la planilla.`)) return;
    setBorrando(id);
    setError(null);
    try {
      await api.borrar('ventas', { id });
      await recargar(true);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo borrar.');
    } finally {
      setBorrando(null);
    }
  }

  return (
    <>
      <Titulo
        accion={
          <Link href="/ventas/nueva/">
            <Boton tipo="primario">Cargar venta</Boton>
          </Link>
        }
      >
        Ventas
      </Titulo>

      {error && <div className="mb-4"><Aviso tono="error">{error}</Aviso></div>}

      <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          placeholder="Buscar cliente, producto o nota"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="lg:col-span-2"
        />
        <input type="date" className={claseInput} value={desde} onChange={(e) => setDesde(e.target.value)} aria-label="Desde" />
        <input type="date" className={claseInput} value={hasta} onChange={(e) => setHasta(e.target.value)} aria-label="Hasta" />
        <div className="grid grid-cols-2 gap-2">
          <Select value={producto} onChange={(e) => setProducto(e.target.value)} aria-label="Producto">
            <option value="">Producto</option>
            {opciones('producto').map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Select value={canal} onChange={(e) => setCanal(e.target.value)} aria-label="Canal">
            <option value="">Canal</option>
            {opciones('canal').map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
      </div>

      <p className="mb-3 text-sm text-muted">
        <span className="cifra font-mono text-ink">{filtradas.length}</span> trabajos ·{' '}
        <span className="cifra font-mono text-ink">{money(totales.facturacion)}</span> facturados ·{' '}
        <span className="cifra font-mono text-ink">{money(totales.margen)}</span> de margen ·{' '}
        <span className="cifra font-mono text-ink">{num(totales.minutos / 60, 1)}</span> h
      </p>

      {cargando && data.ventas.length === 0 ? (
        <Cargando que="las ventas" />
      ) : filtradas.length === 0 ? (
        <Vacio>No hay ventas que coincidan con el filtro.</Vacio>
      ) : (
        <Tabla
          cabeceras={[
            { texto: 'Fecha' }, { texto: 'Cliente' }, { texto: 'Producto' },
            { texto: 'Precio', alineado: 'der' }, { texto: 'Envío', alineado: 'der' },
            { texto: 'Margen', alineado: 'der' }, { texto: 'Min', alineado: 'der' },
            { texto: '', alineado: 'der' },
          ]}
        >
          {filtradas.map((v) => (
            <Fila key={v.id}>
              <Celda mono className="whitespace-nowrap text-muted">{fechaCorta(v.fecha)}</Celda>
              <Celda>
                {v.cliente_nombre}
                {!v.cliente_id && (
                  <span className="ml-2 text-[10px] uppercase tracking-wide text-muted">sin vincular</span>
                )}
              </Celda>
              <Celda>
                {v.producto}
                {v.notas && <div className="text-xs text-muted">{v.notas}</div>}
              </Celda>
              <Celda der><Dinero v={v.precio} /></Celda>
              <Celda der className="text-muted"><Dinero v={v.envio_cobrado} /></Celda>
              <Celda der><Dinero v={margenDe(v)} /></Celda>
              <Celda der mono className="text-muted">{minutosDe(v) || '—'}</Celda>
              <Celda der>
                <div className="flex justify-end gap-3 whitespace-nowrap text-xs">
                  <Link href={`/ventas/nueva/?id=${v.id}`} className="underline underline-offset-2 hover:text-spot">
                    Editar
                  </Link>
                  <button
                    onClick={() => borrar(v.id, v.cliente_nombre)}
                    disabled={borrando === v.id}
                    className="text-neg underline underline-offset-2 disabled:opacity-50"
                  >
                    {borrando === v.id ? 'Borrando…' : 'Borrar'}
                  </button>
                </div>
              </Celda>
            </Fila>
          ))}
        </Tabla>
      )}
    </>
  );
}
