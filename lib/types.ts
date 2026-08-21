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
  min_impresion: number;
  min_corte: number;
  min_archivo: number;
  canal: string;
  notas: string;
  telefono: string;
  creado_en: string;
  actualizado_en: string;
  activo: boolean;
  completo: boolean;       // false = cargada por "Captura rápida", falta terminar
  hojas: number;
  maquina: string;
  material: string;
  terminacion: string;
  costo_materiales_override: boolean; // true = costo_materiales corregido a mano
  precio_especial: boolean; // amigo/canje/promo: se excluye de los análisis de rentabilidad
  costo_envio: number;
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

export type Plantilla = {
  id: string;
  nombre: string;
  producto: string;
  maquina: string;
  material: string;
  hojas_por_unidad: number;
  min_impresion_por_unidad: number;
  min_corte_por_unidad: number;
  min_archivo_fijo: number;
  terminacion: string;
  orden: number;
  activo: boolean;
};

export type Tarifa = {
  id: string;
  tipo: 'papel' | 'tinta' | 'terminacion';
  clave: string;
  valor: number;
  unidad: string;
  vigente_desde: string;
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
  plantillas: Plantilla[];
  tarifas: Tarifa[];
  leidoEn: string;
};
