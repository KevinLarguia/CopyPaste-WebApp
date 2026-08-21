// Fase 2 — aplica UNA fusión de clientes puntual, ya revisada a mano (por
// ejemplo, con dedupe-clientes.js). Reasigna las ventas del perdedor al
// sobreviviente, suma los históricos, y desactiva al perdedor (nunca lo
// borra: restricción #3 del plan).
// Uso:
//   node scripts/apply-merge.js --from <id_perdedor> --into <id_sobreviviente>
//   node scripts/apply-merge.js --from <id_perdedor> --into <id_sobreviviente> --apply
const { inicializar } = require('./_lib/cli');
const args = inicializar();

const { readSheet, updateRowById, softDeleteById } = require('../netlify/functions/_lib/sheets');

function valorDeFlag(nombre) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i === -1 ? null : process.argv[i + 1];
}

async function main() {
  const from = valorDeFlag('from');
  const into = valorDeFlag('into');
  if (!from || !into) {
    console.error('Uso: node scripts/apply-merge.js --from <id_perdedor> --into <id_sobreviviente> [--apply]');
    process.exit(1);
  }
  if (from === into) throw new Error('--from y --into no pueden ser el mismo id.');

  const clientes = await readSheet('clientes', { includeInactive: true });
  const perdedor = clientes.find((c) => c.id === from);
  const sobreviviente = clientes.find((c) => c.id === into);
  if (!perdedor) throw new Error(`No encontré el cliente "${from}".`);
  if (!sobreviviente) throw new Error(`No encontré el cliente "${into}".`);

  const ventas = await readSheet('ventas', { includeInactive: true });
  const ventasAMover = ventas.filter((v) => v.cliente_id === from);

  const compras = (sobreviviente.hist_compras || 0) + (perdedor.hist_compras || 0);
  const facturacion = (sobreviviente.hist_facturacion || 0) + (perdedor.hist_facturacion || 0);
  const ultimaCompra = [sobreviviente.hist_ultima_compra, perdedor.hist_ultima_compra]
    .filter(Boolean).sort().slice(-1)[0] || '';
  const telefono = sobreviviente.telefono || perdedor.telefono || '';

  console.log(`Perdedor:      ${perdedor.id}  "${perdedor.nombre}"  tel:${perdedor.telefono || '—'}`);
  console.log(`Sobreviviente: ${sobreviviente.id}  "${sobreviviente.nombre}"  tel:${sobreviviente.telefono || '—'}`);
  console.log(`\nVentas a reasignar: ${ventasAMover.length}.`);
  console.log(
    `Históricos combinados -> compras: ${compras}, facturación: ${facturacion}, ` +
    `última compra: ${ultimaCompra || '—'}, teléfono: ${telefono || '—'}.`,
  );
  console.log(`El cliente "${perdedor.id}" queda desactivado (activo=false), no se borra la fila.`);

  if (!args.apply) {
    console.log('\nModo lectura: no se escribió nada. Corré de nuevo con --apply para aplicar.');
    return;
  }

  for (const v of ventasAMover) {
    await updateRowById('ventas', v.id, { cliente_id: sobreviviente.id, cliente_nombre: sobreviviente.nombre });
  }

  await updateRowById('clientes', sobreviviente.id, {
    hist_compras: compras,
    hist_facturacion: facturacion,
    hist_ultima_compra: ultimaCompra,
    telefono,
  });

  await softDeleteById('clientes', perdedor.id);

  console.log(`\nListo: ${ventasAMover.length} ventas reasignadas, históricos combinados, perdedor desactivado.`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
