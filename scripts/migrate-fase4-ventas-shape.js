// Fase 4 — la migración de más riesgo de todo el plan: BORRA físicamente
// las columnas "etapa" y "costo_expresion" de la planilla real, y agrega
// "precio_especial" y "costo_envio" al final.
//
// Por qué es riesgosa: sheets.js mapea cada columna por POSICIÓN, no por
// nombre. Si estas dos columnas no se borran físicamente de la hoja pero
// sí se borran de schema.js, todo lo que viene después ("min_impresion" en
// adelante) se lee y escribe corrido de lugar en las 55 filas existentes.
//
// Protecciones:
//   1. Antes de escribir nada, guarda un backup completo de la pestaña en
//      scripts/backups/.
//   2. No alcanza con --apply: hace falta TAMBIÉN --confirmo-borrado.
//   3. Podés apuntar a una pestaña de prueba con --tab "ventas (copia)"
//      (duplicá la pestaña ventas dentro del mismo archivo — Google Sheets:
//      clic derecho en la pestaña → Duplicar — no consume espacio de Drive
//      porque es el mismo archivo) antes de tocar la pestaña real.
//   4. Busca "etapa"/"costo_expresion" por NOMBRE en el encabezado real de
//      la hoja, no por la posición que dice schema.js (que ya cambió).
//
// Uso:
//   node scripts/migrate-fase4-ventas-shape.js --tab "ventas (copia)"
//   node scripts/migrate-fase4-ventas-shape.js --tab "ventas (copia)" --apply --confirmo-borrado
//   node scripts/migrate-fase4-ventas-shape.js --apply --confirmo-borrado   (contra la real, al final)
const fs = require('fs');
const path = require('path');
const { inicializar } = require('./_lib/cli');
const args = inicializar();

const { getClient } = require('../netlify/functions/_lib/sheets');
const { SHEETS } = require('../netlify/functions/_lib/schema');

const COLUMNAS_A_BORRAR = ['etapa', 'costo_expresion'];
const COLUMNAS_A_AGREGAR = ['precio_especial', 'costo_envio'];

function valorDeFlag(nombre) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i === -1 ? null : process.argv[i + 1];
}

function colLetter(n) {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

async function main() {
  const tab = valorDeFlag('tab') || 'ventas';
  const confirmoBorrado = args.flags.has('confirmo-borrado');

  const { api, sheetId } = getClient();
  const meta = await api.spreadsheets.get({ spreadsheetId: sheetId });
  const hoja = (meta.data.sheets || []).find((s) => s.properties.title === tab);
  if (!hoja) throw new Error(`No encontré la pestaña "${tab}" en esta planilla.`);
  const gridSheetId = hoja.properties.sheetId;

  const headerRes = await api.spreadsheets.values.get({ spreadsheetId: sheetId, range: `'${tab}'!1:1` });
  const header = (headerRes.data.values || [[]])[0] || [];
  console.log(`Pestaña: "${tab}". Columnas actuales (${header.length}): ${header.join(', ')}`);

  const idsCol = await api.spreadsheets.values.get({ spreadsheetId: sheetId, range: `'${tab}'!A2:A` });
  const filas = (idsCol.data.values || []).filter((r) => r[0] !== undefined && r[0] !== '').length;
  console.log(`Filas de datos: ${filas}.`);

  const indices = COLUMNAS_A_BORRAR
    .map((nombre) => ({ nombre, idx: header.indexOf(nombre) }))
    .filter((c) => c.idx !== -1);

  if (indices.length === 0) {
    console.log('\nNinguna de las columnas a borrar está en el encabezado: ya se aplicó esta migración.');
  } else {
    console.log('\nSe van a borrar (por posición, de mayor a menor índice para no correrse):');
    indices.forEach((c) => console.log(`  - "${c.nombre}" (columna ${colLetter(c.idx + 1)})`));
  }

  const yaTieneAgregadas = COLUMNAS_A_AGREGAR.every((c) => header.includes(c));
  console.log(
    yaTieneAgregadas
      ? '\nLas columnas nuevas (precio_especial, costo_envio) ya están.'
      : `\nSe van a agregar al final: ${COLUMNAS_A_AGREGAR.join(', ')}.`,
  );

  if (indices.length === 0 && yaTieneAgregadas) {
    console.log('\nNada para hacer.');
    return;
  }

  if (!args.apply) {
    console.log('\nModo lectura: no se escribió nada.');
    console.log('Para aplicar: --apply --confirmo-borrado (las dos, a propósito).');
    return;
  }
  if (indices.length > 0 && !confirmoBorrado) {
    console.log('\n--apply solo no alcanza para borrar columnas: falta --confirmo-borrado.');
    process.exit(1);
  }

  // 1. Backup completo de la pestaña, antes de tocar nada.
  const full = await api.spreadsheets.values.get({ spreadsheetId: sheetId, range: `'${tab}'!A:${colLetter(header.length)}` });
  const backupDir = path.resolve(__dirname, 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `${tab.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(full.data.values || [], null, 2), 'utf8');
  console.log(`\nBackup guardado en ${backupFile} (${(full.data.values || []).length} filas, header incluido).`);

  // 2. Borrar columnas, de mayor índice a menor.
  const requests = [...indices]
    .sort((a, b) => b.idx - a.idx)
    .map((c) => ({
      deleteDimension: {
        range: { sheetId: gridSheetId, dimension: 'COLUMNS', startIndex: c.idx, endIndex: c.idx + 1 },
      },
    }));
  if (requests.length > 0) {
    await api.spreadsheets.batchUpdate({ spreadsheetId: sheetId, requestBody: { requests } });
    console.log(`Borradas: ${indices.map((c) => c.nombre).join(', ')}.`);
  }

  // 3. Agregar las columnas nuevas al final (leyendo el header de nuevo,
  //    porque el borrado de arriba lo cambió).
  if (!yaTieneAgregadas) {
    const header2Res = await api.spreadsheets.values.get({ spreadsheetId: sheetId, range: `'${tab}'!1:1` });
    const header2 = (header2Res.data.values || [[]])[0] || [];
    const faltantes = COLUMNAS_A_AGREGAR.filter((c) => !header2.includes(c));
    const inicio = header2.length + 1;
    await api.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `'${tab}'!${colLetter(inicio)}1:${colLetter(inicio + faltantes.length - 1)}1`,
      valueInputOption: 'RAW',
      requestBody: { values: [faltantes] },
    });
    if (filas > 0) {
      const filaBackfill = faltantes.map(() => 'FALSE'); // precio_especial=FALSE; costo_envio backfillea abajo
      const colCostoEnvio = faltantes.indexOf('costo_envio');
      if (colCostoEnvio !== -1) filaBackfill[colCostoEnvio] = 0;
      await api.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `'${tab}'!${colLetter(inicio)}2:${colLetter(inicio + faltantes.length - 1)}${filas + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: Array.from({ length: filas }, () => filaBackfill) },
      });
    }
    console.log(`Agregadas: ${faltantes.join(', ')} (backfill FALSE/0 en las ${filas} filas existentes).`);
  }

  console.log('\nListo. Corré scripts/verificar.js ahora mismo para confirmar que nada se corrió de lugar.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
