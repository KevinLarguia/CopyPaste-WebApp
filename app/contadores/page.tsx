'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useDatos } from '@/lib/data-context';
import { ventasFaltantes } from '@/lib/calc';
import { MAQUINAS } from '@/lib/constants';
import { fechaCorta, num } from '@/lib/format';
import {
  Aviso, Boton, Cargando, Celda, Fila, Numero, Seccion, Tabla, Titulo, Vacio,
} from '@/components/ui';

export default function Contadores() {
  const { data, cargando } = useDatos();

  const porMaquina = useMemo(() => {
    const m = new Map<string, typeof data.contadores>();
    MAQUINAS.forEach((maq) => m.set(maq, []));
    data.contadores.forEach((c) => m.set(c.maquina, [...(m.get(c.maquina) || []), c]));
    m.forEach((lecturas) => lecturas.sort((a, b) => (a.fecha < b.fecha ? 1 : -1)));
    return m;
  }, [data.contadores]);

  return (
    <>
      <Titulo
        subtitulo="Compara lo que cada máquina imprimió de verdad contra lo cargado en ventas."
        accion={<Link href="/contadores/nuevo/"><Boton tipo="primario">Cargar contador</Boton></Link>}
      >
        Contadores de páginas
      </Titulo>

      {cargando && data.contadores.length === 0 ? (
        <Cargando que="los contadores" />
      ) : (
        MAQUINAS.map((maquina) => {
          const lecturas = porMaquina.get(maquina) || [];
          const [ultima, anterior] = lecturas;
          const faltantes = ultima && anterior
            ? ventasFaltantes(data, maquina, anterior.fecha, ultima.fecha)
            : null;

          return (
            <Seccion key={maquina} titulo={maquina}>
              {lecturas.length === 0 ? (
                <Vacio>Todavía no hay contadores cargados para esta máquina.</Vacio>
              ) : (
                <>
                  {faltantes && (
                    <div className="mb-4">
                      {faltantes.diferencia === null ? null : faltantes.diferencia > 0 ? (
                        <Aviso tono="alerta">
                          Entre {fechaCorta(faltantes.desde)} y {fechaCorta(faltantes.hasta)} la máquina
                          imprimió {num(faltantes.deltaContador)} hojas pero solo se cargaron{' '}
                          {num(faltantes.hojasCargadas)} en ventas: faltan {num(faltantes.diferencia)} hojas
                          por explicar (trabajos sin registrar, o pruebas de la máquina).
                        </Aviso>
                      ) : (
                        <Aviso>
                          Entre {fechaCorta(faltantes.desde)} y {fechaCorta(faltantes.hasta)} lo cargado en
                          ventas ({num(faltantes.hojasCargadas)} hojas) cubre lo que marcó el contador
                          ({num(faltantes.deltaContador)} hojas).
                        </Aviso>
                      )}
                    </div>
                  )}
                  <Tabla
                    cabeceras={[
                      { texto: 'Fecha' }, { texto: 'Contador BN', alineado: 'der' },
                      { texto: 'Contador color', alineado: 'der' }, { texto: '', alineado: 'der' },
                    ]}
                  >
                    {lecturas.map((c) => (
                      <Fila key={c.id}>
                        <Celda mono className="whitespace-nowrap text-muted">{fechaCorta(c.fecha)}</Celda>
                        <Celda der><Numero v={c.contador_bn} /></Celda>
                        <Celda der><Numero v={c.contador_color} /></Celda>
                        <Celda der>
                          <Link href={`/contadores/nuevo/?id=${c.id}`} className="text-xs underline underline-offset-2 hover:text-spot">
                            Editar
                          </Link>
                        </Celda>
                      </Fila>
                    ))}
                  </Tabla>
                </>
              )}
            </Seccion>
          );
        })
      )}
    </>
  );
}
