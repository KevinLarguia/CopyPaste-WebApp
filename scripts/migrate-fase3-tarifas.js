// Fase 3 — crea la hoja `tarifas` con las tarifas semilla y agrega a `ventas`
// las columnas hojas/maquina/material/terminacion/costo_materiales_override.
// Lectura por default; agregá --apply para escribir de verdad. Idempotente.
//
// OJO — dos ajustes respecto del documento original, para que las tarifas
// realmente encuentren cada plantilla (que usa estas claves exactas):
//   - "Vinilo / film" -> "Vinilo" (así matchea con la plantilla de stickers)
//   - "Fotográfico 200gr brillante" -> "Fotográfico 200gr" (así matchea con
//     la plantilla de impresión en papel especial)
// Y dos materiales que las plantillas usan pero el documento original no
// tarifaba (quedan en $0, "a medir", igual que ya hacía el documento con
// L5590/T3170 en tinta): "Adhesivo fotográfico" y "Fotográfico" (polaroids).
const { inicializar } = require('./_lib/cli');
const args = inicializar();

const { getClient, readSheet, appendRow, colLetter } = require('../netlify/functions/_lib/sheets');
const { SHEETS, newId } = require('../netlify/functions/_lib/schema');

const VIGENTE_DESDE = '2026-08-01'; // antes de la primera venta real cargada

const TARIFAS_SEMILLA = [
  { tipo: 'papel', clave: 'Común', valor: 15, unidad: 'por hoja' },
  { tipo: 'papel', clave: 'Mate 220gr', valor: 200, unidad: 'por hoja' },
  { tipo: 'papel', clave: '240gr doble faz', valor: 250, unidad: 'por hoja' },
  { tipo: 'papel', clave: 'Fotográfico 200gr', valor: 133, unidad: 'por hoja' },
  { tipo: 'papel', clave: 'Vinilo', valor: 510, unidad: 'por hoja' },
  { tipo: 'papel', clave: 'Adhesivo fotográfico', valor: 0, unidad: 'por hoja (a medir)' },
  { tipo: 'papel', clave: 'Fotográfico', valor: 0, unidad: 'por hoja (a medir)' },
  { tipo: 'tinta', clave: 'J6955', valor: 2, unidad: 'por carilla' },
  { tipo: 'tinta', clave: 'L5590', valor: 0, unidad: 'por carilla (a medir)' },
  { tipo: 'tinta', clave: 'T3170', valor: 0, unidad: 'por m² (a medir)' },
  { tipo: 'terminacion', clave: 'Anillado', valor: 200, unidad: 'por unidad' },
];

const COLUMNAS_VENTAS_NUEVAS = ['hojas', 'maquina', 'material', 'terminacion', 'costo_materiales_override'];

async function crearTarifas(api, sheetId) {
  const cols = SHEETS.tarifas.columns;
  const meta = await api.spreadsheets.get({ spreadsheetId: sheetId });
  const yaExiste = (meta.data.sheets || []).some((s) => s.properties.title === 'tarifas');

  if (!yaExiste) {
    console.log('La pestaña "tarifas" no existe todavía.');
    console.log(`Se va a crear con estas columnas: ${cols.join(', ')}`);
    if (args.apply) {
      await api.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: 'tarifas' } } }] },
      });
      await api.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `tarifas!A1:${colLetter(cols.length)}1`,
        valueInputOption: 'RAW',
        requestBody: { values: [cols] },
      });
      console.log('Pestaña "tarifas" creada con su encabezado.');
    }
  } else {
    console.log('La pestaña "tarifas" ya existe.');
  }

  const existentes = yaExiste || args.apply ? await readSheet('tarifas') : [];
  const yaCargadas = new Set(existentes.map((t) => `${t.tipo}|${t.clave}`));
  const aInsertar = TARIFAS_SEMILLA.filter((t) => !yaCargadas.has(`${t.tipo}|${t.clave}`));

  console.log(
    `\nTarifas semilla: ${TARIFAS_SEMILLA.length}. Ya cargadas: ${TARIFAS_SEMILLA.length - aInsertar.length}. ` +
    `A insertar: ${aInsertar.length}.`,
  );
  aInsertar.forEach((t) => console.log(`  - ${t.tipo} / ${t.clave}: $${t.valor} ${t.unidad}`));

  if (args.apply) {
    for (const t of aInsertar) {
      await appendRow('tarifas', {
        id: newId('t'), tipo: t.tipo, clave: t.clave, valor: t.valor,
        unidad: t.unidad, vigente_desde: VIGENTE_DESDE, activo: true,
      });
    }
    console.log(`Listo: ${aInsertar.length} tarifas insertadas.`);
  }
}

async function agregarColumnasVentas(api, sheetId) {
  const cols = SHEETS.ventas.columns;
  const idxInicio = cols.indexOf('hojas');
  if (idxInicio === -1) throw new Error('"hojas" no está en SHEETS.ventas.columns todavía.');
  const nuevas = cols.slice(idxInicio);
  const letraInicio = colLetter(idxInicio + 1);
  const letraFin = colLetter(cols.length);

  const header = await api.spreadsheets.values.get({
    spreadsheetId: sheetId, range: `ventas!${letraInicio}1:${letraFin}1`,
  });
  const actuales = (header.data.values || [[]])[0] || [];
  const yaExiste = nuevas.every((c, i) => actuales[i] === c);

  const idsCol = await api.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'ventas!A2:A' });
  const filas = (idsCol.data.values || []).filter((r) => r[0] !== undefined && r[0] !== '').length;

  console.log(`\nFilas de datos en ventas: ${filas}.`);
  console.log(
    yaExiste
      ? `Las columnas ${nuevas.join(', ')} ya existen en ventas (${letraInicio}1:${letraFin}1).`
      : `Se van a escribir los encabezados ${nuevas.join(', ')} en ventas!${letraInicio}1:${letraFin}1, ` +
        `y backfill (0, "", "", "", FALSE) en las ${filas} filas existentes. ` +
        `Sus costo_materiales actuales NO se tocan.`,
  );

  if (!args.apply || yaExiste) return;

  await api.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `ventas!${letraInicio}1:${letraFin}1`,
    valueInputOption: 'RAW',
    requestBody: { values: [nuevas] },
  });

  if (filas > 0) {
    const filaBackfill = [0, '', '', '', 'FALSE']; // hojas, maquina, material, terminacion, override
    await api.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `ventas!${letraInicio}2:${letraFin}${filas + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: Array.from({ length: filas }, () => filaBackfill) },
    });
  }
  console.log(`Listo: columnas agregadas y ${filas} filas backfilleadas.`);
}

async function main() {
  const { api, sheetId } = getClient();
  await crearTarifas(api, sheetId);
  await agregarColumnasVentas(api, sheetId);

  if (!args.apply) {
    console.log('\nModo lectura: no se escribió nada. Corré de nuevo con --apply para aplicar.');
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
