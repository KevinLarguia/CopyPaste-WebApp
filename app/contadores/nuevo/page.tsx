'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDatos } from '@/lib/data-context';
import { api, ErrorApi } from '@/lib/api';
import { hoy } from '@/lib/format';
import { MAQUINAS } from '@/lib/constants';
import { Aviso, Boton, Campo, Input, Select, Titulo, claseInput } from '@/components/ui';

const VACIO = { fecha: hoy(), maquina: '', contador_bn: '', contador_color: '' };

function Formulario() {
  const router = useRouter();
  const params = useSearchParams();
  const idEditar = params.get('id');
  const { data, recargar } = useDatos();

  const [f, setF] = useState({ ...VACIO });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    if (!idEditar || cargado) return;
    const c = data.contadores.find((x) => x.id === idEditar);
    if (!c) return;
    setF({
      fecha: c.fecha, maquina: c.maquina,
      contador_bn: String(c.contador_bn ?? ''), contador_color: String(c.contador_color ?? ''),
    });
    setCargado(true);
  }, [idEditar, data.contadores, cargado]);

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function guardar() {
    setError(null);
    if (!f.maquina) return setError('Elegí una máquina.');
    if (!f.contador_bn.trim() && !f.contador_color.trim()) {
      return setError('Cargá al menos uno de los dos contadores.');
    }

    setGuardando(true);
    try {
      const payload = {
        ...(idEditar ? { id: idEditar } : {}),
        fecha: f.fecha, maquina: f.maquina,
        contador_bn: Number(f.contador_bn) || 0,
        contador_color: Number(f.contador_color) || 0,
      };
      if (idEditar) await api.editar('contadores', payload);
      else await api.crear('contadores', payload);
      await recargar(true);
      router.push('/contadores/');
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo guardar.');
      setGuardando(false);
    }
  }

  return (
    <>
      <Titulo>{idEditar ? 'Editar contador' : 'Cargar contador'}</Titulo>
      {error && <div className="mb-5"><Aviso tono="error">{error}</Aviso></div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Fecha">
          <input type="date" className={claseInput} value={f.fecha} onChange={(e) => set('fecha', e.target.value)} />
        </Campo>

        <Campo etiqueta="Máquina">
          <Select value={f.maquina} onChange={(e) => set('maquina', e.target.value)}>
            <option value="">Elegí una</option>
            {MAQUINAS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Campo>

        <Campo etiqueta="Contador blanco y negro" hint="Lo que muestra la máquina ahora, acumulado.">
          <Input type="number" inputMode="numeric" min="0" value={f.contador_bn} onChange={(e) => set('contador_bn', e.target.value)} placeholder="0" />
        </Campo>

        <Campo etiqueta="Contador color" hint="0 si la máquina no imprime color.">
          <Input type="number" inputMode="numeric" min="0" value={f.contador_color} onChange={(e) => set('contador_color', e.target.value)} placeholder="0" />
        </Campo>
      </div>

      <div className="sticky bottom-0 mt-8 flex gap-3 border-t border-rule bg-paper py-4">
        <Boton tipo="primario" onClick={guardar} disabled={guardando} className="flex-1 sm:flex-none sm:px-8">
          {guardando ? 'Guardando…' : idEditar ? 'Guardar cambios' : 'Guardar contador'}
        </Boton>
        <Boton onClick={() => router.push('/contadores/')}>Cancelar</Boton>
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
