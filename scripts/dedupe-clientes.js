// Fase 2 — propone fusiones de clientes duplicados. NUNCA escribe nada acá:
// solo imprime candidatos para que los revises antes de correr apply-merge.js.
// Criterios: mismo teléfono, mismo nombre_normalizado, o un nombre "dudoso"
// (cortado a 22 caracteres por MercadoPago) que es prefijo de un nombre más largo.
const { inicializar } = require('./_lib/cli');
inicializar();

const { readSheet } = require('../netlify/functions/_lib/sheets');

const soloDigitos = (s) => String(s || '').replace(/\D/g, '');

function agruparPor(clientes, clave) {
  const m = new Map();
  for (const c of clientes) {
    const k = clave(c);
    if (!k) continue;
    m.set(k, [...(m.get(k) || []), c]);
  }
  return Array.from(m.values()).filter((grupo) => grupo.length > 1);
}

function imprimirGrupo(motivo, grupo) {
  console.log(`\n[${motivo}]`);
  grupo
    .sort((a, b) => (b.hist_facturacion || 0) - (a.hist_facturacion || 0))
    .forEach((c, i) => {
      console.log(
        `  ${i === 0 ? '→ ' : '  '}${c.id}  "${c.nombre}"  tel:${c.telefono || '—'}  ` +
        `compras:${c.hist_compras || 0}  facturación:${c.hist_facturacion || 0}` +
        `${c.nombre_dudoso ? '  (nombre dudoso)' : ''}`,
      );
    });
  console.log(`  Sugerido sobreviviente: el primero (→), por mayor facturación histórica.`);
}

async function main() {
  const clientes = await readSheet('clientes'); // solo activos

  console.log(`Clientes activos: ${clientes.length}.\n`);
  console.log('Buscando candidatos a fusión (esto NUNCA escribe nada)...');

  let totalGrupos = 0;

  const porTelefono = agruparPor(clientes, (c) => (soloDigitos(c.telefono).length >= 6 ? soloDigitos(c.telefono) : null));
  porTelefono.forEach((g) => { imprimirGrupo('mismo teléfono', g); totalGrupos++; });

  const porNombre = agruparPor(clientes, (c) => c.nombre_normalizado || null);
  porNombre.forEach((g) => { imprimirGrupo('mismo nombre normalizado', g); totalGrupos++; });

  const dudosos = clientes.filter((c) => c.nombre_dudoso && c.nombre_normalizado);
  const noDudosos = clientes.filter((c) => !c.nombre_dudoso && c.nombre_normalizado);
  for (const d of dudosos) {
    const candidatos = noDudosos.filter(
      (n) => n.id !== d.id && n.nombre_normalizado.startsWith(d.nombre_normalizado) && n.nombre_normalizado !== d.nombre_normalizado,
    );
    if (candidatos.length > 0) {
      imprimirGrupo(`nombre dudoso "${d.nombre}" parece prefijo de`, [d, ...candidatos]);
      totalGrupos++;
    }
  }

  console.log(`\n${totalGrupos} grupo(s) candidato(s) a revisar.`);
  console.log(
    'Ninguno se fusiona solo. Para aplicar una fusión puntual, una vez que la confirmes:\n' +
    '  node scripts/apply-merge.js --from <id_perdedor> --into <id_sobreviviente> --apply',
  );
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
