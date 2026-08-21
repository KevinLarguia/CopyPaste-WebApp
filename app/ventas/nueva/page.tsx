'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDatos } from '@/lib/data-context';
import { api, ErrorApi } from '@/lib/api';
import { evaluarExpresion, esExpresion, hoy, money } from '@/lib/format';
import {
  aplicarPlantilla, calcularCostoMateriales, clientePorTelefono,
  nombreProvisorioDeTelefono, ultimoPrecioProducto,
} from '@/lib/calc';
import {
  Aviso, Boton, Campo, Input, Select, Titulo, claseInput,
} from '@/components/ui';
import ClienteAutocomplete from '@/components/ClienteAutocomplete';
import { MAQUINAS } from '@/lib/constants';

const VACIO = {
  fecha: hoy(), cliente_id: '', cliente_nombre: '', producto: '', cantidad: '1',
  precio: '', envio_cobrado: '0', costo_envio: '0', costo_materiales: '',
  min_impresion: '', min_corte: '', min_archivo: '', canal: '',
  notas: '', telefono: '', hojas: '', maquina: '', material: '', terminacion: '',
};

function Formulario() {
  const router = useRouter();
  const params = useSearchParams();
  const idEditar = params.get('id');
  const idRepetir = params.get('repetir');
  const { data, recargar, opciones } = useDatos();

  const [f, setF] = useState({ ...VACIO });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargado, setCargado] = useState(false);
  const [plantillaId, setPlantillaId] = useState('');
  const [plantillaTocada, setPlantillaTocada] = useState(false);
  const [editandoCosto, setEditandoCosto] = useState(false);
  const [precioEspecial, setPrecioEspecial] = useState(false);

  // Modo edición: se completa una vez, cuando llegan los datos.
  useEffect(() => {
    if (!idEditar || cargado) return;
    const v = data.ventas.find((x) => x.id === idEditar);
    if (!v) return;
    setF({
      fecha: v.fecha, cliente_id: v.cliente_id, cliente_nombre: v.cliente_nombre,
      producto: v.producto, cantidad: String(v.cantidad ?? ''), precio: String(v.precio ?? ''),
      envio_cobrado: String(v.envio_cobrado ?? '0'), costo_envio: String(v.costo_envio ?? '0'),
      costo_materiales: String(v.costo_materiales ?? ''),
      min_impresion: String(v.min_impresion || ''), min_corte: String(v.min_corte || ''),
      min_archivo: String(v.min_archivo || ''), canal: v.canal,
      notas: v.notas, telefono: v.telefono,
      hojas: String(v.hojas || ''), maquina: v.maquina || '', material: v.material || '',
      terminacion: v.terminacion || '',
    });
    setEditandoCosto(Boolean(v.costo_materiales_override));
    setPrecioEspecial(Boolean(v.precio_especial));
    setPlantillaTocada(true); // no recalcular sobre datos ya cargados
    setCargado(true);
  }, [idEditar, data.ventas, cargado]);

  // "Repetir última venta": precarga desde una venta pasada pero SIN idEditar,
  // así Guardar crea una venta nueva en vez de pisar la anterior.
  useEffect(() => {
    if (!idRepetir || idEditar || cargado) return;
    const v = data.ventas.find((x) => x.id === idRepetir);
    if (!v) return;
    setF({
      fecha: hoy(), cliente_id: v.cliente_id, cliente_nombre: v.cliente_nombre,
      producto: v.producto, cantidad: String(v.cantidad ?? ''), precio: String(v.precio ?? ''),
      envio_cobrado: '0', costo_envio: '0',
      costo_materiales: '',
      min_impresion: String(v.min_impresion || ''), min_corte: String(v.min_corte || ''),
      min_archivo: String(v.min_archivo || ''), canal: v.canal,
      notas: '', telefono: v.telefono,
      hojas: String(v.hojas || ''), maquina: v.maquina || '', material: v.material || '',
      terminacion: v.terminacion || '',
    });
    setCargado(true);
  }, [idRepetir, idEditar, data.ventas, cargado]);

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  // Elegir una plantilla precarga producto, máquina, material, terminación,
  // hojas y minutos según la cantidad. Mientras no se haya tocado nada de
  // eso a mano, cambiar la cantidad los vuelve a calcular todos juntos.
  useEffect(() => {
    if (!plantillaId || plantillaTocada) return;
    const pl = data.plantillas.find((p) => p.id === plantillaId);
    if (!pl) return;
    const r = aplicarPlantilla(pl, Number(f.cantidad) || 0);
    setF((p) => ({
      ...p,
      producto: pl.producto,
      maquina: pl.maquina,
      material: pl.material,
      terminacion: pl.terminacion,
      hojas: String(r.hojas),
      min_impresion: String(r.min_impresion),
      min_corte: String(r.min_corte),
      min_archivo: String(r.min_archivo),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantillaId, f.cantidad, plantillaTocada]);

  // Corregir a mano cualquiera de estos congela a todo el grupo: si el
  // trabajo se salió de lo normal, cambiar la cantidad después no debería
  // pisar la corrección.
  const tocar = (k: 'hojas' | 'min_impresion' | 'min_corte' | 'min_archivo', v: string) => {
    setPlantillaTocada(true);
    set(k, v);
  };

  // El teléfono es la clave del cliente: si ya es de alguien conocido, se
  // engancha esa venta a ese cliente y se sugiere el canal, sin pisar una
  // selección manual que ya se haya hecho por el autocomplete de nombre.
  useEffect(() => {
    if (!f.telefono) return;
    const conocido = clientePorTelefono(data.clientes, f.telefono);
    if (!conocido) return;
    setF((p) => ({
      ...p,
      cliente_id: p.cliente_id || conocido.id,
      cliente_nombre: p.cliente_nombre || conocido.nombre,
      canal: p.canal || 'Cliente que ya compró',
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.telefono, data.clientes]);

  // Sugerencia de precio: lo último que le cobraste a este cliente por este
  // producto. Si el campo está vacío lo precarga; si no, solo lo muestra.
  const precioSugerido = useMemo(
    () => ultimoPrecioProducto(data, f.cliente_id, f.producto),
    [data, f.cliente_id, f.producto],
  );
  useEffect(() => {
    if (precioSugerido !== null && !f.precio) set('precio', String(precioSugerido));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precioSugerido]);

  const materiales = useMemo(() => {
    const s = new Set(
      data.tarifas.filter((t) => t.tipo === 'papel' && t.activo !== false).map((t) => t.clave),
    );
    return Array.from(s).sort();
  }, [data.tarifas]);

  const terminaciones = useMemo(() => {
    const s = new Set(
      data.tarifas.filter((t) => t.tipo === 'terminacion' && t.activo !== false).map((t) => t.clave),
    );
    return Array.from(s).sort();
  }, [data.tarifas]);

  // Costo calculado con las tarifas vigentes a la fecha de la venta. Se
  // muestra de solo lectura salvo que el trabajo se haya salido de lo
  // normal y el usuario elija corregirlo a mano (ver `editandoCosto`).
  const costoCalculado = useMemo(
    () => calcularCostoMateriales(data.tarifas, {
      hojas: Number(f.hojas) || 0,
      cantidad: Number(f.cantidad) || 0,
      maquina: f.maquina,
      material: f.material,
      terminacion: f.terminacion,
      fecha: f.fecha,
    }),
    [data.tarifas, f.hojas, f.cantidad, f.maquina, f.material, f.terminacion, f.fecha],
  );

  // El campo de costo manual acepta cuentas: "15*127+200". Se guarda el
  // número resuelto y también la cuenta, para saber después de dónde salió.
  const costoResuelto = useMemo(() => evaluarExpresion(f.costo_materiales), [f.costo_materiales]);
  const costoInvalido = editandoCosto && f.costo_materiales.trim() !== '' && costoResuelto === null;
  const costoFinal = editandoCosto ? (costoResuelto || 0) : costoCalculado;

  const minutos =
    (Number(f.min_impresion) || 0) + (Number(f.min_corte) || 0) + (Number(f.min_archivo) || 0);
  const precio = Number(f.precio) || 0;
  const margen = precio - costoFinal;
  const margenPorHora = minutos ? margen / (minutos / 60) : null;

  async function guardar() {
    setError(null);
    const telefono = f.telefono.trim();
    if (!telefono) return setError('Falta el teléfono. Sin teléfono no se puede guardar la venta.');
    if (!f.producto) return setError('Elegí un producto.');
    if (!precio) return setError('Falta el precio cobrado.');
    if (costoInvalido) return setError('El costo de materiales no es un número ni una cuenta válida.');

    // Sin nombre todavía (llamó y solo dio el teléfono): se guarda un nombre
    // provisorio, marcado como dudoso, para corregirlo después en Clientes.
    const nombreDudosoNuevo = !f.cliente_id && !f.cliente_nombre.trim();
    const nombreFinal = f.cliente_nombre.trim() || nombreProvisorioDeTelefono(telefono);

    const payload = {
      ...(idEditar ? { id: idEditar } : {}),
      fecha: f.fecha,
      cliente_id: f.cliente_id,
      cliente_nombre: nombreFinal,
      producto: f.producto,
      cantidad: Number(f.cantidad) || 0,
      precio,
      envio_cobrado: Number(f.envio_cobrado) || 0,
      costo_envio: Number(f.costo_envio) || 0,
      costo_materiales: costoFinal,
      costo_materiales_override: editandoCosto,
      min_impresion: Number(f.min_impresion) || 0,
      min_corte: Number(f.min_corte) || 0,
      min_archivo: Number(f.min_archivo) || 0,
      canal: f.canal, notas: f.notas.trim(), telefono,
      hojas: Number(f.hojas) || 0,
      maquina: f.maquina,
      material: f.material,
      terminacion: f.terminacion,
      precio_especial: precioEspecial,
      completo: true,
    };

    setGuardando(true);
    try {
      // Cliente nuevo: se crea primero para que la venta quede vinculada.
      if (!payload.cliente_id) {
        const nuevo = await api.crear('clientes', {
          nombre: payload.cliente_nombre,
          nombre_normalizado: payload.cliente_nombre
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase(),
          telefono: payload.telefono,
          hist_compras: 0, hist_facturacion: 0, hist_ultima_compra: '', nombre_dudoso: nombreDudosoNuevo,
        });
        payload.cliente_id = nuevo.item.id;
      }

      if (idEditar) await api.editar('ventas', payload);
      else await api.crear('ventas', payload);

      await recargar(true);
      router.push('/ventas/');
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo guardar.');
      setGuardando(false);
    }
  }

  return (
    <>
      <Titulo>{idEditar ? 'Editar venta' : 'Cargar venta'}</Titulo>
      {error && <div className="mb-5"><Aviso tono="error">{error}</Aviso></div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Fecha">
          <input type="date" className={claseInput} value={f.fecha} onChange={(e) => set('fecha', e.target.value)} />
        </Campo>

        <Campo etiqueta="Teléfono" hint="Es la clave del cliente: sin teléfono no se guarda la venta.">
          <Input type="tel" value={f.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="+54 9 342 …" />
        </Campo>

        <Campo etiqueta="Cliente" hint="Si no sabés el nombre todavía, dejalo vacío y se guarda como pendiente de corregir.">
          <ClienteAutocomplete
            clientes={data.clientes}
            valor={{ cliente_id: f.cliente_id, cliente_nombre: f.cliente_nombre }}
            onChange={(v) => setF((p) => ({
              ...p,
              cliente_id: v.cliente_id,
              cliente_nombre: v.cliente_nombre,
              telefono: v.telefono || p.telefono,
            }))}
          />
        </Campo>

        <Campo etiqueta="Plantilla" hint="Precarga producto, máquina, material y minutos. Opcional.">
          <Select
            value={plantillaId}
            onChange={(e) => { setPlantillaId(e.target.value); setPlantillaTocada(false); }}
          >
            <option value="">Sin plantilla</option>
            {data.plantillas
              .filter((p) => p.activo !== false)
              .sort((a, b) => (a.orden || 0) - (b.orden || 0))
              .map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Select>
        </Campo>

        <Campo etiqueta="Producto o servicio">
          <Select value={f.producto} onChange={(e) => set('producto', e.target.value)}>
            <option value="">Elegí uno</option>
            {opciones('producto').map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </Campo>

        <Campo etiqueta="Cantidad">
          <Input type="number" inputMode="numeric" min="0" value={f.cantidad} onChange={(e) => set('cantidad', e.target.value)} />
        </Campo>

        <Campo
          etiqueta="Precio cobrado"
          hint={
            precioSugerido !== null
              ? `Última vez le cobraste ${money(precioSugerido)} por esto. Sin el envío.`
              : 'Sin el envío. Si lo sumás acá, la facturación queda inflada.'
          }
        >
          <Input type="number" inputMode="decimal" min="0" value={f.precio} onChange={(e) => set('precio', e.target.value)} placeholder="0" />
        </Campo>

        <Campo etiqueta="Envío cobrado" hint="Poné 0 si el cliente retiró en el local.">
          <Input type="number" inputMode="decimal" min="0" value={f.envio_cobrado} onChange={(e) => set('envio_cobrado', e.target.value)} />
        </Campo>

        <Campo etiqueta="Costo de envío" hint="Lo que le pagás al cadete. 0 si no hubo envío o lo llevaste vos.">
          <Input type="number" inputMode="decimal" min="0" value={f.costo_envio} onChange={(e) => set('costo_envio', e.target.value)} />
        </Campo>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={precioEspecial}
          onChange={(e) => setPrecioEspecial(e.target.checked)}
        />
        Precio especial (amigo, canje, promoción, descuento a recurrente) — no cuenta para los análisis de rentabilidad
      </label>

      <div className="regla-doble mb-4 mt-8 pb-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Materiales</h2>
        <p className="mt-1 text-xs text-muted">
          Hojas físicas de papel, no lo que se le cobra al cliente. El costo sale solo de acá.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Campo etiqueta="Hojas">
          <Input type="number" inputMode="numeric" min="0" value={f.hojas} onChange={(e) => tocar('hojas', e.target.value)} placeholder="0" />
        </Campo>

        <Campo etiqueta="Máquina">
          <Select value={f.maquina} onChange={(e) => set('maquina', e.target.value)}>
            <option value="">Elegí una</option>
            {MAQUINAS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Campo>

        <Campo etiqueta="Material">
          <Select value={f.material} onChange={(e) => set('material', e.target.value)}>
            <option value="">Elegí uno</option>
            {materiales.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Campo>

        <Campo etiqueta="Terminación" hint="Opcional.">
          <Select value={f.terminacion} onChange={(e) => set('terminacion', e.target.value)}>
            <option value="">Ninguna</option>
            {terminaciones.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Campo>

        <Campo
          etiqueta="Costo de materiales"
          ancho="full"
          hint={
            editandoCosto
              ? (esExpresion(f.costo_materiales) && costoResuelto !== null ? `= ${money(costoResuelto)}` : 'Podés escribir la cuenta: 15*127+200')
              : 'Calculado con las tarifas vigentes a la fecha de la venta.'
          }
          error={costoInvalido ? 'Solo números y los signos + − × ÷' : undefined}
        >
          <div className="flex items-center gap-3">
            {editandoCosto ? (
              <Input
                value={f.costo_materiales}
                onChange={(e) => set('costo_materiales', e.target.value)}
                placeholder="0"
                inputMode="text"
                className="flex-1"
              />
            ) : (
              <div className={`${claseInput} flex flex-1 items-center bg-surface text-muted`}>
                {money(costoCalculado)}
              </div>
            )}
            <button
              type="button"
              onClick={() => setEditandoCosto((v) => !v)}
              className="shrink-0 whitespace-nowrap text-xs text-muted underline underline-offset-2 hover:text-ink"
            >
              {editandoCosto ? 'Usar el calculado' : 'Editar manualmente'}
            </button>
          </div>
        </Campo>
      </div>

      <div className="regla-doble mb-4 mt-8 pb-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Minutos</h2>
        <p className="mt-1 text-xs text-muted">
          A ojo alcanza. Son la única forma de saber cuánto deja cada hora de trabajo.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo etiqueta="Impresión">
          <Input type="number" inputMode="numeric" min="0" value={f.min_impresion} onChange={(e) => tocar('min_impresion', e.target.value)} placeholder="0" />
        </Campo>
        <Campo etiqueta="Corte y terminación">
          <Input type="number" inputMode="numeric" min="0" value={f.min_corte} onChange={(e) => tocar('min_corte', e.target.value)} placeholder="0" />
        </Campo>
        <Campo etiqueta="Archivo y atención">
          <Input type="number" inputMode="numeric" min="0" value={f.min_archivo} onChange={(e) => tocar('min_archivo', e.target.value)} placeholder="0" />
        </Campo>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Canal">
          <Select value={f.canal} onChange={(e) => set('canal', e.target.value)}>
            <option value="">Elegí uno</option>
            {opciones('canal').map((x) => <option key={x} value={x}>{x}</option>)}
          </Select>
        </Campo>
        <Campo etiqueta="Notas" ancho="full">
          <Input value={f.notas} onChange={(e) => set('notas', e.target.value)} placeholder="Gramaje, detalles del trabajo…" />
        </Campo>
      </div>

      {precio > 0 && (
        <div className="marca mt-8 border border-rule bg-paper p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-[11px] uppercase tracking-[0.1em] text-muted">Margen</div>
              <div className="cifra mt-1 font-mono text-lg font-semibold">{money(margen)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.1em] text-muted">Minutos</div>
              <div className="cifra mt-1 font-mono text-lg font-semibold">{minutos || '—'}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.1em] text-muted">Margen por hora</div>
              <div className="cifra mt-1 font-mono text-lg font-semibold">
                {margenPorHora === null ? '—' : money(margenPorHora)}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="sticky bottom-0 mt-8 flex gap-3 border-t border-rule bg-paper py-4">
        <Boton tipo="primario" onClick={guardar} disabled={guardando} className="flex-1 sm:flex-none sm:px-8">
          {guardando ? 'Guardando…' : idEditar ? 'Guardar cambios' : 'Guardar venta'}
        </Boton>
        <Boton onClick={() => router.push('/ventas/')}>Cancelar</Boton>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-muted">Abriendo el formulario…</p>}>
      <Formulario />
    </Suspense>
  );
}
