# Cambios — refactor CopyPaste

Registro de las fases del refactor a medida que se van implementando. El plan
completo (8 fases) surgió de una semana de uso real de la app; el objetivo es
que los datos sirvan para decidir y que cargar una venta sea rápido.

## Fase 0 — Panel del mes como home

Sin cambios de datos ni de esquema.

- **"Panel del mes" pasó a ser el primer ítem del menú** (antes era el tercero,
  dentro de "Análisis"). La ruta `/` ya mostraba el panel; lo que cambió es
  dónde aparece en la navegación.
- **Botones "+ Cargar venta" / "+ Cargar gasto"** arriba del panel, visibles
  sin scrollear — la app se abre mucho más para cargar que para mirar
  números.
- El KPI **"Margen bruto %"** ahora tiene una aclaración ("Sobre el costo de
  materiales solamente. No es la rentabilidad del negocio.") — antes no
  tenía ninguna nota y se prestaba a confusión.

**Archivos:** `components/AppShell.tsx`, `app/page.tsx`.

## Fase 1 — Fluidez de carga

Cargar una venta pasa de 13 decisiones a un flujo con plantillas, defaults y
dos caminos según el momento (durante la producción vs. al cerrar).

### Plantillas de trabajo
Hoja nueva `plantillas` con 8 plantillas semilla (stickers, cuadernillos,
fotocopias, impresión color, polaroids...). Elegir una plantilla en "Cargar
venta" precarga el producto y calcula los minutos según la cantidad — se
puede seguir editando a mano si el trabajo se salió de lo normal.

### Carga en dos momentos
- **Cargar rápido** (`/ventas/rapida/`): 4 campos — teléfono, plantilla,
  cantidad, precio. Si el teléfono no es de un cliente conocido, crea uno
  provisorio (`Cliente <teléfono>`, marcado como nombre incompleto).
- **Pendientes de completar** (`/ventas/pendientes/`): lista lo cargado
  rápido para terminarlo de una sola vez, sin hacerlo en medio de la
  producción.

### Repetir última venta
Desde la ficha de un cliente (`/clientes/detalle/`, link "Ver" en la tabla
de Clientes) hay un botón que precarga el formulario con su último pedido —
pensado para los clientes que piden siempre lo mismo cada 2-3 semanas.

### Defaults
- El canal se autocompleta a "Cliente que ya compró" si el teléfono ya es
  de un cliente conocido.
- El precio muestra (y precarga si está vacío) lo último que se le cobró a
  ese cliente por ese producto.

**Archivos nuevos:** `app/ventas/rapida/page.tsx`, `app/ventas/pendientes/page.tsx`,
`app/clientes/detalle/page.tsx`, `netlify/functions/plantillas.js`.
**Archivos modificados:** `app/ventas/nueva/page.tsx`, `app/clientes/page.tsx`,
`lib/calc.ts`, `lib/types.ts`, `lib/data-context.tsx`,
`netlify/functions/_lib/schema.js`, `netlify/functions/_lib/sheets.js`,
`netlify/functions/data.js`.

### Cambios en la planilla
- Hoja nueva `plantillas`.
- Columna nueva `completo` (TRUE/FALSE) en `ventas`.

**Correr antes de mergear a `main`** (si no, `/api/data` se rompe porque
falta la hoja `plantillas`):
```
node scripts/migrate-fase1-plantillas.js --apply
node scripts/migrate-fase1-completo.js --apply
node scripts/verificar.js
```
Detalle completo en `scripts/`.

---

## Lo que sigue

Fase 2 (cliente identificado por teléfono, dedup de clientes) es la próxima.
El resto del plan (costos calculados, campos de ventas, gastos y
publicidad, categorías de producto, contador de páginas) sigue el orden y
las decisiones documentadas en la conversación original con Claude.
