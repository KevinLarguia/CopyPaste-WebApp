const pesos = new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
});

export const money = (n: number | null | undefined) =>
  n === null || n === undefined || !Number.isFinite(n) ? '—' : pesos.format(Math.round(n));

export const pct = (n: number | null | undefined, dec = 1) =>
  n === null || n === undefined || !Number.isFinite(n) ? '—' : `${(n * 100).toFixed(dec)}%`;

export const num = (n: number | null | undefined, dec = 0) =>
  n === null || n === undefined || !Number.isFinite(n)
    ? '—'
    : n.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

export const hoy = () => new Date().toISOString().slice(0, 10);

export function fechaCorta(iso: string) {
  if (!iso || iso.length < 10) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a.slice(2)}`;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function nombreMes(clave: number) {
  const a = Math.floor(clave / 100);
  const m = clave % 100;
  return `${MESES[m - 1] ?? '??'} ${a}`;
}

// Evalúa expresiones tipo "15*127+200" que los chicos ya escriben en el Excel.
// Solo dígitos y operadores: nada que pueda ejecutar código.
export function evaluarExpresion(entrada: string): number | null {
  const s = String(entrada ?? '').trim().replace(/^=/, '').replace(/,/g, '.');
  if (!s) return null;
  if (!/^[\d\s+\-*/().]+$/.test(s)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const r = Function(`"use strict"; return (${s});`)();
    return Number.isFinite(r) && r >= 0 ? r : null;
  } catch {
    return null;
  }
}

export const esExpresion = (s: string) => /[+\-*/()]/.test(String(s ?? '').replace(/^-/, ''));

// Solo dígitos: sirve tanto para comparar teléfonos escritos con distinto
// formato como para armar el link de wa.me (que los quiere sin "+" ni espacios).
export const normalizarTelefono = (s: string) => String(s ?? '').replace(/\D/g, '');

export function waLink(telefono: string): string | null {
  const d = normalizarTelefono(telefono);
  return d.length >= 8 ? `https://wa.me/${d}` : null;
}
