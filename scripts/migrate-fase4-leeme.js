// Fase 4 — hoja "leeme": documentación para humanos, no dato de la app. Por
// eso no pasa por schema.js ni por el CRUD, se escribe directo con el
// cliente de Sheets. Lectura por default; --apply para escribir de verdad.
const { inicializar } = require('./_lib/cli');
const args = inicializar();

const { getClient } = require('../netlify/functions/_lib/sheets');

const TEXTO = [
  ['CopyPaste — definiciones de unidades (Fase 4)'],
  [''],
  ['cantidad = unidad comercial del producto: lo que se le cobra al cliente.'],
  ['  Ejemplos: carillas impresas en fotocopias, cuadernillos en apuntes, planchas en stickers.'],
  [''],
  ['hojas = hojas físicas de papel que salen de la impresora: lo que cuesta.'],
  [''],
  ['Una hoja impresa a doble faz son 2 carillas y 1 hoja.'],
  [''],
  ['El costo de materiales se calcula solo a partir de hojas + máquina + material + terminación'],
  ['(ver hoja "tarifas"). No se tipea a mano salvo que el trabajo se haya salido de lo normal.'],
];

async function main() {
  const { api, sheetId } = getClient();
  const meta = await api.spreadsheets.get({ spreadsheetId: sheetId });
  const yaExiste = (meta.data.sheets || []).some((s) => s.properties.title === 'leeme');

  if (yaExiste) {
    console.log('La pestaña "leeme" ya existe. No se toca.');
    return;
  }

  console.log('La pestaña "leeme" no existe todavía. Se va a crear con las definiciones de unidades.');
  if (!args.apply) {
    console.log('\nModo lectura: no se escribió nada. Corré de nuevo con --apply para aplicar.');
    return;
  }

  await api.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: { requests: [{ addSheet: { properties: { title: 'leeme' } } }] },
  });
  await api.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: 'leeme!A1',
    valueInputOption: 'RAW',
    requestBody: { values: TEXTO },
  });
  console.log('Listo: pestaña "leeme" creada.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
