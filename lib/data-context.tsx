'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ErrorApi } from './api';
import type { Dataset, ItemLista } from './types';

const VACIO: Dataset = {
  ventas: [], gastos: [], clientes: [], listas: [], historico: [], plantillas: [], tarifas: [],
  contadores: [], leidoEn: '',
};

type Estado = {
  data: Dataset;
  cargando: boolean;
  error: string | null;
  recargar: (fresh?: boolean) => Promise<void>;
  opciones: (tipo: ItemLista['tipo']) => string[];
};

const Ctx = createContext<Estado>({
  data: VACIO, cargando: true, error: null,
  recargar: async () => {}, opciones: () => [],
});

export function ProveedorDatos({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Dataset>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async (fresh = false) => {
    setCargando(true);
    try {
      const d = await api.data(fresh);
      setData(d);
      setError(null);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudieron traer los datos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { recargar(); }, [recargar]);

  const opciones = useCallback((tipo: ItemLista['tipo']) =>
    data.listas
      .filter((l) => l.tipo === tipo && l.activo !== false)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0))
      .map((l) => l.valor),
  [data.listas]);

  const value = useMemo(
    () => ({ data, cargando, error, recargar, opciones }),
    [data, cargando, error, recargar, opciones],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useDatos = () => useContext(Ctx);
