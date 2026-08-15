const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const ok = (body, status = 200) => ({
  statusCode: status, headers: JSON_HEADERS, body: JSON.stringify(body),
});

const fail = (status, message, extra = {}) => ({
  statusCode: status, headers: JSON_HEADERS,
  body: JSON.stringify({ error: message, ...extra }),
});

// Traduce el error crudo de Google a algo que un empleado pueda entender
// y que le diga si tiene que reintentar o llamar a alguien.
function fromGoogleError(err) {
  const status = err?.code || err?.response?.status;
  const detail = err?.errors?.[0]?.reason || err?.message || '';

  if (status === 429 || /rateLimitExceeded|quota/i.test(detail)) {
    return fail(429, 'Google está recibiendo demasiados pedidos. Esperá unos segundos y volvé a guardar. El dato no se perdió.', { retriable: true });
  }
  if (status === 403) {
    return fail(403, 'La planilla no está compartida con la cuenta de servicio, o la Sheets API está deshabilitada en Google Cloud.');
  }
  if (status === 404) {
    return fail(404, 'No se encontró la planilla. Revisá GOOGLE_SHEET_ID.');
  }
  if (/DECODER|PEM|private key/i.test(detail)) {
    return fail(500, 'La clave privada de Google está mal cargada. Revisá GOOGLE_PRIVATE_KEY en Netlify (tiene que incluir los \\n).');
  }
  console.error('[sheets]', err);
  return fail(502, 'No se pudo conectar con la planilla. Probá de nuevo en un minuto.', { retriable: true });
}

module.exports = { ok, fail, fromGoogleError, JSON_HEADERS };
