// Handler generico de CRUD sobre una hoja. ventas.js, gastos.js, clientes.js
// y listas.js son cuatro lineas cada uno porque toda la logica esta aca.
const { readSheet, appendRow, updateRowById, softDeleteById } = require('./sheets');
const { checkKey } = require('./auth');
const { ok, fail, fromGoogleError } = require('./respond');
const { SHEETS, newId, validate } = require('./schema');
const cache = require('./cache');

function makeHandler(sheetName, idPrefix, { beforeSave } = {}) {
  return async function handler(event) {
    const auth = checkKey(event);
    if (!auth.ok) return fail(401, auth.reason);

    const def = SHEETS[sheetName];
    if (def.readOnly && event.httpMethod !== 'GET') {
      return fail(405, 'Esta hoja es solo de lectura.');
    }

    try {
      if (event.httpMethod === 'GET') {
        return ok({ items: await readSheet(sheetName) });
      }

      let payload = {};
      if (event.body) {
        try { payload = JSON.parse(event.body); }
        catch { return fail(400, 'El pedido llegó mal formado.'); }
      }

      if (event.httpMethod === 'POST') {
        const { ok: valid, errors, value } = validate(sheetName, payload);
        if (!valid) return fail(422, errors[0], { errors });

        const key = def.keyColumn || 'id';
        if (key === 'id') value.id = newId(idPrefix);
        if (def.columns.includes('creado_en')) value.creado_en = new Date().toISOString();
        if (def.columns.includes('activo')) value.activo = true;
        if (beforeSave) await beforeSave(value);

        await appendRow(sheetName, value);
        cache.clear();
        return ok({ item: value }, 201);
      }

      if (event.httpMethod === 'PUT') {
        const key = def.keyColumn || 'id';
        const id = payload[key];
        if (!id) return fail(400, `Falta "${key}" para saber qué registro editar.`);

        const { ok: valid, errors, value } = validate(sheetName, payload);
        if (!valid) return fail(422, errors[0], { errors });

        delete value.creado_en; // no se pisa nunca
        if (beforeSave) await beforeSave(value);
        const item = await updateRowById(sheetName, id, value);
        cache.clear();
        return ok({ item });
      }

      if (event.httpMethod === 'DELETE') {
        const key = def.keyColumn || 'id';
        const id = payload[key] || event.queryStringParameters?.[key];
        if (!id) return fail(400, `Falta "${key}" para saber qué registro borrar.`);
        await softDeleteById(sheetName, id);
        cache.clear();
        return ok({ borrado: id });
      }

      return fail(405, 'Método no permitido.');
    } catch (err) {
      if (err.code === 404) return fail(404, err.message);
      if (err.code === 409) return fail(409, err.message);
      if (err.code === 500) return fail(500, err.message);
      return fromGoogleError(err);
    }
  };
}

module.exports = { makeHandler };
