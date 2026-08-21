// Aplica las migraciones de Fase 1, 3 y 4 sobre un archivo Excel descargado
// de la planilla real (Archivo -> Descargar -> Microsoft Excel), en vez de
// tocar Google Sheets directo por API. Pensado para correrlo vos mismo,
// ahora, sobre tu propia compu, sin necesitar credenciales de Google.
//
// NUNCA escribe sobre el archivo de entrada: siempre genera uno nuevo.
// Para aplicar el resultado hay que subirlo a Google Sheets con
// Archivo -> Importar -> Subir -> "Reemplazar la hoja de cálculo"
// (esa opción exacta: reemplaza el contenido MANTENIENDO el mismo ID de
// archivo, los permisos y la cuenta de servicio conectada).
//
// ADVERTENCIA importante: "Reemplazar la hoja de cálculo" pisa TODO lo que
// haya en la planilla real con lo que traiga este archivo. Si alguien carga
// una venta en la planilla EN VIVO entre que descargaste el Excel y que lo
// volvés a subir, esa venta se pierde. Hacé esto en un momento en que nadie
// esté usando la app (o avisá antes de arrancar).
//
// Uso:
//   node scripts/migrate-local-xlsx.js --in "C:\ruta\CopyPaste_Base_de_datos.xlsx"
//   node scripts/migrate-local-xlsx.js --in "...xlsx" --out "...xlsx"
// (si no se pasa --out, escribe al lado del original con sufijo _migrado)
const path = require('path');
const XLSX = require('xlsx');
const { newId } = require('../netlify/functions/_lib/schema');
const { PLANTILLAS_SEMILLA, TARIFAS_SEMILLA, VIGENTE_DESDE } = require('./_lib/seed-data');

function valorDeFlag(nombre) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i === -1 ? null : process.argv[i + 1];
}

// --- helpers de lectura/escritura de una hoja como matriz de filas ---

function leerHoja(wb, nombre) {
  const ws = wb.Sheets[nombre];
  if (!ws) return null;
  const filas = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  const header = filas[0] || [];
  const datos = filas.slice(1).filter((f) => f.some((c) => c !== '' && c !== undefined));
  return { header, datos };
}

function escribirHoja(wb, nombre, header, datos) {
  const ws = XLSX.utils.aoa_to_sheet([header, ...datos]);
  wb.Sheets[nombre] = ws;
  if (!wb.SheetNames.includes(nombre)) wb.SheetNames.push(nombre);
}

const bool = (v) => (v ? 'TRUE' : 'FALSE');

// --- Fase 1.2: columna `completo` en ventas ---
function faseCompleto(wb, log) {
  const { header, datos } = leerHoja(wb, 'ventas');
  if (header.includes('completo')) { log('ventas.completo: ya existe.'); return; }
  header.push('completo');
  datos.forEach((f) => f.push('TRUE'));
  escribirHoja(wb, 'ventas', header, datos);
  log(`ventas.completo: agregada, ${datos.length} filas backfilleadas en TRUE.`);
}

// --- Fase 1.1: hoja `plantillas` ---
function fasePlantillas(wb, log) {
  const cols = ['id', 'nombre', 'producto', 'maquina', 'material', 'hojas_por_unidad',
    'min_impresion_por_unidad', 'min_corte_por_unidad', 'min_archivo_fijo', 'terminacion', 'orden', 'activo'];
  const existente = leerHoja(wb, 'plantillas');
  const nombresExistentes = new Set((existente?.datos || []).map((f) => f[1]));
  const aInsertar = PLANTILLAS_SEMILLA.filter((p) => !nombresExistentes.has(p.nombre));

  const datos = existente?.datos || [];
  aInsertar.forEach((p, i) => {
    datos.push([
      newId('p'), p.nombre, p.producto, p.maquina, p.material, p.hojas_por_unidad,
      p.min_impresion_por_unidad, p.min_corte_por_unidad, p.min_archivo_fijo, p.terminacion,
      PLANTILLAS_SEMILLA.indexOf(p) + 1, 'TRUE',
    ]);
  });
  escribirHoja(wb, 'plantillas', cols, datos);
  log(`plantillas: ${aInsertar.length} insertadas (de ${PLANTILLAS_SEMILLA.length} semilla).`);
}

// --- Fase 3: hoja `tarifas` + columnas nuevas en ventas ---
function faseTarifas(wb, log) {
  const colsTarifas = ['id', 'tipo', 'clave', 'valor', 'unidad', 'vigente_desde', 'activo'];
  const existente = leerHoja(wb, 'tarifas');
  const yaCargadas = new Set((existente?.datos || []).map((f) => `${f[1]}|${f[2]}`));
  const aInsertar = TARIFAS_SEMILLA.filter((t) => !yaCargadas.has(`${t.tipo}|${t.clave}`));

  const datos = existente?.datos || [];
  aInsertar.forEach((t) => {
    datos.push([newId('t'), t.tipo, t.clave, t.valor, t.unidad, VIGENTE_DESDE, 'TRUE']);
  });
  escribirHoja(wb, 'tarifas', colsTarifas, datos);
  log(`tarifas: ${aInsertar.length} insertadas (de ${TARIFAS_SEMILLA.length} semilla).`);

  const nuevas = ['hojas', 'maquina', 'material', 'terminacion', 'costo_materiales_override'];
  const { header, datos: ventas } = leerHoja(wb, 'ventas');
  const faltan = nuevas.filter((c) => !header.includes(c));
  if (faltan.length === 0) { log('ventas (hojas/maquina/material/terminacion/override): ya existen.'); return; }
  header.push(...faltan);
  ventas.forEach((f) => {
    faltan.forEach((c) => f.push(c === 'costo_materiales_override' ? 'FALSE' : c === 'hojas' ? 0 : ''));
  });
  escribirHoja(wb, 'ventas', header, ventas);
  log(`ventas: agregadas ${faltan.join(', ')} (${ventas.length} filas backfilleadas).`);
}

// --- Fase 4: sacar etapa/costo_expresion, agregar precio_especial/costo_envio ---
function faseVentasShape(wb, log) {
  const { header, datos } = leerHoja(wb, 'ventas');
  const aBorrar = ['etapa', 'costo_expresion'].filter((c) => header.includes(c));
  if (aBorrar.length > 0) {
    aBorrar.forEach((nombre) => {
      const idx = header.indexOf(nombre);
      header.splice(idx, 1);
      datos.forEach((f) => f.splice(idx, 1));
    });
    log(`ventas: borradas ${aBorrar.join(', ')}.`);
  } else {
    log('ventas (etapa/costo_expresion): ya estaban borradas.');
  }

  const aAgregar = ['precio_especial', 'costo_envio'].filter((c) => !header.includes(c));
  if (aAgregar.length > 0) {
    header.push(...aAgregar);
    datos.forEach((f) => aAgregar.forEach((c) => f.push(c === 'costo_envio' ? 0 : 'FALSE')));
    log(`ventas: agregadas ${aAgregar.join(', ')}.`);
  } else {
    log('ventas (precio_especial/costo_envio): ya existían.');
  }

  escribirHoja(wb, 'ventas', header, datos);
}

function main() {
  const entrada = valorDeFlag('in');
  if (!entrada) {
    console.error('Uso: node scripts/migrate-local-xlsx.js --in "ruta\\al\\archivo.xlsx" [--out "ruta\\salida.xlsx"]');
    process.exit(1);
  }
  const salida = valorDeFlag('out') || entrada.replace(/\.xlsx$/i, '_migrado.xlsx');

  console.log(`Leyendo: ${entrada}`);
  const wb = XLSX.readFile(entrada, { cellDates: false, raw: true });
  console.log(`Hojas encontradas: ${wb.SheetNames.join(', ')}\n`);

  const log = (s) => console.log('  ' + s);
  console.log('Fase 1 — completo:'); faseCompleto(wb, log);
  console.log('Fase 1 — plantillas:'); fasePlantillas(wb, log);
  console.log('Fase 3 — tarifas:'); faseTarifas(wb, log);
  console.log('Fase 4 — forma de ventas:'); faseVentasShape(wb, log);

  XLSX.writeFile(wb, salida);
  console.log(`\nListo. Archivo migrado escrito en:\n  ${path.resolve(salida)}`);
  console.log('\nEl original NO se tocó. Para aplicar el cambio en la planilla real:');
  console.log('  Google Sheets -> Archivo -> Importar -> Subir -> elegí este archivo');
  console.log('  -> "Reemplazar la hoja de cálculo" (mantiene el mismo ID, permisos y cuenta de servicio).');
  console.log('  Hacelo en un momento sin nadie más cargando ventas: reemplazar pisa todo.');
}

main();
