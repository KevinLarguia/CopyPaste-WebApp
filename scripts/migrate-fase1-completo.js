// Fase 1.2 — agrega la columna `completo` al final de `ventas` y la
// backfillea en TRUE para todas las filas existentes (son ventas completas,
// cargadas antes de que existiera "Cargar rápido"). Lectura por default,
// agregá --apply para escribir de verdad. Idempotente: si la columna ya
// existe, no hace nada.
const { inicializar } = require('./_lib/cli');
const args = inicializar();

const { getClient, colLetter } = require('../netlify/functions/_lib/sheets');
const { SHEETS } = require('../netlify/functions/_lib/schema');

async function main() {
  const { api, sheetId } = getClient();
  const cols = SHEETS.ventas.columns;
  const idxCompleto = cols.indexOf('completo'); // 0-based
  if (idxCompleto === -1) throw new Error('"completo" no está en SHEETS.ventas.columns todavía.');
  const letra = colLetter(idxCompleto + 1);

  const header = await api.spreadsheets.values.get({
    spreadsheetId: sheetId, range: `ventas!${letra}1`,
  });
  const yaExiste = (header.data.values || [[]])[0]?.[0] === 'completo';

  const idsCol = await api.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'ventas!A2:A' });
  const filas = (idsCol.data.values || []).filter((r) => r[0] !== undefined && r[0] !== '').length;

  console.log(`Filas de datos encontradas en ventas: ${filas}.`);
  console.log(
    yaExiste
      ? `La columna "completo" ya existe en ${letra}1.`
      : `Se va a escribir el encabezado "completo" en ventas!${letra}1 y TRUE en ventas!${letra}2:${letra}${filas + 1}.`,
  );

  if (!args.apply) {
    console.log('\nModo lectura: no se escribió nada. Corré de nuevo con --apply para aplicar.');
    return;
  }

  if (!yaExiste) {
    await api.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `ventas!${letra}1`,
      valueInputOption: 'RAW',
      requestBody: { values: [['completo']] },
    });
  }

  if (filas > 0) {
    await api.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `ventas!${letra}2:${letra}${filas + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: Array.from({ length: filas }, () => ['TRUE']) },
    });
  }

  console.log(`\nListo: columna "completo" agregada y ${filas} filas backfilleadas en TRUE.`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
