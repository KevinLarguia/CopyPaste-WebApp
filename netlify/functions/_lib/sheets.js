const { google } = require('googleapis');
const { SHEETS } = require('./schema');

let _client = null;

function getClient() {
  if (_client) return _client;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!email || !key || !sheetId) {
    const faltan = [
      !sheetId && 'GOOGLE_SHEET_ID',
      !email && 'GOOGLE_SERVICE_ACCOUNT_EMAIL',
      !key && 'GOOGLE_PRIVATE_KEY',
    ].filter(Boolean).join(', ');
    const e = new Error(`Faltan variables de entorno: ${faltan}`);
    e.code = 500;
    throw e;
  }

  const auth = new google.auth.JWT({
    email,
    // Netlify guarda los saltos de linea como \n literales.
    key: key.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  _client = { api: google.sheets({ version: 'v4', auth }), sheetId };
  return _client;
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

function rangeOf(sheetName, fromRow, toRow) {
  const last = colLetter(SHEETS[sheetName].columns.length);
  const a = fromRow ? `A${fromRow}` : 'A';
  const b = toRow ? `${last}${toRow}` : last;
  return `${sheetName}!${a}:${b}`;
}

function rowToObject(sheetName, row) {
  const cols = SHEETS[sheetName].columns;
  const numeric = SHEETS[sheetName].numeric;
  const obj = {};
  cols.forEach((c, i) => {
    const raw = row[i] === undefined ? '' : row[i];
    if (numeric.includes(c)) {
      const n = parseFloat(String(raw).replace(',', '.'));
      obj[c] = Number.isFinite(n) ? n : 0;
    } else if (c === 'activo' || c === 'nombre_dudoso') {
      obj[c] = String(raw).toUpperCase() !== 'FALSE';
    } else {
      obj[c] = raw;
    }
  });
  return obj;
}

function objectToRow(sheetName, obj) {
  return SHEETS[sheetName].columns.map((c) => {
    const v = obj[c];
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    return v === undefined || v === null ? '' : v;
  });
}

// ---------------------------------------------------------------- lecturas

async function readSheet(sheetName, { includeInactive = false } = {}) {
  const { api, sheetId } = getClient();
  const res = await api.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: rangeOf(sheetName),
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  const rows = res.data.values || [];
  if (rows.length <= 1) return [];
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c === '' || c === undefined)) continue;
    const obj = rowToObject(sheetName, row);
    obj._row = i + 1; // fila real en la planilla (1-indexed, header incluido)
    if (!includeInactive && obj.activo === false) continue;
    out.push(obj);
  }
  return out;
}

async function readAll(names) {
  const { api, sheetId } = getClient();
  const res = await api.spreadsheets.values.batchGet({
    spreadsheetId: sheetId,
    ranges: names.map((n) => rangeOf(n)),
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  const out = {};
  (res.data.valueRanges || []).forEach((vr, idx) => {
    const name = names[idx];
    const rows = vr.values || [];
    const list = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every((c) => c === '' || c === undefined)) continue;
      const obj = rowToObject(name, row);
      obj._row = i + 1;
      if (obj.activo === false) continue;
      list.push(obj);
    }
    out[name] = list;
  });
  return out;
}

// --------------------------------------------------------------- escrituras

// append es atomico del lado de Google: dos empleados guardando al mismo
// tiempo generan dos filas distintas, nunca se pisan.
async function appendRow(sheetName, obj) {
  const { api, sheetId } = getClient();
  await api.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: rangeOf(sheetName),
    valueInputOption: 'RAW', // sin interpretacion de locale: las fechas quedan como texto ISO
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [objectToRow(sheetName, obj)] },
  });
  return obj;
}

// Busca la fila por id leyendo solo la columna clave. Devuelve el numero de
// fila real. Nunca se cachea: el indice de fila es lo unico que puede
// cambiar debajo nuestro.
async function findRow(sheetName, id) {
  const { api, sheetId } = getClient();
  const key = SHEETS[sheetName].keyColumn || 'id';
  const keyIdx = SHEETS[sheetName].columns.indexOf(key);
  const letter = colLetter(keyIdx + 1);
  const res = await api.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}!${letter}:${letter}`,
  });
  const values = res.data.values || [];
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0] || '') === String(id)) return i + 1;
  }
  return null;
}

// Lee la fila, la fusiona con el patch y la reescribe entera.
// Vuelve a verificar el id justo antes de escribir: si alguien movio filas
// en el medio, corta en vez de pisar el registro equivocado.
async function updateRowById(sheetName, id, patch) {
  const { api, sheetId } = getClient();
  const rowNum = await findRow(sheetName, id);
  if (!rowNum) {
    const e = new Error('El registro ya no existe. Alguien lo pudo haber borrado desde la planilla.');
    e.code = 404;
    throw e;
  }

  const cur = await api.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: rangeOf(sheetName, rowNum, rowNum),
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  const currentRow = (cur.data.values || [[]])[0] || [];
  const currentObj = rowToObject(sheetName, currentRow);

  const key = SHEETS[sheetName].keyColumn || 'id';
  if (String(currentObj[key]) !== String(id)) {
    const e = new Error('La planilla cambió mientras editabas. Recargá y probá de nuevo.');
    e.code = 409;
    throw e;
  }

  const merged = { ...currentObj, ...patch, [key]: currentObj[key] };
  delete merged._row;
  merged.actualizado_en = new Date().toISOString();

  await api.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: rangeOf(sheetName, rowNum, rowNum),
    valueInputOption: 'RAW',
    requestBody: { values: [objectToRow(sheetName, merged)] },
  });
  return merged;
}

// Borrado logico: la fila nunca se elimina, asi los numeros de fila del resto
// no se corren mientras otro empleado tiene un formulario abierto.
async function softDeleteById(sheetName, id) {
  return updateRowById(sheetName, id, { activo: false });
}

module.exports = {
  getClient, readSheet, readAll, appendRow, findRow,
  updateRowById, softDeleteById, rowToObject, objectToRow, colLetter,
};
