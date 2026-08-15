// Clave unica compartida del local. No es un sistema de usuarios:
// es la diferencia entre "cualquiera con el link" y "cualquiera del local".
const crypto = require('crypto');

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function checkKey(event) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return { ok: true }; // sin APP_PASSWORD la app queda abierta
  const given = event.headers['x-app-key'] || event.headers['X-App-Key'] || '';
  if (!given) return { ok: false, reason: 'Falta la clave del local.' };
  if (!safeEqual(given, expected)) return { ok: false, reason: 'La clave no es correcta.' };
  return { ok: true };
}

module.exports = { checkKey };
