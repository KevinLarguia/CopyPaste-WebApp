'use client';

import { useMemo, useRef, useState } from 'react';
import type { Cliente } from '@/lib/types';
import { claseInput } from './ui';

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

export type SeleccionCliente = { cliente_id: string; cliente_nombre: string; telefono?: string };

// El selector que arregla el problema de raíz: si el nombre sale de esta lista,
// la venta queda pegada al cliente y la recompra se mide sola.
export default function ClienteAutocomplete({
  clientes, valor, onChange,
}: {
  clientes: Cliente[];
  valor: SeleccionCliente;
  onChange: (v: SeleccionCliente) => void;
}) {
  const [texto, setTexto] = useState(valor.cliente_nombre || '');
  const [abierto, setAbierto] = useState(false);
  const cerrarTimeout = useRef<any>(null);

  const sugerencias = useMemo(() => {
    const q = normalizar(texto);
    if (!q) return [];
    return clientes
      .filter((c) => (c.nombre_normalizado || normalizar(c.nombre)).includes(q))
      .slice(0, 8);
  }, [texto, clientes]);

  const exacto = useMemo(
    () => clientes.find((c) => normalizar(c.nombre) === normalizar(texto)),
    [texto, clientes],
  );

  const elegir = (c: Cliente) => {
    setTexto(c.nombre);
    setAbierto(false);
    onChange({ cliente_id: c.id, cliente_nombre: c.nombre, telefono: c.telefono });
  };

  return (
    <div className="relative">
      <input
        className={claseInput}
        value={texto}
        placeholder="Empezá a escribir el nombre"
        autoComplete="off"
        onChange={(e) => {
          const v = e.target.value;
          setTexto(v);
          setAbierto(true);
          const m = clientes.find((c) => normalizar(c.nombre) === normalizar(v));
          onChange({ cliente_id: m?.id || '', cliente_nombre: v, telefono: m?.telefono });
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => { cerrarTimeout.current = setTimeout(() => setAbierto(false), 150); }}
      />

      {abierto && sugerencias.length > 0 && (
        <ul
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto border border-rule bg-paper shadow-sm"
          onMouseDown={() => clearTimeout(cerrarTimeout.current)}
        >
          {sugerencias.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => elegir(c)}
                className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-white/[0.05]"
              >
                <span>
                  {c.nombre}
                  {c.nombre_dudoso && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-muted">
                      nombre incompleto
                    </span>
                  )}
                </span>
                <span className="cifra shrink-0 font-mono text-xs text-muted">
                  {c.hist_compras || 0} compras
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {texto && !exacto && (
        <p className="mt-1 text-xs text-muted">
          No está en la lista: se va a crear como cliente nuevo. Si ya compró antes,
          buscalo con parte del nombre para no duplicarlo.
        </p>
      )}
      {exacto?.nombre_dudoso && (
        <p className="mt-1 text-xs text-spot">
          Este nombre vino incompleto de MercadoPago. Si sabés cómo se llama, corregilo en Clientes.
        </p>
      )}
    </div>
  );
}
