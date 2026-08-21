// GET /api/data -> devuelve todo el dataset en una sola llamada.
// Un solo batchGet en vez de 5 requests: menos latencia y menos cuota.
const { readAll } = require('./_lib/sheets');
const { checkKey } = require('./_lib/auth');
const { ok, fail, fromGoogleError } = require('./_lib/respond');

// Cache en memoria del contenedor. Es best-effort: Netlify puede levantar y
// matar contenedores cuando quiere, asi que nunca es la fuente de verdad.
// Cualquier escritura la invalida (ver _lib/cache.js).
const cache = require('./_lib/cache');
const TTL_MS = 20000;

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return fail(405, 'Método no permitido.');

  const auth = checkKey(event);
  if (!auth.ok) return fail(401, auth.reason);

  try {
    const fresh = event.queryStringParameters?.fresh === '1';
    const hit = cache.get('data');
    if (!fresh && hit && Date.now() - hit.at < TTL_MS) {
      return ok({ ...hit.value, cached: true });
    }

    const data = await readAll([
      'ventas', 'gastos', 'clientes', 'listas', 'historico_mensual', 'plantillas', 'tarifas',
    ]);

    const value = {
      ventas: data.ventas || [],
      gastos: data.gastos || [],
      clientes: data.clientes || [],
      listas: data.listas || [],
      historico: data.historico_mensual || [],
      plantillas: data.plantillas || [],
      tarifas: data.tarifas || [],
      leidoEn: new Date().toISOString(),
    };
    cache.set('data', { at: Date.now(), value });
    return ok(value);
  } catch (err) {
    if (err.code === 500) return fail(500, err.message);
    return fromGoogleError(err);
  }
};
