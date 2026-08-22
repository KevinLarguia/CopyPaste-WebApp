'use client';

import { useMemo, useState } from 'react';
import { useDatos } from '@/lib/data-context';
import { api, ErrorApi } from '@/lib/api';
import type { ItemLista } from '@/lib/types';
import { Aviso, Boton, Input, Seccion, Titulo } from '@/components/ui';

const GRUPOS: { tipo: ItemLista['tipo']; titulo: string; nota: string }[] = [
  { tipo: 'producto', titulo: 'Productos y servicios', nota: 'Aparecen al cargar una venta y arman el reporte por producto.' },
  { tipo: 'canal', titulo: 'Canales', nota: 'De dónde llegó el cliente.' },
  { tipo: 'categoria_gasto', titulo: 'Categorías de gasto', nota: 'Ojo: “Envíos”, “Retiro de socios” y “Saldo publicitario (carga)” tienen tratamiento especial en el panel.' },
  { tipo: 'tipo_gasto', titulo: 'Fijo o variable', nota: 'Solo hacen falta estas dos.' },
];

export default function Config() {
  const { data, recargar } = useDatos();
  const [nuevos, setNuevos] = useState<Record<string, string>>({});
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const porTipo = useMemo(() => {
    const m = new Map<string, ItemLista[]>();
    data.listas.forEach((l) => m.set(l.tipo, [...(m.get(l.tipo) || []), l]));
    m.forEach((v) => v.sort((a, b) => (a.orden || 0) - (b.orden || 0)));
    return m;
  }, [data.listas]);

  async function agregar(tipo: ItemLista['tipo']) {
    const valor = (nuevos[tipo] || '').trim();
    if (!valor) return;
    const existentes = porTipo.get(tipo) || [];
    if (existentes.some((x) => x.valor.toLowerCase() === valor.toLowerCase())) {
      return setError(`“${valor}” ya está en la lista.`);
    }
    setTrabajando(tipo);
    setError(null);
    try {
      await api.crear('listas', {
        tipo, valor, orden: existentes.length + 1,
      });
      setNuevos((p) => ({ ...p, [tipo]: '' }));
      setAviso(`“${valor}” quedó disponible en los formularios.`);
      await recargar(true);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo agregar.');
    } finally {
      setTrabajando(null);
    }
  }

  async function quitar(item: ItemLista) {
    const usos = item.tipo === 'categoria_gasto'
      ? data.gastos.filter((g) => g.categoria === item.valor).length
      : item.tipo === 'producto'
        ? data.ventas.filter((v) => v.producto === item.valor).length
        : 0;
    const texto = usos
      ? `“${item.valor}” está usado en ${usos} registros. Si lo sacás, esos registros lo conservan pero deja de aparecer en los formularios. ¿Seguimos?`
      : `¿Sacar “${item.valor}” de la lista?`;
    if (!confirm(texto)) return;

    setTrabajando(item.valor);
    try {
      await api.borrar('listas', { valor: item.valor });
      await recargar(true);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo sacar.');
    } finally {
      setTrabajando(null);
    }
  }

  return (
    <>
      <Titulo>Listas</Titulo>
      <p className="mb-7 max-w-2xl text-sm leading-relaxed text-muted">
        Todo lo que aparece en los desplegables de los formularios sale de acá. Si falta un
        producto o una categoría, agregala y queda disponible al instante, sin tocar la planilla.
      </p>

      {error && <div className="mb-4"><Aviso tono="error">{error}</Aviso></div>}
      {aviso && <div className="mb-4"><Aviso tono="alerta">{aviso}</Aviso></div>}

      {GRUPOS.map((g) => (
        <Seccion key={g.tipo} titulo={g.titulo} nota={g.nota}>
          <ul className="mb-3 divide-y divide-rule border border-rule bg-paper">
            {(porTipo.get(g.tipo) || []).map((item) => (
              <li key={item.valor} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span>{item.valor}</span>
                <button
                  onClick={() => quitar(item)}
                  disabled={trabajando === item.valor}
                  className="shrink-0 text-xs text-muted underline underline-offset-2 hover:text-neg disabled:opacity-50"
                >
                  {trabajando === item.valor ? 'Sacando…' : 'Sacar'}
                </button>
              </li>
            ))}
            {(porTipo.get(g.tipo) || []).length === 0 && (
              <li className="px-3 py-4 text-sm text-muted">Todavía no hay nada en esta lista.</li>
            )}
          </ul>
          <div className="flex gap-2">
            <Input
              value={nuevos[g.tipo] || ''}
              onChange={(e) => setNuevos((p) => ({ ...p, [g.tipo]: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') agregar(g.tipo); }}
              placeholder={`Agregar a ${g.titulo.toLowerCase()}`}
            />
            <Boton onClick={() => agregar(g.tipo)} disabled={trabajando === g.tipo} className="shrink-0">
              {trabajando === g.tipo ? 'Agregando…' : 'Agregar'}
            </Boton>
          </div>
        </Seccion>
      ))}
    </>
  );
}
