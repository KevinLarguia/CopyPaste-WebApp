'use client';

import { useMemo, useState } from 'react';
import { useDatos } from '@/lib/data-context';
import {
  MARGEN_MINIMO, PUBLICIDAD_MAXIMA, gastosFijosFaltantes, gastosPorCategoria,
  mesesConDatos, minutosPorEtapa, resumenDelMes, ventasPorCanal,
} from '@/lib/calc';
import { money, num, pct, nombreMes } from '@/lib/format';
import { Aviso, Cargando, Kpi, Seccion, Titulo } from '@/components/ui';
import MesSelector from '@/components/MesSelector';
import Barras from '@/components/Barras';

export default function Panel() {
  const { data, cargando } = useDatos();
  const meses = useMemo(() => mesesConDatos(data), [data]);
  const [mes, setMes] = useState<number | null>(null);
  const mesActivo = mes ?? meses[0] ?? 0;

  if (cargando && meses.length === 0) return <Cargando que="el mes" />;
  if (meses.length === 0) {
    return (
      <>
        <Titulo>Panel del mes</Titulo>
        <Aviso>Todavía no hay ventas ni gastos cargados. Empezá por “Cargar venta”.</Aviso>
      </>
    );
  }

  const r = resumenDelMes(data, mesActivo);
  const faltantes = gastosFijosFaltantes(data, mesActivo);
  const margenFlojo = r.margenPct !== null && r.margenPct < MARGEN_MINIMO;
  const publicidadAlta =
    r.publicidadSobreFacturacion !== null && r.publicidadSobreFacturacion > PUBLICIDAD_MAXIMA;
  const etapas = minutosPorEtapa(data, mesActivo);
  const cuello = etapas[0];

  return (
    <>
      <Titulo accion={<MesSelector meses={meses} valor={mesActivo} onChange={setMes} />}>
        {nombreMes(mesActivo)}
      </Titulo>

      {(faltantes.length > 0 || margenFlojo || publicidadAlta || r.diferenciaEnvios < 0) && (
        <div className="mb-8 space-y-2">
          {faltantes.length > 0 && (
            <Aviso tono="alerta">
              Estos gastos fijos aparecieron todos los meses anteriores y este mes no están
              cargados: <strong>{faltantes.join(', ')}</strong>. Si ya los pagaste, cargalos:
              hasta que no estén, el resultado del mes está inflado.
            </Aviso>
          )}
          {r.diferenciaEnvios < 0 && (
            <Aviso tono="alerta">
              Los envíos te cuestan {money(Math.abs(r.diferenciaEnvios))} más de lo que cobrás.
              Estás poniendo plata de tu bolsillo en cada entrega.
            </Aviso>
          )}
          {margenFlojo && (
            <Aviso tono="alerta">
              El margen bruto está en {pct(r.margenPct)}, debajo del {pct(MARGEN_MINIMO, 0)} que
              te fijaste como piso. Conviene revisar precios.
            </Aviso>
          )}
          {publicidadAlta && (
            <Aviso tono="alerta">
              La publicidad se llevó {pct(r.publicidadSobreFacturacion)} de la facturación.
              Arriba del {pct(PUBLICIDAD_MAXIMA, 0)} hay que revisar si se paga sola.
            </Aviso>
          )}
        </div>
      )}

      <Seccion titulo="Ventas del mes">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi etiqueta="Facturación" valor={money(r.facturacion)} nota="Sin envíos. Esto es lo que realmente vendés." grande />
          <Kpi etiqueta="Margen por hora" valor={money(r.margenPorHora)} nota="Lo que deja cada hora de taller." grande />
          <Kpi etiqueta="Trabajos entregados" valor={num(r.trabajos)} />
          <Kpi etiqueta="Ticket promedio" valor={money(r.ticket)} nota="Subirlo es lo más rentable que podés hacer." />
          <Kpi etiqueta="Costo de materiales" valor={money(r.costoMateriales)} />
          <Kpi etiqueta="Margen bruto" valor={money(r.margenBruto)} nota="Antes de publicidad, cuotas y gastos fijos." />
          <Kpi etiqueta="Margen bruto %" valor={pct(r.margenPct)} tono={margenFlojo ? 'alerta' : 'normal'} />
          <Kpi etiqueta="Horas de producción" valor={num(r.horas, 1)} />
        </div>
      </Seccion>

      <Seccion titulo="Resultado" nota="Facturación menos la plata que efectivamente salió.">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            etiqueta="Resultado del mes"
            valor={money(r.resultado)}
            tono={r.resultado >= 0 ? 'pos' : 'neg'}
            grande
          />
          <Kpi etiqueta="Gastos operativos" valor={money(r.gastosOperativos)} nota="Sin retiros ni envíos." />
          <Kpi etiqueta="Publicidad en Meta" valor={money(r.publicidad)} nota={`${pct(r.publicidadSobreFacturacion)} de la facturación`} tono={publicidadAlta ? 'alerta' : 'normal'} />
          <Kpi etiqueta="Retiros de socios" valor={money(r.retiros)} />
        </div>
      </Seccion>

      <Seccion titulo="Envíos" nota="El envío lo paga el cliente: la diferencia debería dar cero o positivo.">
        <div className="grid grid-cols-3 gap-3">
          <Kpi etiqueta="Cobrados" valor={money(r.enviosCobrados)} />
          <Kpi etiqueta="Pagados" valor={money(r.enviosPagados)} />
          <Kpi
            etiqueta="Diferencia"
            valor={money(r.diferenciaEnvios)}
            tono={r.diferenciaEnvios < 0 ? 'neg' : 'pos'}
          />
        </div>
      </Seccion>

      <div className="grid gap-9 lg:grid-cols-2">
        <Seccion
          titulo="Cuello de botella"
          nota={cuello ? `La etapa más pesada es ${cuello.etiqueta.toLowerCase()}.` : undefined}
        >
          <Barras filas={etapas} formato="minutos" vacio="Cargá los minutos de cada trabajo para ver esto." />
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Solo tiene sentido invertir en una máquina para la etapa que más minutos se lleva.
          </p>
        </Seccion>

        <Seccion titulo="De dónde vinieron las ventas">
          <Barras filas={ventasPorCanal(data, mesActivo)} />
        </Seccion>
      </div>

      <Seccion titulo="Gastos por categoría">
        <Barras filas={gastosPorCategoria(data, mesActivo)} vacio="No hay gastos cargados este mes." />
      </Seccion>
    </>
  );
}
