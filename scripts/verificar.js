// Chequeo a correr después de cada fase: lee todas las hojas, cuenta filas
// (activas + inactivas) y valida cada una con la misma `validate()` que usa
// la API. Si una columna se corrió de lugar (por ejemplo, tras borrar una
// columna sin actualizar schema.js), esto lo detecta enseguida en vez de
// descubrirlo con datos corruptos en producción.
// Uso: node scripts/verificar.js [--sheet-id <id>]
const { inicializar } = require('./_lib/cli');
const args = inicializar();

const { readSheet } = require('../netlify/functions/_lib/sheets');
const { SHEETS, validate } = require('../netlify/functions/_lib/schema');

async function main() {
  let huboErrores = false;

  for (const nombre of Object.keys(SHEETS)) {
    const def = SHEETS[nombre];
    let filas;
    try {
      filas = await readSheet(nombre, { includeInactive: true });
    } catch (err) {
      console.log(`✗ ${nombre}: no se pudo leer (${err.message})`);
      huboErrores = true;
      continue;
    }

    const activas = filas.filter((f) => f.activo !== false).length;
    console.log(`${nombre}: ${filas.length} filas (${activas} activas)`);

    if (def.readOnly) continue; // historico_mensual no tiene id/validate propios

    const key = def.keyColumn || 'id';
    const malas = [];
    for (const fila of filas) {
      const { ok, errors } = validate(nombre, fila);
      if (!ok) malas.push({ id: fila[key], errors });
    }

    if (malas.length > 0) {
      huboErrores = true;
      console.log(`  ✗ ${malas.length} filas no pasan validate():`);
      malas.slice(0, 15).forEach((m) => console.log(`    - ${m.id}: ${m.errors.join(' / ')}`));
      if (malas.length > 15) console.log(`    ...y ${malas.length - 15} más.`);
    } else {
      console.log(`  ✓ las ${filas.length} filas validan bien.`);
    }
  }

  console.log(huboErrores ? '\nHay problemas — revisar antes de seguir.' : '\nTodo bien.');
  process.exit(huboErrores ? 1 : 0);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
