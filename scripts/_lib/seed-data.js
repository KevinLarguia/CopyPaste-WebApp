// Datos semilla compartidos entre los scripts que migran contra la API de
// Google Sheets (migrate-fase1-plantillas.js, migrate-fase3-tarifas.js) y
// migrate-local-xlsx.js (que hace lo mismo sobre un archivo Excel local).
// Única fuente de verdad para no desincronizar los dos caminos.

// hojas_por_unidad en 0 para "Apunte / cuadernillo anillado": ese trabajo no
// escala por plancha como los demás, usa el campo `hojas` de la venta
// directamente (según la spec original). Ese campo recién existe desde la
// Fase 3 — hasta entonces esta plantilla no aporta hojas, solo minutos.
const PLANTILLAS_SEMILLA = [
  { nombre: 'Plancha vinilo A4 troquelada', producto: 'Stickers troquelados / corte de contorno', maquina: 'T3170', material: 'Vinilo', hojas_por_unidad: 1, min_impresion_por_unidad: 2.5, min_corte_por_unidad: 5, min_archivo_fijo: 8, terminacion: '' },
  { nombre: 'Plancha adhesivo A4 troquelada', producto: 'Stickers troquelados / corte de contorno', maquina: 'L5590', material: 'Adhesivo fotográfico', hojas_por_unidad: 1, min_impresion_por_unidad: 2, min_corte_por_unidad: 5, min_archivo_fijo: 8, terminacion: '' },
  { nombre: 'Apunte / cuadernillo anillado', producto: 'Cuadernillos / anillados', maquina: 'J6955', material: 'Común', hojas_por_unidad: 0, min_impresion_por_unidad: 0.05, min_corte_por_unidad: 0.02, min_archivo_fijo: 5, terminacion: 'Anillado' },
  { nombre: 'Fotocopias BN', producto: 'Fotocopias / impresión BN', maquina: 'J6955', material: 'Común', hojas_por_unidad: 0.5, min_impresion_por_unidad: 0.15, min_corte_por_unidad: 0, min_archivo_fijo: 2, terminacion: '' },
  { nombre: 'Impresión color A4', producto: 'Impresión color A4', maquina: 'J6955', material: 'Común', hojas_por_unidad: 1, min_impresion_por_unidad: 1.75, min_corte_por_unidad: 0, min_archivo_fijo: 3, terminacion: '' },
  { nombre: 'Impresión A4 papel especial', producto: 'Impresión color A4', maquina: 'L5590', material: 'Fotográfico 200gr', hojas_por_unidad: 1, min_impresion_por_unidad: 2, min_corte_por_unidad: 0, min_archivo_fijo: 3, terminacion: '' },
  { nombre: 'Impresión color A3', producto: 'Impresión color A3', maquina: 'J6955', material: 'Común', hojas_por_unidad: 1, min_impresion_por_unidad: 3, min_corte_por_unidad: 0, min_archivo_fijo: 2, terminacion: '' },
  { nombre: 'Polaroids / fotos', producto: 'Polaroids / fotos', maquina: 'L5590', material: 'Fotográfico', hojas_por_unidad: 0.25, min_impresion_por_unidad: 0.5, min_corte_por_unidad: 0.5, min_archivo_fijo: 3, terminacion: '' },
];

const VIGENTE_DESDE = '2026-08-01'; // antes de la primera venta real cargada

// Ver nota en migrate-fase3-tarifas.js: dos claves ajustadas respecto del
// documento original para que matcheen exacto con las plantillas de arriba
// ("Vinilo / film" -> "Vinilo", "Fotográfico 200gr brillante" -> "Fotográfico
// 200gr"), y dos materiales sin tarifa conocida en el documento original
// (quedan en $0, "a medir").
const TARIFAS_SEMILLA = [
  { tipo: 'papel', clave: 'Común', valor: 15, unidad: 'por hoja' },
  { tipo: 'papel', clave: 'Mate 220gr', valor: 200, unidad: 'por hoja' },
  { tipo: 'papel', clave: '240gr doble faz', valor: 250, unidad: 'por hoja' },
  { tipo: 'papel', clave: 'Fotográfico 200gr', valor: 133, unidad: 'por hoja' },
  { tipo: 'papel', clave: 'Vinilo', valor: 510, unidad: 'por hoja' },
  { tipo: 'papel', clave: 'Adhesivo fotográfico', valor: 0, unidad: 'por hoja (a medir)' },
  { tipo: 'papel', clave: 'Fotográfico', valor: 0, unidad: 'por hoja (a medir)' },
  { tipo: 'tinta', clave: 'J6955', valor: 2, unidad: 'por carilla' },
  { tipo: 'tinta', clave: 'L5590', valor: 0, unidad: 'por carilla (a medir)' },
  { tipo: 'tinta', clave: 'T3170', valor: 0, unidad: 'por m² (a medir)' },
  { tipo: 'terminacion', clave: 'Anillado', valor: 200, unidad: 'por unidad' },
];

// Fase 5 — antes había una sola categoría "Publicidad Meta" mezclando carga
// de saldo y consumo real. Se separa en dos; "canal" suma una opción para
// cuando no se preguntó (mejor que forzar una respuesta inventada).
const LISTAS_FASE5 = [
  { tipo: 'categoria_gasto', valor: 'Publicidad Meta (consumo)' },
  { tipo: 'categoria_gasto', valor: 'Saldo publicitario (carga)' },
  { tipo: 'canal', valor: 'No sé / no preguntado' },
];
const CATEGORIA_GASTO_VIEJA = 'Publicidad Meta';
const CATEGORIA_GASTO_NUEVA = 'Publicidad Meta (consumo)';

// Fase 6 — dos categorías de producto que en la práctica eran lo mismo que
// otra ya existente, según el uso real de las primeras semanas.
const MERGE_PRODUCTOS = [
  { de: 'Libros / apuntes', a: 'Cuadernillos / anillados' },
  { de: 'Etiquetas para productos', a: 'Stickers troquelados / corte de contorno' },
];

module.exports = {
  PLANTILLAS_SEMILLA, TARIFAS_SEMILLA, VIGENTE_DESDE,
  LISTAS_FASE5, CATEGORIA_GASTO_VIEJA, CATEGORIA_GASTO_NUEVA, MERGE_PRODUCTOS,
};
