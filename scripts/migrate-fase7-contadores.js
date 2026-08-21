// Fase 7 — crea la pestaña `contadores`, vacía (sin semilla: recién arranca
// a usarse desde que alguien carga la primera lectura). Importante correr
// esto ANTES de desplegar el código de esta fase: netlify/functions/data.js
// pide esta pestaña en su lectura batcheada, y si no existe todavía, rompe
// la carga de TODOS los datos, no solo la de contadores (mismo problema que
// ya pasó con `plantillas`/`tarifas` en la Fase 1).
// Lectura por default; agregá --apply para escribir de verdad. Idempotente.
const { inicializar } = require('./_lib/cli');
const args = inicializar();

const { getClient, colLetter } = require('../netlify/functions/_lib/sheets');
const { SHEETS } = require('../netlify/functions/_lib/schema');

async function main() {
  const { api, sheetId } = getClient();
  const cols = SHEETS.contadores.columns;

  const meta = await api.spreadsheets.get({ spreadsheetId: sheetId });
  const yaExiste = (meta.data.sheets || []).some((s) => s.properties.title === 'contadores');

  if (yaExiste) {
    console.log('La pestaña "contadores" ya existe. Nada para hacer.');
    return;
  }

  console.log('La pestaña "contadores" no existe todavía.');
  console.log(`Se va a crear con estas columnas: ${cols.join(', ')}`);

  if (!args.apply) {
    console.log('\nModo lectura: no se escribió nada. Corré de nuevo con --apply para aplicar.');
    return;
  }

  await api.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: { requests: [{ addSheet: { properties: { title: 'contadores' } } }] },
  });
  await api.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `contadores!A1:${colLetter(cols.length)}1`,
    valueInputOption: 'RAW',
    requestBody: { values: [cols] },
  });
  console.log('Listo: pestaña "contadores" creada con su encabezado.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
