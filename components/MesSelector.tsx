'use client';

import { nombreMes } from '@/lib/format';
import { claseInput } from './ui';

export default function MesSelector({
  meses, valor, onChange,
}: { meses: number[]; valor: number; onChange: (m: number) => void }) {
  if (meses.length === 0) return null;
  return (
    <label className="flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Mes</span>
      <select
        className={`${claseInput} h-9 w-auto py-0 text-sm`}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {meses.map((m) => (
          <option key={m} value={m}>{nombreMes(m)}</option>
        ))}
      </select>
    </label>
  );
}
