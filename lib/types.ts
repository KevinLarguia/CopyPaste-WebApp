export type Venta = {
  id: string;
  fecha: string;              // AAAA-MM-DD
  cliente_id: string;
  cliente_nombre: string;
  producto: string;
  cantidad: number;
  precio: number;             // sin envío
  envio_cobrado: number;
  costo_materiales: number;
  costo_expresion: string;
  min_impresion: number;
  min_corte: number;
  min_archivo: number;
  canal: string;
  etapa: string;
  notas: string;
  telefono: string;
  creado_en: string;
  actualizado_en: string;
  activo: boolean;
};

export type Gasto = {
  id: string;
  fecha: string;
  categoria: string;
  detalle: string;
  monto: number;
  proveedor: string;
  tipo: string;               // Fijo | Variable
  creado_en: string;
  actualizado_en: string;
  activo: boolean;
};

export type Cliente = {
  id: string;
  nombre: string;
  nombre_normalizado: string;
  telefono: string;
  hist_compras: number;
  hist_facturacion: number;
  hist_ultima_compra: string;
  nombre_dudoso: boolean;
  creado_en: string;
  activo: boolean;
};

export type ItemLista = {
  tipo: 'producto' | 'canal' | 'etapa' | 'categoria_gasto' | 'tipo_gasto';
  valor: string;
  orden: number;
  activo: boolean;
};

export type FilaHistorica = {
  concepto: string;
  mayo_2026: string | number;
  junio_2026: string | number;
  julio_2026: string | number;
};

export type Dataset = {
  ventas: Venta[];
  gastos: Gasto[];
  clientes: Cliente[];
  listas: ItemLista[];
  historico: FilaHistorica[];
  leidoEn: string;
};
