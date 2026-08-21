// Fase 3.2 — calcula costo_materiales en vez de que se tipee a mano.
// Espejo de la misma lógica en lib/calc.ts (client, para la vista previa);
// se mantienen sincronizadas a mano, igual que ya pasa entre este archivo
// y lib/types.ts.
const { readSheet } = require('./sheets');

// carillas = hojas: asumimos impresión a una faz. Doble faz (2 carillas,
// 1 hoja) todavía no está modelado - si hace falta, agregar un campo aparte.
function tarifaVigente(tarifas, tipo, clave, fecha) {
  if (!clave) return 0;
  const candidatas = tarifas.filter(
    (t) => t.tipo === tipo && t.clave === clave && t.activo !== false && t.vigente_desde <= fecha,
  );
  if (candidatas.length === 0) return 0;
  candidatas.sort((a, b) => (a.vigente_desde < b.vigente_desde ? 1 : -1));
  return candidatas[0].valor || 0;
}

function calcularCostoMateriales(tarifas, venta) {
  const hojas = venta.hojas || 0;
  const cantidad = venta.cantidad || 0;
  const fecha = venta.fecha;
  const tarifaPapel = tarifaVigente(tarifas, 'papel', venta.material, fecha);
  const tarifaTinta = tarifaVigente(tarifas, 'tinta', venta.maquina, fecha);
  const tarifaTerminacion = venta.terminacion ? tarifaVigente(tarifas, 'terminacion', venta.terminacion, fecha) : 0;
  return hojas * (tarifaPapel + tarifaTinta) + cantidad * tarifaTerminacion;
}

// Hook de crud.js: se llama con el payload ya validado, antes de escribir.
// Si el usuario marcó el costo como corregido a mano, se respeta tal cual.
async function aplicarCosteo(value) {
  if (value.costo_materiales_override) return value;
  const tarifas = await readSheet('tarifas');
  value.costo_materiales = calcularCostoMateriales(tarifas, value);
  return value;
}

module.exports = { aplicarCosteo, calcularCostoMateriales, tarifaVigente };
