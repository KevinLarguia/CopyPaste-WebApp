'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useDatos } from '@/lib/data-context';
import { api, ErrorApi } from '@/lib/api';
import { fechaCorta, money } from '@/lib/format';
import { NO_OPERATIVAS } from '@/lib/calc';
import {
  Aviso, Boton, Cargando, Celda, Dinero, Fila, Input, Select, Tabla, Titulo, Vacio, claseInput,
} from '@/components/ui';

export default function ListadoGastos() {
  const { data, cargando, recargar, opciones } = useDatos();
  const [texto, setTexto] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [categoria, setCategoria] = useState('');
  const [borrando, setBorrando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return data.gastos
      .filter((g) => (!desde || g.fecha >= desde) && (!hasta || g.fecha <= hasta))
      .filter((g) => !categoria || g.categoria === categoria)
      .filter((g) =>
        !q || g.detalle.toLowerCase().includes(q) || (g.proveedor || '').toLowerCase().includes(q))
      .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  }, [data.gastos, texto, desde, hasta, categoria]);

  const total = filtrados.reduce((a, g) => a + (g.monto || 0), 0);
  const operativo = filtrados
    .filter((g) => !NO_OPERATIVAS.includes(g.categoria))
    .reduce((a, g) => a + (g.monto || 0), 0);

  async function borrar(id: string, detalle: string) {
    if (!confirm(`¿Borrar el gasto "${detalle}"?`)) return;
    setBorrando(id);
    setError(null);
    try {
      await api.borrar('gastos', { id });
      await recargar(true);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo borrar.');
    } finally {
      setBorrando(null);
    }
  }

  return (
    <>
      <Titulo accion={<Link href="/gastos/nuevo/"><Boton tipo="primario">Cargar gasto</Boton></Link>}>
        Gastos
      </Titulo>

      {error && <div className="mb-4"><Aviso tono="error">{error}</Aviso></div>}

      <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Input placeholder="Buscar detalle o proveedor" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <input type="date" className={claseInput} value={desde} onChange={(e) => setDesde(e.target.value)} aria-label="Desde" />
        <input type="date" className={claseInput} value={hasta} onChange={(e) => setHasta(e.target.value)} aria-label="Hasta" />
        <Select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {opciones('categoria_gasto').map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>

      <p className="mb-3 text-sm text-muted">
        <span className="cifra font-mono text-ink">{money(total)}</span> en total ·{' '}
        <span className="cifra font-mono text-ink">{money(operativo)}</span> operativo
        <span className="text-muted"> (sin retiros ni envíos)</span>
      </p>

      {cargando && data.gastos.length === 0 ? (
        <Cargando que="los gastos" />
      ) : filtrados.length === 0 ? (
        <Vacio>No hay gastos que coincidan con el filtro.</Vacio>
      ) : (
        <Tabla
          cabeceras={[
            { texto: 'Fecha' }, { texto: 'Categoría' }, { texto: 'Detalle' },
            { texto: 'Proveedor' }, { texto: 'Monto', alineado: 'der' }, { texto: '', alineado: 'der' },
          ]}
        >
          {filtrados.map((g) => (
            <Fila key={g.id}>
              <Celda mono className="whitespace-nowrap text-muted">{fechaCorta(g.fecha)}</Celda>
              <Celda>
                {g.categoria}
                {NO_OPERATIVAS.includes(g.categoria) && (
                  <div className="text-[10px] uppercase tracking-wide text-muted">no operativo</div>
                )}
              </Celda>
              <Celda>{g.detalle || '—'}</Celda>
              <Celda className="text-muted">{g.proveedor || '—'}</Celda>
              <Celda der><Dinero v={g.monto} /></Celda>
              <Celda der>
                <div className="flex justify-end gap-3 whitespace-nowrap text-xs">
                  <Link href={`/gastos/nuevo/?id=${g.id}`} className="underline underline-offset-2 hover:text-spot">Editar</Link>
                  <button
                    onClick={() => borrar(g.id, g.detalle)}
                    disabled={borrando === g.id}
                    className="text-neg underline underline-offset-2 disabled:opacity-50"
                  >
                    {borrando === g.id ? 'Borrando…' : 'Borrar'}
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
