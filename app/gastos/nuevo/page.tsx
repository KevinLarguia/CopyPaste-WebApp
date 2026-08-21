'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDatos } from '@/lib/data-context';
import { api, ErrorApi } from '@/lib/api';
import { evaluarExpresion, esExpresion, hoy, money } from '@/lib/format';
import { CAT_PUBLICIDAD, NO_OPERATIVAS } from '@/lib/calc';
import { Aviso, Boton, Campo, Input, Select, Titulo, claseInput } from '@/components/ui';

const VACIO = {
  fecha: hoy(), categoria: '', detalle: '', monto: '', proveedor: '', tipo: 'Variable',
  estado: 'pagado', anuncio: '',
};

function Formulario() {
  const router = useRouter();
  const params = useSearchParams();
  const idEditar = params.get('id');
  const { data, recargar, opciones } = useDatos();

  const [f, setF] = useState({ ...VACIO });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    if (!idEditar || cargado) return;
    const g = data.gastos.find((x) => x.id === idEditar);
    if (!g) return;
    setF({
      fecha: g.fecha, categoria: g.categoria, detalle: g.detalle,
      monto: String(g.monto ?? ''), proveedor: g.proveedor, tipo: g.tipo || 'Variable',
      estado: g.estado || 'pagado', anuncio: g.anuncio || '',
    });
    setCargado(true);
  }, [idEditar, data.gastos, cargado]);

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const monto = evaluarExpresion(f.monto);
  const montoInvalido = f.monto.trim() !== '' && monto === null;

  async function guardar() {
    setError(null);
    if (!f.categoria) return setError('Elegí una categoría.');
    if (!monto) return setError('Falta el monto.');

    setGuardando(true);
    try {
      const payload = {
        ...(idEditar ? { id: idEditar } : {}),
        fecha: f.fecha, categoria: f.categoria, detalle: f.detalle.trim(),
        monto, proveedor: f.proveedor.trim(), tipo: f.tipo,
        estado: f.estado,
        anuncio: f.categoria === CAT_PUBLICIDAD ? f.anuncio.trim() : '',
      };
      if (idEditar) await api.editar('gastos', payload);
      else await api.crear('gastos', payload);
      await recargar(true);
      router.push('/gastos/');
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo guardar.');
      setGuardando(false);
    }
  }

  return (
    <>
      <Titulo>{idEditar ? 'Editar gasto' : 'Cargar gasto'}</Titulo>
      {error && <div className="mb-5"><Aviso tono="error">{error}</Aviso></div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Fecha">
          <input type="date" className={claseInput} value={f.fecha} onChange={(e) => set('fecha', e.target.value)} />
        </Campo>

        <Campo etiqueta="Categoría">
          <Select value={f.categoria} onChange={(e) => set('categoria', e.target.value)}>
            <option value="">Elegí una</option>
            {opciones('categoria_gasto').map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Campo>

        <Campo
          etiqueta="Monto"
          hint={esExpresion(f.monto) && monto !== null ? `= ${money(monto)}` : 'Podés escribir la cuenta: 42000+10200'}
          error={montoInvalido ? 'Solo números y los signos + − × ÷' : undefined}
        >
          <Input value={f.monto} onChange={(e) => set('monto', e.target.value)} placeholder="0" inputMode="text" />
        </Campo>

        <Campo etiqueta="Fijo o variable">
          <Select value={f.tipo} onChange={(e) => set('tipo', e.target.value)}>
            {opciones('tipo_gasto').map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Campo>

        <Campo etiqueta="Estado" hint="Solo un gasto pagado resta del resultado del mes.">
          <Select value={f.estado} onChange={(e) => set('estado', e.target.value)}>
            <option value="pedido">Pedido</option>
            <option value="recibido">Recibido</option>
            <option value="pagado">Pagado</option>
          </Select>
        </Campo>

        <Campo etiqueta="Detalle" ancho="full">
          <Input value={f.detalle} onChange={(e) => set('detalle', e.target.value)} placeholder="Resma A4 x5" />
        </Campo>

        <Campo etiqueta="Proveedor o medio de pago" ancho="full">
          <Input value={f.proveedor} onChange={(e) => set('proveedor', e.target.value)} placeholder="Visual Insumos" />
        </Campo>

        {f.categoria === CAT_PUBLICIDAD && (
          <Campo etiqueta="Anuncio" ancho="full" hint="Qué anuncio o campaña consumió este gasto.">
            <Input value={f.anuncio} onChange={(e) => set('anuncio', e.target.value)} placeholder="Promo agosto" />
          </Campo>
        )}
      </div>

      {NO_OPERATIVAS.includes(f.categoria) && (
        <div className="mt-5">
          <Aviso tono="alerta">
            {f.categoria === 'Envíos'
              ? 'Los envíos no cuentan como gasto operativo: se comparan contra lo que cobrás de envío en cada venta.'
              : f.categoria === 'Saldo publicitario (carga)'
                ? 'Cargar saldo no cuenta como gasto operativo todavía: es plata que pasó a la cuenta de Meta, no que se gastó. Se descuenta recién cuando la cargás como "Publicidad Meta (consumo)".'
                : 'Los retiros no cuentan como gasto operativo: es plata de los socios, no del negocio.'}
          </Aviso>
        </div>
      )}

      <div className="sticky bottom-0 mt-8 flex gap-3 border-t border-rule bg-paper py-4">
        <Boton tipo="primario" onClick={guardar} disabled={guardando} className="flex-1 sm:flex-none sm:px-8">
          {guardando ? 'Guardando…' : idEditar ? 'Guardar cambios' : 'Guardar gasto'}
        </Boton>
        <Boton onClick={() => router.push('/gastos/')}>Cancelar</Boton>
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
