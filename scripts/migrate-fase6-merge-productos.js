// Fase 6 — fusiona categorías de producto que en la práctica resultaron ser
// lo mismo que otra ya existente. 100% dato, 0% código de la app: `porProducto`
// ya agrupa por lo que sea que diga `producto`, así que reescribir el valor
// alcanza. Reescribe las filas de `ventas` que usan la categoría vieja, y
// desactiva (no borra) la entrada vieja en `listas`.
// Lectura por default; agregá --apply para escribir de verdad. Idempotente.
const { inicializar } = require('./_lib/cli');
const args = inicializar();

const { readSheet, updateRowById } = require('../netlify/functions/_lib/sheets');
const { MERGE_PRODUCTOS } = require('./_lib/seed-data');

async function main() {
  const ventas = await readSheet('ventas', { includeInactive: true });
  const listas = await readSheet('listas', { includeInactive: true });

  for (const { de, a } of MERGE_PRODUCTOS) {
    const filas = ventas.filter((v) => v.producto === de);
    console.log(`\n"${de}" -> "${a}": ${filas.length} ventas afectadas.`);

    if (args.apply) {
      for (const v of filas) {
        await updateRowById('ventas', v.id, { producto: a });
      }
      console.log(`  Reescritas: ${filas.length}.`);
    }

    const listaVieja = listas.find((l) => l.tipo === 'producto' && l.valor === de && l.activo !== false);
    if (listaVieja) {
      console.log(`  Se va a desactivar "${de}" en listas (queda "${a}" como única opción).`);
      if (args.apply) {
        await updateRowById('listas', de, { activo: false });
        console.log('  Desactivada.');
      }
    } else {
      console.log(`  "${de}" ya estaba desactivada o no está en listas.`);
    }
  }

  if (!args.apply) {
    console.log('\nModo lectura: no se escribió nada. Corré de nuevo con --apply para aplicar.');
  } else {
    console.log('\nListo. Corré scripts/verificar.js para confirmar que nada se corrió de lugar.');
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
