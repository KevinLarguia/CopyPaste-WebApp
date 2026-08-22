import { hoy, normalizarTelefono } from './format';
import type { Cliente, Dataset, Gasto, Plantilla, Tarifa, Venta } from './types';

// Categorías que NO son gasto operativo. Regla del negocio, no técnica:
// el retiro es plata de los socios, el envío lo paga el cliente, y la carga
// de saldo publicitario es un movimiento de caja (la plata todavía no se
// gastó, recién se gasta cuando Meta la consume).
export const NO_OPERATIVAS = ['Retiro de socios', 'Envíos', 'Saldo publicitario (carga)'];
export const CAT_PUBLICIDAD = 'Publicidad Meta (consumo)';
export const CAT_PUBLICIDAD_CARGA = 'Saldo publicitario (carga)';
export const CAT_ENVIOS = 'Envíos';
export const CAT_RETIROS = 'Retiro de socios';

// Gasto sin `estado` (filas de antes de la Fase 5): se trata como ya pagado,
// que es lo único que podía significar en ese momento.
export const gastoEstaPagado = (g: Gasto) => (g.estado || 'pagado') === 'pagado';

// Umbrales heredados del Excel.
export const MARGEN_MINIMO = 0.55;      // debajo, conviene revisar precios
export const PUBLICIDAD_MAXIMA = 0.15;  // arriba, revisar si se paga sola

export const claveMes = (fechaISO: string) => {
  if (!fechaISO || fechaISO.length < 7) return 0;
  const a = Number(fechaISO.slice(0, 4));
  const m = Number(fechaISO.slice(5, 7));
  return a * 100 + m;
};

export const minutosDe = (v: Venta) =>
  (v.min_impresion || 0) + (v.min_corte || 0) + (v.min_archivo || 0);

export const margenDe = (v: Venta) => (v.precio || 0) - (v.costo_materiales || 0);

// Minutos y hojas que sugiere una plantilla para una cantidad dada. Los
// minutos de impresión y corte escalan con la cantidad, el archivo es fijo
// por trabajo (armar el arte no depende de cuántas unidades salen).
export function aplicarPlantilla(pl: Plantilla, cantidad: number) {
  const c = cantidad || 0;
  return {
    hojas: (pl.hojas_por_unidad || 0) * c,
    min_impresion: Math.round((pl.min_impresion_por_unidad || 0) * c),
    min_corte: Math.round((pl.min_corte_por_unidad || 0) * c),
    min_archivo: pl.min_archivo_fijo || 0,
  };
}

export function clientePorTelefono(clientes: Cliente[], telefono: string): Cliente | null {
  const d = normalizarTelefono(telefono);
  if (d.length < 6) return null;
  return clientes.find((c) => normalizarTelefono(c.telefono) === d) || null;
}

// Nombre provisorio para un cliente que solo dio el teléfono. Se marca
// `nombre_dudoso` para que aparezca en el mismo cartel de "nombres
// incompletos" que ya existe en Clientes, y se corrija ahí después.
export const nombreProvisorioDeTelefono = (telefono: string) => `Cliente ${telefono}`.trim();

// Último precio que un cliente pagó por un producto puntual: sirve como
// sugerencia al cargar, no se guarda solo. `null` si nunca lo compró.
export function ultimoPrecioProducto(d: Dataset, clienteId: string, producto: string): number | null {
  if (!clienteId || !producto) return null;
  const ventas = d.ventas
    .filter((v) => v.cliente_id === clienteId && v.producto === producto)
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  return ventas[0]?.precio ?? null;
}

// Fase 3.2 — espejo de netlify/functions/_lib/costeo.js (servidor). Se
// mantienen sincronizadas a mano; sirve para la vista previa antes de
// guardar, el servidor recalcula con autoridad al escribir.
// carillas = hojas: asumimos impresión a una faz (ver nota en costeo.js).
export function tarifaVigente(tarifas: Tarifa[], tipo: Tarifa['tipo'], clave: string, fecha: string): number {
  if (!clave) return 0;
  const candidatas = tarifas
    .filter((t) => t.tipo === tipo && t.clave === clave && t.activo !== false && t.vigente_desde <= fecha)
    .sort((a, b) => (a.vigente_desde < b.vigente_desde ? 1 : -1));
  return candidatas[0]?.valor || 0;
}

export function calcularCostoMateriales(
  tarifas: Tarifa[],
  venta: { hojas: number; cantidad: number; maquina: string; material: string; terminacion: string; fecha: string },
): number {
  const tarifaPapel = tarifaVigente(tarifas, 'papel', venta.material, venta.fecha);
  const tarifaTinta = tarifaVigente(tarifas, 'tinta', venta.maquina, venta.fecha);
  const tarifaTerminacion = venta.terminacion
    ? tarifaVigente(tarifas, 'terminacion', venta.terminacion, venta.fecha) : 0;
  return (venta.hojas || 0) * (tarifaPapel + tarifaTinta) + (venta.cantidad || 0) * tarifaTerminacion;
}

// La venta más reciente de un cliente, para "Repetir última venta".
export function ultimaVentaDeCliente(d: Dataset, clienteId: string): Venta | null {
  const ventas = d.ventas
    .filter((v) => v.cliente_id === clienteId)
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  return ventas[0] || null;
}

export function mesesConDatos(d: Dataset): number[] {
  const s = new Set<number>();
  d.ventas.forEach((v) => s.add(claveMes(v.fecha)));
  d.gastos.forEach((g) => s.add(claveMes(g.fecha)));
  s.delete(0);
  return Array.from(s).sort((a, b) => b - a);
}

export type ResumenMes = {
  mes: number;
  trabajos: number;
  facturacion: number;
  costoMateriales: number;
  margenBruto: number;
  margenPct: number | null;
  ticket: number | null;
  minutos: number;
  horas: number;
  margenPorHora: number | null;
  enviosCobrados: number;
  enviosPagados: number;
  diferenciaEnvios: number;
  gastosOperativos: number;
  publicidad: number;
  publicidadCargada: number;
  publicidadSobreFacturacion: number | null;
  retiros: number;
  resultado: number;
};

export function resumenDelMes(d: Dataset, mes: number): ResumenMes {
  const ventas = d.ventas.filter((v) => claveMes(v.fecha) === mes);
  // precio_especial (amigo/canje/promo) queda afuera de facturación, costo,
  // margen y ticket — no de trabajos, horas o envíos, que son actividad real.
  const rentables = ventas.filter((v) => !v.precio_especial);
  // Solo gastos ya pagados: uno "pedido" o "recibido" todavía no salió de la
  // caja, así que no debería inflar (ni desinflar) el resultado del mes.
  const gastos = d.gastos.filter((g) => claveMes(g.fecha) === mes && gastoEstaPagado(g));

  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const gastoDe = (cat: string) =>
    sum(gastos.filter((g) => g.categoria === cat).map((g) => g.monto || 0));

  const facturacion = sum(rentables.map((v) => v.precio || 0));
  const costoMateriales = sum(rentables.map((v) => v.costo_materiales || 0));
  const margenBruto = facturacion - costoMateriales;
  const minutos = sum(ventas.map(minutosDe));
  const horas = minutos / 60;

  const totalGastos = sum(gastos.map((g) => g.monto || 0));
  const gastosOperativos = totalGastos - gastoDe(CAT_RETIROS) - gastoDe(CAT_ENVIOS) - gastoDe(CAT_PUBLICIDAD_CARGA);
  const enviosCobrados = sum(ventas.map((v) => v.envio_cobrado || 0));
  const enviosPagados = gastoDe(CAT_ENVIOS);
  const publicidad = gastoDe(CAT_PUBLICIDAD);
  const publicidadCargada = gastoDe(CAT_PUBLICIDAD_CARGA);

  return {
    mes,
    trabajos: ventas.length,
    facturacion,
    costoMateriales,
    margenBruto,
    margenPct: facturacion ? margenBruto / facturacion : null,
    ticket: rentables.length ? facturacion / rentables.length : null,
    minutos,
    horas,
    margenPorHora: horas ? margenBruto / horas : null,
    enviosCobrados,
    enviosPagados,
    diferenciaEnvios: enviosCobrados - enviosPagados,
    gastosOperativos,
    publicidad,
    publicidadCargada,
    publicidadSobreFacturacion: facturacion ? publicidad / facturacion : null,
    retiros: gastoDe(CAT_RETIROS),
    resultado: facturacion - costoMateriales - gastosOperativos,
  };
}

// Agrupa por una propiedad de texto y suma/cuenta. Sirve para canales,
// etapas y categorías de gasto sin repetir tres veces el mismo reduce.
function agrupar<T>(items: T[], clave: (x: T) => string, valor: (x: T) => number) {
  const m = new Map<string, { etiqueta: string; total: number; cantidad: number }>();
  for (const it of items) {
    const k = clave(it) || 'Sin especificar';
    const cur = m.get(k) || { etiqueta: k, total: 0, cantidad: 0 };
    cur.total += valor(it);
    cur.cantidad += 1;
    m.set(k, cur);
  }
  return Array.from(m.values()).sort((a, b) => b.total - a.total);
}

// Un punto por día del mes (incluidos los días sin ventas, para que la
// línea no salte). Si el mes es el actual, corta en hoy: no tiene sentido
// mostrar los días que todavía no pasaron cayendo a cero.
export function ventasPorDia(d: Dataset, mes: number, hoyISO = hoy()) {
  const anio = Math.floor(mes / 100);
  const mesNum = mes % 100;
  const diasEnMes = new Date(anio, mesNum, 0).getDate();
  const esMesActual = mes === claveMes(hoyISO);
  const hastaDia = esMesActual ? Number(hoyISO.slice(8, 10)) : diasEnMes;

  const totales = new Map<string, number>();
  d.ventas
    .filter((v) => claveMes(v.fecha) === mes)
    .forEach((v) => totales.set(v.fecha, (totales.get(v.fecha) || 0) + (v.precio || 0)));

  const dias: { dia: number; fecha: string; total: number }[] = [];
  for (let i = 1; i <= hastaDia; i++) {
    const fecha = `${anio}-${String(mesNum).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    dias.push({ dia: i, fecha, total: totales.get(fecha) || 0 });
  }
  return dias;
}

// Semanas de calendario (1-7, 8-14, ...) dentro del mes, no ISO: así
// coinciden con "semana 1 / semana 2" tal como las cuenta cualquiera.
export function horasPorSemana(d: Dataset, mes: number) {
  const anio = Math.floor(mes / 100);
  const mesNum = mes % 100;
  const diasEnMes = new Date(anio, mesNum, 0).getDate();
  const cantSemanas = Math.ceil(diasEnMes / 7);

  const minutosPorSemana = new Map<number, number>();
  d.ventas
    .filter((v) => claveMes(v.fecha) === mes)
    .forEach((v) => {
      const dia = Number(v.fecha.slice(8, 10));
      const semana = Math.floor((dia - 1) / 7) + 1;
      minutosPorSemana.set(semana, (minutosPorSemana.get(semana) || 0) + minutosDe(v));
    });

  const filas: { etiqueta: string; total: number }[] = [];
  for (let s = 1; s <= cantSemanas; s++) {
    const diaInicio = (s - 1) * 7 + 1;
    const diaFin = Math.min(s * 7, diasEnMes);
    filas.push({
      etiqueta: `Semana ${s} (${diaInicio}–${diaFin})`,
      total: (minutosPorSemana.get(s) || 0) / 60,
    });
  }
  return filas;
}

export const ventasPorCanal = (d: Dataset, mes: number) =>
  agrupar(d.ventas.filter((v) => claveMes(v.fecha) === mes), (v) => v.canal, (v) => v.precio || 0);

// Reemplaza a minutosPorEtapa (Fase 4): "etapa" era un solo campo de texto
// libre por venta, adivinado, y ya generó conclusiones equivocadas. Los tres
// campos de minutos estructurados dicen lo mismo, mejor.
export function minutosPorTipo(d: Dataset, mes: number) {
  const ventas = d.ventas.filter((v) => claveMes(v.fecha) === mes);
  const filas = [
    { etiqueta: 'Impresión', total: 0, cantidad: 0 },
    { etiqueta: 'Corte y terminación', total: 0, cantidad: 0 },
    { etiqueta: 'Archivo y atención', total: 0, cantidad: 0 },
  ];
  for (const v of ventas) {
    if (v.min_impresion) { filas[0].total += v.min_impresion; filas[0].cantidad += 1; }
    if (v.min_corte) { filas[1].total += v.min_corte; filas[1].cantidad += 1; }
    if (v.min_archivo) { filas[2].total += v.min_archivo; filas[2].cantidad += 1; }
  }
  return filas.filter((f) => f.total > 0).sort((a, b) => b.total - a.total);
}

export const gastosPorCategoria = (d: Dataset, mes: number) =>
  agrupar(d.gastos.filter((g) => claveMes(g.fecha) === mes), (g) => g.categoria, (g) => g.monto || 0);

export type FilaProducto = {
  producto: string;
  trabajos: number;
  facturacion: number;
  porcentaje: number;
  costo: number;
  margen: number;
  margenPct: number | null;
  ticket: number | null;
  horas: number;
  margenPorHora: number | null;
};

// Dinámico: sale de las ventas del mes, no de una lista fija.
// Un producto nuevo aparece acá sin tocar código.
export function porProducto(d: Dataset, mes: number): FilaProducto[] {
  // precio_especial (amigo/canje/promo) queda afuera: es un análisis de
  // precio y margen, exactamente lo que esas ventas no representan bien.
  const ventas = d.ventas.filter((v) => claveMes(v.fecha) === mes && !v.precio_especial);
  const total = ventas.reduce((a, v) => a + (v.precio || 0), 0);
  const m = new Map<string, Venta[]>();
  ventas.forEach((v) => {
    const k = v.producto || 'Sin especificar';
    m.set(k, [...(m.get(k) || []), v]);
  });

  return Array.from(m.entries())
    .map(([producto, vs]) => {
      const facturacion = vs.reduce((a, v) => a + (v.precio || 0), 0);
      const costo = vs.reduce((a, v) => a + (v.costo_materiales || 0), 0);
      const horas = vs.reduce((a, v) => a + minutosDe(v), 0) / 60;
      const margen = facturacion - costo;
      return {
        producto,
        trabajos: vs.length,
        facturacion,
        porcentaje: total ? facturacion / total : 0,
        costo,
        margen,
        margenPct: facturacion ? margen / facturacion : null,
        ticket: vs.length ? facturacion / vs.length : null,
        horas,
        margenPorHora: horas ? margen / horas : null,
      };
    })
    .sort((a, b) => (b.margenPorHora ?? -1) - (a.margenPorHora ?? -1));
}

export type FilaCliente = Cliente & {
  compras: number;
  facturacion: number;
  ticket: number | null;
  ultimaCompra: string;
  diasSinComprar: number | null;
  estado: 'Está activo' | 'Pronto' | 'Escribirle esta semana' | 'Hace más de 2 meses' | 'Sin compras';
};

// Los umbrales son los mismos del Excel: >30 pronto, >45 esta semana, >60 dos meses.
export function fichaClientes(d: Dataset, hoyISO: string): FilaCliente[] {
  const porCliente = new Map<string, Venta[]>();
  for (const v of d.ventas) {
    const k = v.cliente_id || v.cliente_nombre;
    porCliente.set(k, [...(porCliente.get(k) || []), v]);
  }

  const hoy = new Date(`${hoyISO}T00:00:00Z`).getTime();

  return d.clientes.map((c) => {
    const vs = porCliente.get(c.id) || porCliente.get(c.nombre) || [];
    const compras = (c.hist_compras || 0) + vs.length;
    // La facturación no cuenta las ventas precio_especial (amigo/canje/promo);
    // las compras sí, porque la visita fue real aunque el precio no.
    const facturacion = (c.hist_facturacion || 0)
      + vs.filter((v) => !v.precio_especial).reduce((a, v) => a + (v.precio || 0), 0);
    const fechas = [c.hist_ultima_compra, ...vs.map((v) => v.fecha)].filter(Boolean).sort();
    const ultimaCompra = fechas[fechas.length - 1] || '';
    const dias = ultimaCompra
      ? Math.floor((hoy - new Date(`${ultimaCompra}T00:00:00Z`).getTime()) / 86400000)
      : null;

    let estado: FilaCliente['estado'] = 'Sin compras';
    if (dias !== null) {
      if (dias > 60) estado = 'Hace más de 2 meses';
      else if (dias > 45) estado = 'Escribirle esta semana';
      else if (dias > 30) estado = 'Pronto';
      else estado = 'Está activo';
    }

    return {
      ...c,
      compras,
      facturacion,
      ticket: compras ? facturacion / compras : null,
      ultimaCompra,
      diasSinComprar: dias,
      estado,
    };
  });
}

export function serieMensual(d: Dataset): ResumenMes[] {
  return mesesConDatos(d)
    .map((m) => resumenDelMes(d, m))
    .sort((a, b) => a.mes - b.mes);
}

// Gastos fijos que aparecieron todos los meses anteriores pero faltan en este.
// Nace del hallazgo de la auditoría: la cuota de máquinas dejó de cargarse.
export function gastosFijosFaltantes(d: Dataset, mes: number): string[] {
  const meses = mesesConDatos(d).filter((m) => m < mes);
  if (meses.length < 2) return [];
  const previos = meses.slice(0, 3);
  const catsDelMes = new Set(
    d.gastos.filter((g) => claveMes(g.fecha) === mes).map((g) => g.categoria),
  );
  const conteo = new Map<string, number>();
  for (const m of previos) {
    const cats = new Set(
      d.gastos.filter((g: Gasto) => claveMes(g.fecha) === m && g.tipo === 'Fijo')
        .map((g) => g.categoria),
    );
    cats.forEach((c) => conteo.set(c, (conteo.get(c) || 0) + 1));
  }
  return Array.from(conteo.entries())
    .filter(([cat, n]) => n === previos.length && !catsDelMes.has(cat))
    .map(([cat]) => cat);
}

export type ResumenContador = {
  maquina: string;
  desde: string;
  hasta: string;
  contadorInicial: number | null;
  contadorFinal: number | null;
  deltaContador: number | null;
  hojasCargadas: number;
  // deltaContador - hojasCargadas: positivo = la máquina imprimió más de lo
  // que quedó registrado en ventas (trabajos sin cargar, o hojas de prueba).
  diferencia: number | null;
};

// Fase 7 — contrasta lo que la máquina realmente imprimió (el contador físico)
// contra lo que se cargó como venta para esa máquina en el mismo período.
// `contadores` son lecturas puntuales (no un delta ya calculado): para un
// período dado se toma la última lectura en o antes de cada extremo.
export function ventasFaltantes(d: Dataset, maquina: string, desde: string, hasta: string): ResumenContador {
  const lecturas = d.contadores
    .filter((c) => c.maquina === maquina)
    .map((c) => ({ fecha: c.fecha, total: (c.contador_bn || 0) + (c.contador_color || 0) }))
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1));

  const ultimaHasta = (limite: string) =>
    [...lecturas].reverse().find((l) => l.fecha <= limite) ?? null;

  const inicial = ultimaHasta(desde);
  const final = ultimaHasta(hasta);
  const contadorInicial = inicial?.total ?? null;
  const contadorFinal = final?.total ?? null;
  const deltaContador =
    contadorInicial !== null && contadorFinal !== null ? contadorFinal - contadorInicial : null;

  const hojasCargadas = d.ventas
    .filter((v) => v.maquina === maquina && v.fecha >= desde && v.fecha <= hasta)
    .reduce((a, v) => a + (v.hojas || 0), 0);

  return {
    maquina, desde, hasta, contadorInicial, contadorFinal, deltaContador, hojasCargadas,
    diferencia: deltaContador !== null ? deltaContador - hojasCargadas : null,
  };
}
