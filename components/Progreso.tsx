'use client';

export default function Progreso({
  etiqueta, ratio, texto, tono = 'pos',
}: { etiqueta: string; ratio: number; texto: string; tono?: 'pos' | 'neg' | 'gold' }) {
  const ancho = Math.max(0, Math.min(1, ratio)) * 100;
  const color = tono === 'pos' ? 'bg-pos' : tono === 'neg' ? 'bg-neg' : 'bg-gold';
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span>{etiqueta}</span>
        <span className="cifra font-mono text-[13px] font-semibold">{texto}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-rule">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${ancho}%` }} />
      </div>
    </div>
  );
}
