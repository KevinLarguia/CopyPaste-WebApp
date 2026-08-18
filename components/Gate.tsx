'use client';

import { useEffect, useState } from 'react';
import { guardarClave, leerClave } from '@/lib/api';
import { Boton, Input } from './ui';

// Clave unica compartida. No identifica a nadie: solo evita que la app quede
// abierta a cualquiera que reciba el link por WhatsApp.
export default function Gate({ children }: { children: React.ReactNode }) {
  const [listo, setListo] = useState(false);
  const [tieneClave, setTieneClave] = useState(false);
  const [valor, setValor] = useState('');

  useEffect(() => {
    setTieneClave(Boolean(leerClave()));
    setListo(true);
  }, []);

  if (!listo) return null;

  if (!tieneClave) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-5">
        <div className="marca w-full max-w-sm rounded-2xl border border-rule bg-paper p-7 shadow-card">
          <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-spot">Copy-Paste</div>
          <h1 className="mb-1 text-lg font-semibold">Clave del local</h1>
          <p className="mb-5 text-sm text-muted">
            Se pide una sola vez por dispositivo. Después queda guardada.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!valor.trim()) return;
              guardarClave(valor.trim());
              setTieneClave(true);
            }}
          >
            <Input
              type="password"
              autoFocus
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="Clave"
              aria-label="Clave del local"
            />
            <Boton type="submit" tipo="primario" className="mt-3 w-full">
              Entrar
            </Boton>
          </form>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
