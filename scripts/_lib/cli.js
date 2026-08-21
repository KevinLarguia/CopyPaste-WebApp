// Utilidades compartidas por todos los scripts de scripts/*.js.
// Uso típico:
//   node scripts/migrate-faseN-x.js                    -> modo lectura (default)
//   node scripts/migrate-faseN-x.js --apply             -> escribe de verdad
//   node scripts/migrate-faseN-x.js --sheet-id <otroId> -> apunta a otra planilla
//     (por ejemplo una copia, para probar sin tocar la real)
const fs = require('fs');
const path = require('path');

// Node no carga .env.local solo: los scripts corren fuera de netlify dev.
// Lee .env.local (y .env como fallback) del root del repo y completa
// process.env sin pisar variables que ya estén seteadas en el shell.
function cargarEnv() {
  const root = path.resolve(__dirname, '..', '..');
  for (const nombre of ['.env.local', '.env']) {
    const p = path.join(root, nombre);
    if (!fs.existsSync(p)) continue;
    const contenido = fs.readFileSync(p, 'utf8');
    for (const linea of contenido.split('\n')) {
      const l = linea.trim();
      if (!l || l.startsWith('#')) continue;
      const igual = l.indexOf('=');
      if (igual === -1) continue;
      const clave = l.slice(0, igual).trim();
      let valor = l.slice(igual + 1).trim();
      if (
        (valor.startsWith('"') && valor.endsWith('"')) ||
        (valor.startsWith("'") && valor.endsWith("'"))
      ) {
        valor = valor.slice(1, -1);
      }
      if (process.env[clave] === undefined) process.env[clave] = valor;
    }
  }
}

function parseArgs(argv) {
  const args = { apply: false, sheetId: null, _: [], flags: new Set() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') args.apply = true;
    else if (a === '--sheet-id') args.sheetId = argv[++i];
    else if (a.startsWith('--')) args.flags.add(a.slice(2));
    else args._.push(a);
  }
  return args;
}

function inicializar() {
  cargarEnv();
  const args = parseArgs(process.argv.slice(2));
  if (args.sheetId) process.env.GOOGLE_SHEET_ID = args.sheetId;

  if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    console.error(
      'Faltan credenciales. Necesito GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL y ' +
      'GOOGLE_PRIVATE_KEY en .env.local (o pasadas por variables de entorno).',
    );
    process.exit(1);
  }

  console.log(
    `Planilla: ${process.env.GOOGLE_SHEET_ID}${args.sheetId ? ' (override --sheet-id)' : ''}\n` +
    `Modo: ${args.apply ? 'ESCRITURA (--apply)' : 'lectura / diagnóstico (default, no escribe nada)'}\n`,
  );

  return args;
}

module.exports = { inicializar, parseArgs, cargarEnv };
