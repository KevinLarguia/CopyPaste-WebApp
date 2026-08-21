'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useDatos } from '@/lib/data-context';
import {
  MARGEN_MINIMO, PUBLICIDAD_MAXIMA, gastosFijosFaltantes, gastosPorCategoria, horasPorSemana,
  mesesConDatos, minutosPorEtapa, resumenDelMes, serieMensual, ventasPorCanal, ventasPorDia,
} from '@/lib/calc';
import { money, num, pct, nombreMes } from '@/lib/format';
import { Aviso, Boton, Cargando, Kpi, Seccion, Segmentado, Tarjeta, Titulo } from '@/components/ui';
import MesSelector from '@/components/MesSelector';
import Barras from '@/components/Barras';
import Donut from '@/components/Donut';
import Progreso from '@/components/Progreso';
import Tendencia from '@/components/Tendencia';

const variacion = (actual: number | null, previo: number | null) => {
  if (actual === null || previo === null || previo === 0) return null;
  return (actual - previo) / previo;
};

const cambioDe = (actual: number | null, previo: number | null) => {
  const v = variacion(actual, previo);
  if (v === null) return undefined;
  const tono: 'pos' | 'neg' = v >= 0 ? 'pos' : 'neg';
  return { texto: `${v >= 0 ? '+' : ''}${pct(v)}`, tono };
};

export default function Panel() {
  const { data, cargando } = useDatos();
  const meses = useMemo(() => mesesConDatos(data), [data]);
  const [mes, setMes] = useState<number | null>(null);
  const mesActivo = mes ?? meses[0] ?? 0;
  const [vistaTendencia, setVistaTendencia] = useState<'dia' | 'mes'>('dia');

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
  const indiceMes = meses.indexOf(mesActivo);
  const mesAnterior = meses[indiceMes + 1];
  const rAnterior = mesAnterior !== undefined ? resumenDelMes(data, mesAnterior) : null;
  const faltantes = gastosFijosFaltantes(data, mesActivo);
  const margenFlojo = r.margenPct !== null && r.margenPct < MARGEN_MINIMO;
  const publicidadAlta =
    r.publicidadSobreFacturacion !== null && r.publicidadSobreFacturacion > PUBLICIDAD_MAXIMA;
  const etapas = minutosPorEtapa(data, mesActivo);
  const cuello = etapas[0];
  const canales = ventasPorCanal(data, mesActivo);
  const gastosCat = gastosPorCategoria(data, mesActivo);
  const porDia = ventasPorDia(data, mesActivo);
  const porMes = serieMensual(data).map((s) => ({ x: nombreMes(s.mes), total: s.facturacion }));
  const porSemana = horasPorSemana(data, mesActivo);

  const progresoMargen = r.margenPct !== null ? Math.min(r.margenPct / MARGEN_MINIMO, 1) : 0;
  const usoPublicidad = r.publicidadSobreFacturacion !== null
    ? r.publicidadSobreFacturacion / PUBLICIDAD_MAXIMA : 0;

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/ventas/nueva/">
          <Boton tipo="primario">+ Cargar venta</Boton>
        </Link>
        <Link href="/gastos/nuevo/">
          <Boton>+ Cargar gasto</Boton>
        </Link>
      </div>

      {/* Fases siguientes suman tarjetas acá: Pendientes de completar (Fase 1.2),
          Clientes a reactivar (Fase 2), Resultado del mes recalculado (Fase 5),
          Publicidad invertido vs. atribuido (Fase 5.2/5.3). */}

      <Titulo
        subtitulo="Facturación, márgenes y gastos del mes seleccionado"
        accion={<MesSelector meses={meses} valor={mesActivo} onChange={setMes} />}
      >
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

      <Seccion titulo="Ventas del mes" nota={rAnterior ? `vs. ${nombreMes(mesAnterior)}` : undefined}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi etiqueta="Facturación" valor={money(r.facturacion)} nota="Sin envíos. Esto es lo que realmente vendés." grande cambio={cambioDe(r.facturacion, rAnterior?.facturacion ?? null)} />
          <Kpi etiqueta="Margen por hora" valor={money(r.margenPorHora)} nota="Lo que deja cada hora de taller." grande cambio={cambioDe(r.margenPorHora, rAnterior?.margenPorHora ?? null)} />
          <Kpi etiqueta="Trabajos entregados" valor={num(r.trabajos)} cambio={cambioDe(r.trabajos, rAnterior?.trabajos ?? null)} />
          <Kpi etiqueta="Ticket promedio" valor={money(r.ticket)} nota="Subirlo es lo más rentable que podés hacer." cambio={cambioDe(r.ticket, rAnterior?.ticket ?? null)} />
          <Kpi etiqueta="Costo de materiales" valor={money(r.costoMateriales)} />
          <Kpi etiqueta="Margen bruto" valor={money(r.margenBruto)} nota="Antes de publicidad, cuotas y gastos fijos." />
          <Kpi
            etiqueta="Margen bruto %"
            valor={pct(r.margenPct)}
            nota="Sobre el costo de materiales solamente. No es la rentabilidad del negocio."
            tono={margenFlojo ? 'alerta' : 'normal'}
          />
          <Kpi etiqueta="Horas de producción" valor={num(r.horas, 1)} />
        </div>
      </Seccion>

      <Seccion
        titulo={vistaTendencia === 'dia' ? 'Ventas por día' : 'Ventas por mes'}
        nota={vistaTendencia === 'dia' ? 'Facturación diaria del mes, sin envíos.' : 'Facturación de cada mes cargado, sin envíos.'}
        accion={
          <Segmentado
            valor={vistaTendencia}
            onChange={setVistaTendencia}
            opciones={[{ valor: 'dia', etiqueta: 'Día' }, { valor: 'mes', etiqueta: 'Mes' }]}
          />
        }
      >
        <Tarjeta>
          {vistaTendencia === 'dia'
            ? <Tendencia datos={porDia.map((f) => ({ x: f.dia, total: f.total }))} etiquetaTooltip={(x) => `Día ${x}`} vacio="Todavía no hay ventas este mes." />
            : <Tendencia datos={porMes} vacio="Todavía no hay meses cargados." />}
        </Tarjeta>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Seccion
          titulo="Cuello de botella"
          nota={cuello ? `La etapa más pesada es ${cuello.etiqueta.toLowerCase()}.` : undefined}
        >
          <Tarjeta>
            <Barras filas={etapas} formato="minutos" vacio="Cargá los minutos de cada trabajo para ver esto." />
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Solo tiene sentido invertir en una máquina para la etapa que más minutos se lleva.
            </p>
          </Tarjeta>
        </Seccion>

        <Seccion titulo="De dónde vinieron las ventas">
          <Tarjeta>
            <Donut filas={canales} />
          </Tarjeta>
        </Seccion>
      </div>

      <Seccion titulo="Tiempo trabajado por semana" nota="Minutos de impresión, corte y archivo cargados en cada venta.">
        <Tarjeta>
          <Barras filas={porSemana} formato="horas" vacio="Cargá los minutos de cada trabajo para ver esto." />
        </Tarjeta>
      </Seccion>

      <div className="grid gap-6 lg:grid-cols-2">
        <Seccion titulo="Gastos por categoría">
          <Tarjeta>
            <Barras filas={gastosCat} vacio="No hay gastos cargados este mes." />
          </Tarjeta>
        </Seccion>

        <Seccion titulo="Metas" nota="Los pisos que ya te fijaste para el negocio.">
          <Tarjeta className="space-y-5">
            <Progreso
              etiqueta="Margen bruto"
              ratio={progresoMargen}
              texto={pct(r.margenPct)}
              tono={margenFlojo ? 'gold' : 'pos'}
            />
            <Progreso
              etiqueta="Presupuesto de publicidad usado"
              ratio={usoPublicidad}
              texto={pct(r.publicidadSobreFacturacion)}
              tono={publicidadAlta ? 'neg' : 'pos'}
            />
          </Tarjeta>
        </Seccion>
      </div>
    </>
  );
}
