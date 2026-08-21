// Fase 5 — agrega `estado` y `anuncio` al final de `gastos` (columnas al
// final: a diferencia de la Fase 4, esto es seguro desplegar incluso antes
// de correr esta migración — sheets.js lee de más y completa con "" hasta
// que la columna exista de verdad). Backfillea `estado='pagado'` en las
// filas existentes (antes de esta fase todo gasto cargado ya estaba pagado).
// También separa la categoría "Publicidad Meta" en consumo/carga: renombra
// las filas de gasto existentes a "Publicidad Meta (consumo)" (antes de la
// Fase 5 esa categoría solo existía para trackear consumo real), y agrega
// las opciones nuevas a `listas`.
// Lectura por default; agregá --apply para escribir de verdad. Idempotente.
const { inicializar } = require('./_lib/cli');
const args = inicializar();

const { getClient, readSheet, appendRow, updateRowById, colLetter } = require('../netlify/functions/_lib/sheets');
const { SHEETS } = require('../netlify/functions/_lib/schema');
const { LISTAS_FASE5, CATEGORIA_GASTO_VIEJA, CATEGORIA_GASTO_NUEVA } = require('./_lib/seed-data');

async function agregarColumnas(api, sheetId) {
  const cols = SHEETS.gastos.columns;
  const idxInicio = cols.indexOf('estado');
  if (idxInicio === -1) throw new Error('"estado" no está en SHEETS.gastos.columns todavía.');
  const nuevas = cols.slice(idxInicio); // ['estado', 'anuncio']
  const letraInicio = colLetter(idxInicio + 1);
  const letraFin = colLetter(cols.length);

  const header = await api.spreadsheets.values.get({
    spreadsheetId: sheetId, range: `gastos!${letraInicio}1:${letraFin}1`,
  });
  const actuales = (header.data.values || [[]])[0] || [];
  const yaExiste = nuevas.every((c, i) => actuales[i] === c);

  const idsCol = await api.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'gastos!A2:A' });
  const filas = (idsCol.data.values || []).filter((r) => r[0] !== undefined && r[0] !== '').length;

  console.log(`Filas de datos en gastos: ${filas}.`);
  console.log(
    yaExiste
      ? `Las columnas ${nuevas.join(', ')} ya existen en gastos.`
      : `Se van a escribir los encabezados ${nuevas.join(', ')} en gastos!${letraInicio}1:${letraFin}1, ` +
        `y backfill ("pagado", "") en las ${filas} filas existentes.`,
  );

  if (!args.apply || yaExiste) return;

  await api.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `gastos!${letraInicio}1:${letraFin}1`,
    valueInputOption: 'RAW',
    requestBody: { values: [nuevas] },
  });

  if (filas > 0) {
    const filaBackfill = ['pagado', ''];
    await api.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `gastos!${letraInicio}2:${letraFin}${filas + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: Array.from({ length: filas }, () => filaBackfill) },
    });
  }
  console.log(`Listo: columnas agregadas y ${filas} filas backfilleadas.`);
}

async function renombrarCategoria() {
  const gastos = args.apply ? await readSheet('gastos', { includeInactive: true }) : [];
  const aRenombrar = args.apply ? gastos.filter((g) => g.categoria === CATEGORIA_GASTO_VIEJA) : [];

  if (!args.apply) {
    console.log(
      `\nSe van a renombrar las filas de gasto con categoría "${CATEGORIA_GASTO_VIEJA}" a ` +
      `"${CATEGORIA_GASTO_NUEVA}" (se sabrá cuántas al correr con --apply, porque necesita leer la hoja real).`,
    );
    return;
  }

  console.log(`\nGastos con categoría "${CATEGORIA_GASTO_VIEJA}": ${aRenombrar.length}.`);
  for (const g of aRenombrar) {
    await updateRowById('gastos', g.id, { categoria: CATEGORIA_GASTO_NUEVA });
  }
  console.log(`Renombrados: ${aRenombrar.length}.`);
}

async function agregarListas() {
  const existentes = args.apply ? await readSheet('listas') : [];
  const yaCargadas = new Set(existentes.map((l) => `${l.tipo}|${l.valor}`));
  const aInsertar = LISTAS_FASE5.filter((l) => !yaCargadas.has(`${l.tipo}|${l.valor}`));

  console.log(`\nOpciones nuevas de listas a insertar: ${aInsertar.length} (de ${LISTAS_FASE5.length}).`);
  aInsertar.forEach((l) => console.log(`  - ${l.tipo}: "${l.valor}"`));

  if (!args.apply) return;

  const porTipo = new Map();
  for (const l of aInsertar) {
    if (!porTipo.has(l.tipo)) {
      const max = existentes.filter((e) => e.tipo === l.tipo).reduce((a, e) => Math.max(a, e.orden || 0), 0);
      porTipo.set(l.tipo, max);
    }
    const orden = porTipo.get(l.tipo) + 1;
    porTipo.set(l.tipo, orden);
    await appendRow('listas', { tipo: l.tipo, valor: l.valor, orden, activo: true });
  }

  // La categoría vieja combinada queda desactivada, no borrada: los gastos
  // ya renombrados dejan de necesitarla, pero no se pierde el historial.
  const vieja = existentes.find((l) => l.tipo === 'categoria_gasto' && l.valor === CATEGORIA_GASTO_VIEJA);
  if (vieja) {
    await updateRowById('listas', vieja.valor, { activo: false });
    console.log(`Desactivada la categoría vieja "${CATEGORIA_GASTO_VIEJA}" en listas.`);
  }

  console.log(`Listo: ${aInsertar.length} opciones nuevas insertadas.`);
}

async function main() {
  const { api, sheetId } = getClient();
  await agregarColumnas(api, sheetId);
  await renombrarCategoria();
  await agregarListas();

  if (!args.apply) {
    console.log('\nModo lectura: no se escribió nada. Corré de nuevo con --apply para aplicar.');
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
