'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDatos } from '@/lib/data-context';
import { api, ErrorApi } from '@/lib/api';
import { aplicarPlantilla, clientePorTelefono, nombreProvisorioDeTelefono } from '@/lib/calc';
import { hoy } from '@/lib/format';
import { Aviso, Boton, Campo, Input, Select, Titulo } from '@/components/ui';

const VACIO = { telefono: '', plantillaId: '', cantidad: '1', precio: '' };

// Captura rápida: 4 campos, se guarda con lo que haya. La venta queda marcada
// `completo: false` y se termina de cargar después en "Pendientes de completar".
export default function CargaRapida() {
  const router = useRouter();
  const { data, recargar } = useDatos();
  const [f, setF] = useState({ ...VACIO });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ultimaGuardada, setUltimaGuardada] = useState<string | null>(null);

  const set = (k: keyof typeof VACIO, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function guardar() {
    setError(null);
    setUltimaGuardada(null);
    const telefono = f.telefono.trim();
    if (!telefono) return setError('Falta el teléfono.');
    const pl = data.plantillas.find((p) => p.id === f.plantillaId);
    if (!pl) return setError('Elegí una plantilla.');
    const cantidad = Number(f.cantidad) || 0;
    if (!cantidad) return setError('Falta la cantidad.');
    const precio = Number(f.precio) || 0;
    if (!precio) return setError('Falta el precio cobrado.');

    setGuardando(true);
    try {
      const conocido = clientePorTelefono(data.clientes, telefono);
      let clienteId = conocido?.id;
      let clienteNombre = conocido?.nombre;

      if (!conocido) {
        const nombreProvisorio = nombreProvisorioDeTelefono(telefono);
        const nuevo = await api.crear('clientes', {
          nombre: nombreProvisorio,
          nombre_normalizado: nombreProvisorio
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),
          telefono,
          hist_compras: 0, hist_facturacion: 0, hist_ultima_compra: '', nombre_dudoso: true,
        });
        clienteId = nuevo.item.id;
        clienteNombre = nombreProvisorio;
      }

      const r = aplicarPlantilla(pl, cantidad);
      await api.crear('ventas', {
        fecha: hoy(),
        cliente_id: clienteId,
        cliente_nombre: clienteNombre,
        producto: pl.producto,
        cantidad,
        precio,
        envio_cobrado: 0,
        costo_envio: 0,
        costo_materiales: 0,
        costo_materiales_override: false,
        min_impresion: r.min_impresion,
        min_corte: r.min_corte,
        min_archivo: r.min_archivo,
        hojas: r.hojas,
        maquina: pl.maquina,
        material: pl.material,
        terminacion: pl.terminacion,
        precio_especial: false,
        canal: conocido ? 'Cliente que ya compró' : '',
        notas: '',
        telefono,
        completo: false,
      });

      await recargar(true);
      setUltimaGuardada(clienteNombre || telefono);
      setF((p) => ({ ...VACIO, plantillaId: p.plantillaId }));
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <Titulo subtitulo="Cuatro campos. Se guarda con lo que haya y se termina después.">
        Cargar rápido
      </Titulo>

      {error && <div className="mb-5"><Aviso tono="error">{error}</Aviso></div>}
      {ultimaGuardada && !error && (
        <div className="mb-5">
          <Aviso tono="alerta">
            Guardada para {ultimaGuardada}. Quedó en{' '}
            <Link href="/ventas/pendientes/" className="underline underline-offset-2">Pendientes</Link>{' '}
            hasta que la termines de cargar.
          </Aviso>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Teléfono">
          <Input
            type="tel" autoFocus value={f.telefono}
            onChange={(e) => set('telefono', e.target.value)}
            placeholder="+54 9 342 …"
          />
        </Campo>

        <Campo etiqueta="Plantilla">
          <Select value={f.plantillaId} onChange={(e) => set('plantillaId', e.target.value)}>
            <option value="">Elegí una</option>
            {data.plantillas
              .filter((p) => p.activo !== false)
              .sort((a, b) => (a.orden || 0) - (b.orden || 0))
              .map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Select>
        </Campo>

        <Campo etiqueta="Cantidad">
          <Input
            type="number" inputMode="numeric" min="0" value={f.cantidad}
            onChange={(e) => set('cantidad', e.target.value)}
          />
        </Campo>

        <Campo etiqueta="Precio cobrado" hint="Sin el envío.">
          <Input
            type="number" inputMode="decimal" min="0" value={f.precio}
            onChange={(e) => set('precio', e.target.value)} placeholder="0"
          />
        </Campo>
      </div>

      <div className="sticky bottom-0 mt-8 flex gap-3 border-t border-rule bg-paper py-4">
        <Boton tipo="primario" onClick={guardar} disabled={guardando} className="flex-1 sm:flex-none sm:px-8">
          {guardando ? 'Guardando…' : 'Guardar'}
        </Boton>
        <Boton onClick={() => router.push('/ventas/')}>Listo por ahora</Boton>
      </div>
    </>
  );
}
