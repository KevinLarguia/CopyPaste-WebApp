'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDatos } from '@/lib/data-context';
import { api, ErrorApi } from '@/lib/api';
import { evaluarExpresion, esExpresion, hoy, money } from '@/lib/format';
import { aplicarPlantilla, clientePorTelefono, ultimoPrecioProducto } from '@/lib/calc';
import {
  Aviso, Boton, Campo, Input, Select, Titulo, claseInput,
} from '@/components/ui';
import ClienteAutocomplete from '@/components/ClienteAutocomplete';

const VACIO = {
  fecha: hoy(), cliente_id: '', cliente_nombre: '', producto: '', cantidad: '1',
  precio: '', envio_cobrado: '0', costo_materiales: '', costo_expresion: '',
  min_impresion: '', min_corte: '', min_archivo: '', canal: '', etapa: '',
  notas: '', telefono: '',
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
  const [minutosTocados, setMinutosTocados] = useState(false);

  // Modo edición: se completa una vez, cuando llegan los datos.
  useEffect(() => {
    if (!idEditar || cargado) return;
    const v = data.ventas.find((x) => x.id === idEditar);
    if (!v) return;
    setF({
      fecha: v.fecha, cliente_id: v.cliente_id, cliente_nombre: v.cliente_nombre,
      producto: v.producto, cantidad: String(v.cantidad ?? ''), precio: String(v.precio ?? ''),
      envio_cobrado: String(v.envio_cobrado ?? '0'),
      costo_materiales: v.costo_expresion || String(v.costo_materiales ?? ''),
      costo_expresion: v.costo_expresion || '',
      min_impresion: String(v.min_impresion || ''), min_corte: String(v.min_corte || ''),
      min_archivo: String(v.min_archivo || ''), canal: v.canal, etapa: v.etapa,
      notas: v.notas, telefono: v.telefono,
    });
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
      envio_cobrado: '0',
      costo_materiales: '', costo_expresion: '',
      min_impresion: String(v.min_impresion || ''), min_corte: String(v.min_corte || ''),
      min_archivo: String(v.min_archivo || ''), canal: v.canal, etapa: '',
      notas: '', telefono: v.telefono,
    });
    setCargado(true);
  }, [idRepetir, idEditar, data.ventas, cargado]);

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  // Elegir una plantilla precarga producto + minutos según la cantidad.
  // Mientras haya una plantilla elegida y no se hayan tocado los minutos a
  // mano, cambiar la cantidad los vuelve a calcular.
  useEffect(() => {
    if (!plantillaId || minutosTocados) return;
    const pl = data.plantillas.find((p) => p.id === plantillaId);
    if (!pl) return;
    const r = aplicarPlantilla(pl, Number(f.cantidad) || 0);
    setF((p) => ({
      ...p,
      producto: pl.producto,
      min_impresion: String(r.min_impresion),
      min_corte: String(r.min_corte),
      min_archivo: String(r.min_archivo),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantillaId, f.cantidad, minutosTocados]);

  const setMinutos = (k: 'min_impresion' | 'min_corte' | 'min_archivo', v: string) => {
    setMinutosTocados(true);
    set(k, v);
  };

  // Canal por defecto si el teléfono ya pertenece a un cliente conocido.
  // Best-effort acá (match por dígitos); la Fase 2 lo vuelve autoritativo.
  useEffect(() => {
    if (f.canal || !f.telefono) return;
    if (clientePorTelefono(data.clientes, f.telefono)) set('canal', 'Cliente que ya compró');
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

  // El campo de costo acepta cuentas: "15*127+200". Se guarda el número
  // resuelto y también la cuenta, para saber después de dónde salió.
  const costoResuelto = useMemo(() => evaluarExpresion(f.costo_materiales), [f.costo_materiales]);
  const costoInvalido = f.costo_materiales.trim() !== '' && costoResuelto === null;

  const minutos =
    (Number(f.min_impresion) || 0) + (Number(f.min_corte) || 0) + (Number(f.min_archivo) || 0);
  const precio = Number(f.precio) || 0;
  const margen = precio - (costoResuelto || 0);
  const margenPorHora = minutos ? margen / (minutos / 60) : null;

  async function guardar() {
    setError(null);
    if (!f.cliente_nombre.trim()) return setError('Falta el cliente.');
    if (!f.producto) return setError('Elegí un producto.');
    if (!precio) return setError('Falta el precio cobrado.');
    if (costoInvalido) return setError('El costo de materiales no es un número ni una cuenta válida.');

    const payload = {
      ...(idEditar ? { id: idEditar } : {}),
      fecha: f.fecha,
      cliente_id: f.cliente_id,
      cliente_nombre: f.cliente_nombre.trim(),
      producto: f.producto,
      cantidad: Number(f.cantidad) || 0,
      precio,
      envio_cobrado: Number(f.envio_cobrado) || 0,
      costo_materiales: costoResuelto || 0,
      costo_expresion: esExpresion(f.costo_materiales) ? f.costo_materiales.trim() : '',
      min_impresion: Number(f.min_impresion) || 0,
      min_corte: Number(f.min_corte) || 0,
      min_archivo: Number(f.min_archivo) || 0,
      canal: f.canal, etapa: f.etapa, notas: f.notas.trim(), telefono: f.telefono.trim(),
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
          hist_compras: 0, hist_facturacion: 0, hist_ultima_compra: '', nombre_dudoso: false,
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

        <Campo etiqueta="Cliente">
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

        <Campo etiqueta="Plantilla" hint="Precarga producto y minutos. Opcional.">
          <Select
            value={plantillaId}
            onChange={(e) => { setPlantillaId(e.target.value); setMinutosTocados(false); }}
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

        <Campo
          etiqueta="Costo de materiales"
          hint={
            esExpresion(f.costo_materiales) && costoResuelto !== null
              ? `= ${money(costoResuelto)}`
              : 'Podés escribir la cuenta: 15*127+200'
          }
          error={costoInvalido ? 'Solo números y los signos + − × ÷' : undefined}
        >
          <Input value={f.costo_materiales} onChange={(e) => set('costo_materiales', e.target.value)} placeholder="0" inputMode="text" />
        </Campo>

        <Campo etiqueta="Teléfono" hint="Opcional. Sirve para la lista de recompra.">
          <Input type="tel" value={f.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="+54 9 342 …" />
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
          <Input type="number" inputMode="numeric" min="0" value={f.min_impresion} onChange={(e) => setMinutos('min_impresion', e.target.value)} placeholder="0" />
        </Campo>
        <Campo etiqueta="Corte y terminación">
          <Input type="number" inputMode="numeric" min="0" value={f.min_corte} onChange={(e) => setMinutos('min_corte', e.target.value)} placeholder="0" />
        </Campo>
        <Campo etiqueta="Archivo y atención">
          <Input type="number" inputMode="numeric" min="0" value={f.min_archivo} onChange={(e) => setMinutos('min_archivo', e.target.value)} placeholder="0" />
        </Campo>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Etapa que más demoró">
          <Select value={f.etapa} onChange={(e) => set('etapa', e.target.value)}>
            <option value="">Elegí una</option>
            {opciones('etapa').map((x) => <option key={x} value={x}>{x}</option>)}
          </Select>
        </Campo>
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
