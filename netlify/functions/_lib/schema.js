// Unica fuente de verdad del orden de columnas de cada hoja.
// Si agregas una columna, agregala aca Y al final de la hoja en Google Sheets.

const SHEETS = {
  ventas: {
    columns: [
      'id', 'fecha', 'cliente_id', 'cliente_nombre', 'producto', 'cantidad',
      'precio', 'envio_cobrado', 'costo_materiales', 'costo_expresion',
      'min_impresion', 'min_corte', 'min_archivo', 'canal', 'etapa', 'notas',
      'telefono', 'creado_en', 'actualizado_en', 'activo', 'completo',
    ],
    numeric: ['cantidad', 'precio', 'envio_cobrado', 'costo_materiales',
      'min_impresion', 'min_corte', 'min_archivo'],
    required: ['fecha', 'cliente_nombre', 'producto', 'precio'],
  },
  gastos: {
    columns: ['id', 'fecha', 'categoria', 'detalle', 'monto', 'proveedor',
      'tipo', 'creado_en', 'actualizado_en', 'activo'],
    numeric: ['monto'],
    required: ['fecha', 'categoria', 'monto'],
  },
  clientes: {
    columns: ['id', 'nombre', 'nombre_normalizado', 'telefono', 'hist_compras',
      'hist_facturacion', 'hist_ultima_compra', 'nombre_dudoso', 'creado_en', 'activo'],
    numeric: ['hist_compras', 'hist_facturacion'],
    required: ['nombre'],
  },
  plantillas: {
    columns: [
      'id', 'nombre', 'producto', 'maquina', 'material', 'hojas_por_unidad',
      'min_impresion_por_unidad', 'min_corte_por_unidad', 'min_archivo_fijo',
      'terminacion', 'orden', 'activo',
    ],
    numeric: ['hojas_por_unidad', 'min_impresion_por_unidad', 'min_corte_por_unidad',
      'min_archivo_fijo', 'orden'],
    required: ['nombre', 'producto'],
  },
  listas: {
    columns: ['tipo', 'valor', 'orden', 'activo'],
    numeric: ['orden'],
    required: ['tipo', 'valor'],
    keyColumn: 'valor', // listas no tiene id: se identifica por tipo+valor
  },
  historico_mensual: {
    columns: ['concepto', 'mayo_2026', 'junio_2026', 'julio_2026'],
    numeric: [],
    required: [],
    readOnly: true,
  },
};

const CATEGORIAS_NO_OPERATIVAS = ['Retiro de socios', 'Envíos'];

function newId(prefix) {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 6);
  return `${prefix}${t}${r}`;
}

// Valida y normaliza el payload que llega del formulario.
// Devuelve { ok, errors, value }.
function validate(sheetName, payload) {
  const def = SHEETS[sheetName];
  const errors = [];
  const value = {};

  for (const col of def.columns) {
    let v = payload[col];
    if (v === undefined || v === null) v = '';

    if (def.numeric.includes(col)) {
      const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
      if (String(v).trim() === '') {
        value[col] = 0;
      } else if (!Number.isFinite(n)) {
        errors.push(`"${col}" tiene que ser un número.`);
      } else if (n < 0) {
        errors.push(`"${col}" no puede ser negativo.`);
      } else {
        value[col] = n;
      }
      continue;
    }

    if (col === 'fecha' || col === 'hist_ultima_compra') {
      const s = String(v).trim();
      if (s && !/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        errors.push(`"${col}" tiene que tener formato AAAA-MM-DD.`);
      }
      value[col] = s;
      continue;
    }

    value[col] = typeof v === 'string' ? v.trim() : v;
  }

  for (const col of def.required) {
    const v = value[col];
    if (v === '' || v === undefined || (def.numeric.includes(col) && v === 0 && col === 'precio')) {
      errors.push(`Falta completar "${col}".`);
    }
  }

  return { ok: errors.length === 0, errors, value };
}

module.exports = { SHEETS, CATEGORIAS_NO_OPERATIVAS, newId, validate };
