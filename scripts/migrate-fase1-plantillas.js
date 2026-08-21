// Fase 1.1 — crea la hoja `plantillas` y carga las 8 plantillas semilla.
// Lectura por default; agregá --apply para escribir de verdad.
// Idempotente: si una plantilla con el mismo nombre ya está cargada, la salta.
const { inicializar } = require('./_lib/cli');
const args = inicializar();

const { getClient, readSheet, appendRow, colLetter } = require('../netlify/functions/_lib/sheets');
const { SHEETS, newId } = require('../netlify/functions/_lib/schema');

// hojas_por_unidad en 0 para "Apunte / cuadernillo anillado": ese trabajo no
// escala por plancha como los demás, usa el campo `hojas` de la venta
// directamente (según la spec original). Ese campo recién existe desde la
// Fase 3 — hasta entonces esta plantilla no aporta hojas, solo minutos.
const SEMILLA = [
  { nombre: 'Plancha vinilo A4 troquelada', producto: 'Stickers troquelados / corte de contorno', maquina: 'T3170', material: 'Vinilo', hojas_por_unidad: 1, min_impresion_por_unidad: 2.5, min_corte_por_unidad: 5, min_archivo_fijo: 8, terminacion: '' },
  { nombre: 'Plancha adhesivo A4 troquelada', producto: 'Stickers troquelados / corte de contorno', maquina: 'L5590', material: 'Adhesivo fotográfico', hojas_por_unidad: 1, min_impresion_por_unidad: 2, min_corte_por_unidad: 5, min_archivo_fijo: 8, terminacion: '' },
  { nombre: 'Apunte / cuadernillo anillado', producto: 'Cuadernillos / anillados', maquina: 'J6955', material: 'Común', hojas_por_unidad: 0, min_impresion_por_unidad: 0.05, min_corte_por_unidad: 0.02, min_archivo_fijo: 5, terminacion: 'Anillado' },
  { nombre: 'Fotocopias BN', producto: 'Fotocopias / impresión BN', maquina: 'J6955', material: 'Común', hojas_por_unidad: 0.5, min_impresion_por_unidad: 0.15, min_corte_por_unidad: 0, min_archivo_fijo: 2, terminacion: '' },
  { nombre: 'Impresión color A4', producto: 'Impresión color A4', maquina: 'J6955', material: 'Común', hojas_por_unidad: 1, min_impresion_por_unidad: 1.75, min_corte_por_unidad: 0, min_archivo_fijo: 3, terminacion: '' },
  { nombre: 'Impresión A4 papel especial', producto: 'Impresión color A4', maquina: 'L5590', material: 'Fotográfico 200gr', hojas_por_unidad: 1, min_impresion_por_unidad: 2, min_corte_por_unidad: 0, min_archivo_fijo: 3, terminacion: '' },
  { nombre: 'Impresión color A3', producto: 'Impresión color A3', maquina: 'J6955', material: 'Común', hojas_por_unidad: 1, min_impresion_por_unidad: 3, min_corte_por_unidad: 0, min_archivo_fijo: 2, terminacion: '' },
  { nombre: 'Polaroids / fotos', producto: 'Polaroids / fotos', maquina: 'L5590', material: 'Fotográfico', hojas_por_unidad: 0.25, min_impresion_por_unidad: 0.5, min_corte_por_unidad: 0.5, min_archivo_fijo: 3, terminacion: '' },
];

async function main() {
  const { api, sheetId } = getClient();
  const cols = SHEETS.plantillas.columns;

  const meta = await api.spreadsheets.get({ spreadsheetId: sheetId });
  const yaExiste = (meta.data.sheets || []).some((s) => s.properties.title === 'plantillas');

  if (!yaExiste) {
    console.log('La pestaña "plantillas" no existe todavía.');
    console.log(`Se va a crear con estas columnas: ${cols.join(', ')}`);
    if (args.apply) {
      await api.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: 'plantillas' } } }] },
      });
      await api.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `plantillas!A1:${colLetter(cols.length)}1`,
        valueInputOption: 'RAW',
        requestBody: { values: [cols] },
      });
      console.log('Pestaña "plantillas" creada con su encabezado.');
    }
  } else {
    console.log('La pestaña "plantillas" ya existe.');
  }

  const existentes = yaExiste || args.apply ? await readSheet('plantillas') : [];
  const nombresExistentes = new Set(existentes.map((p) => p.nombre));

  const aInsertar = SEMILLA.filter((s) => !nombresExistentes.has(s.nombre));
  console.log(
    `\nPlantillas semilla: ${SEMILLA.length}. Ya cargadas: ${SEMILLA.length - aInsertar.length}. ` +
    `A insertar: ${aInsertar.length}.`,
  );
  aInsertar.forEach((s, i) => console.log(`  ${i + 1}. ${s.nombre} (${s.producto})`));

  if (!args.apply) {
    console.log('\nModo lectura: no se escribió nada. Corré de nuevo con --apply para aplicar.');
    return;
  }

  for (const s of aInsertar) {
    await appendRow('plantillas', {
      id: newId('p'),
      nombre: s.nombre,
      producto: s.producto,
      maquina: s.maquina,
      material: s.material,
      hojas_por_unidad: s.hojas_por_unidad,
      min_impresion_por_unidad: s.min_impresion_por_unidad,
      min_corte_por_unidad: s.min_corte_por_unidad,
      min_archivo_fijo: s.min_archivo_fijo,
      terminacion: s.terminacion,
      orden: SEMILLA.indexOf(s) + 1,
      activo: true,
    });
  }
  console.log(`\nListo: ${aInsertar.length} plantillas insertadas.`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
