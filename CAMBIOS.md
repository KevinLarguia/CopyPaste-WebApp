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

## Fase 2 — Cliente identificado por teléfono

El teléfono pasa a ser la clave del cliente. Sin columnas nuevas (`telefono`
ya existía en `ventas` y `clientes`).

- **Teléfono obligatorio** para guardar una venta (validado en el form y en
  el servidor). Si matchea un cliente existente, engancha la venta a ese
  cliente y sugiere el canal. Si no matchea y tampoco hay nombre, guarda un
  nombre provisorio (`Cliente <teléfono>`) marcado como incompleto — se
  corrige después en Clientes, sin bloquear la carga.
- **Reactivar clientes** (`/clientes/reactivar/`): ordenados por días sin
  comprar y facturación histórica, con link directo a WhatsApp
  (`lib/format.ts: waLink`). Avisa cuántos clientes no tienen teléfono
  cargado (no se los puede reactivar por acá).
- **Dedup de clientes** (`scripts/dedupe-clientes.js`): propone fusiones por
  mismo teléfono, mismo nombre normalizado, o nombre incompleto que es
  prefijo de un nombre más largo. **Nunca fusiona solo** — solo imprime
  candidatos. `scripts/apply-merge.js --from --into --apply` aplica una
  fusión puntual ya revisada: reasigna las ventas, suma los históricos,
  desactiva al perdedor (nunca borra la fila).

**Archivos nuevos:** `app/clientes/reactivar/page.tsx`, `scripts/dedupe-clientes.js`,
`scripts/apply-merge.js`. **Modificados:** `app/ventas/nueva/page.tsx`,
`lib/calc.ts`, `lib/format.ts`, `netlify/functions/_lib/schema.js`.

Sin migración de esquema — no hace falta correr nada antes de mergear. El
dedup/merge son herramientas para usar cuando quieras, no un paso
obligatorio del deploy.

## Fase 3 — Costos calculados, no imputados

`costo_materiales` deja de tipearse a mano: se calcula solo a partir de
`hojas`, `máquina`, `material` y `terminación`, con las tarifas vigentes a
la fecha de la venta.

- Hoja nueva `tarifas` (papel, tinta, terminación), **versionada**: cambiar
  un precio agrega una fila nueva con un `vigente_desde` posterior, nunca
  edita la vieja — así una venta pasada conserva el costo con el que se
  calculó, aunque las tarifas suban después.
- `ventas` suma `hojas`, `maquina`, `material`, `terminacion` y
  `costo_materiales_override` (se agregaron acá y no en la Fase 4 como decía
  el documento original, porque la fórmula de costo los necesita antes).
- En "Cargar venta", el costo se muestra **calculado y de solo lectura**,
  con un botón "Editar manualmente" para los trabajos que se salieron de lo
  normal.
- El cálculo vive en dos lugares a propósito, sincronizados a mano (mismo
  criterio que ya separa `schema.js` de `types.ts` en este repo):
  `netlify/functions/_lib/costeo.js` (servidor, autoritativo, corre siempre
  al guardar salvo que esté marcado como corregido a mano) y
  `lib/calc.ts` (cliente, para la vista previa antes de guardar).
- **Simplificación que tomé yo, a revisar:** el documento habla de
  "carillas" para el costo de tinta, pero no hay un campo que distinga
  simple/doble faz. Asumí `carillas = hojas` (una cara) hasta que haga falta
  modelar doble faz.
- Dos materiales que usan las plantillas no tenían tarifa en el documento
  original (`Adhesivo fotográfico`, `Fotográfico` de polaroids): quedaron
  en $0, marcados "a medir", igual que ya hacía el documento con la tinta de
  L5590/T3170.

**Archivos nuevos:** `netlify/functions/_lib/costeo.js`, `netlify/functions/tarifas.js`,
`scripts/migrate-fase3-tarifas.js`. **Modificados:** `netlify/functions/_lib/schema.js`,
`netlify/functions/_lib/crud.js` (nuevo hook `beforeSave`), `netlify/functions/ventas.js`,
`netlify/functions/data.js`, `lib/calc.ts`, `lib/types.ts`, `lib/data-context.tsx`,
`app/ventas/nueva/page.tsx`.

**Correr antes de mergear** (crea `tarifas` y agrega las columnas nuevas a `ventas`):
```
node scripts/migrate-fase3-tarifas.js --apply
node scripts/verificar.js
```

## Fase 4 — Ventas: `precio_especial` / `costo_envio`, sacar `etapa` / `costo_expresion`

**Agregados:** `precio_especial` (booleano — amigo, canje, promoción,
descuento a recurrente) y `costo_envio` (lo que se le paga al cadete). Las
ventas `precio_especial` quedan afuera de facturación, costo, margen y
ticket en el panel, por producto y por cliente — pero no de la cuenta de
trabajos ni de las horas, porque el trabajo fue real aunque el precio no.

**Sacados — la operación de más riesgo de todo el refactor:**
`etapa` (un solo campo de texto libre por venta que ya generó conclusiones
equivocadas; los tres campos de minutos dicen lo mismo, mejor) y
`costo_expresion` (dejó de tener sentido guardar de dónde salió un número
que ahora calcula la app).

⚠️ **Esto borra columnas de la planilla real**, no solo del código.
`scripts/migrate-fase4-ventas-shape.js` tiene protecciones extra:
1. Guarda un backup completo de la pestaña antes de tocar nada
   (`scripts/backups/`).
2. Pide `--apply` **y además** `--confirmo-borrado` — uno solo no alcanza.
3. Se puede probar primero contra una pestaña duplicada (`--tab "ventas (copia)"`),
   duplicando la pestaña `ventas` dentro del mismo archivo (no gasta espacio
   de Drive, a diferencia de copiar el archivo entero).
4. Busca las columnas a borrar **por nombre en el encabezado real**, no por
   la posición que dice `schema.js` (que ya cambió en el código).

```
node scripts/migrate-fase4-ventas-shape.js --tab "ventas (copia)"
node scripts/migrate-fase4-ventas-shape.js --tab "ventas (copia)" --apply --confirmo-borrado
node scripts/verificar.js
# recién si eso da bien, contra la real:
node scripts/migrate-fase4-ventas-shape.js --apply --confirmo-borrado
node scripts/verificar.js
node scripts/migrate-fase4-leeme.js --apply   # hoja de documentación, sin riesgo
```

**Archivos modificados:** `netlify/functions/_lib/schema.js`, `lib/types.ts`,
`lib/calc.ts` (nueva `minutosPorTipo` reemplaza `minutosPorEtapa`;
`resumenDelMes`/`porProducto`/`fichaClientes` excluyen `precio_especial`),
`app/page.tsx`, `app/config/page.tsx`, `app/ventas/nueva/page.tsx`,
`app/ventas/page.tsx` (badge "precio especial"), `app/ventas/rapida/page.tsx`.

**Pendiente, no bloqueante:** `seed/*.csv` quedaron desactualizados respecto
del esquema nuevo (son para el onboarding desde cero de una planilla nueva,
no afectan la migración de la planilla real). Actualizarlos si en algún
momento hace falta reseedear una instalación nueva.

---

## Fase 5 — Gastos y publicidad

"Resultado del mes" pasa a ser el número real: resta costo de materiales y
gastos operativos **ya pagados**, y separa la carga de saldo publicitario
(movimiento de caja) de su consumo real (gasto).

- `gastos` suma `estado` (`pedido` / `recibido` / `pagado`, default `pagado`
  para las filas existentes) y `anuncio` (solo tiene sentido para la
  categoría de consumo publicitario). Se agregan al final — a diferencia de
  la Fase 4, esto es seguro desplegar antes de migrar la planilla real.
- `resumenDelMes` solo cuenta gastos con `estado === 'pagado'`: uno "pedido"
  o "recibido" todavía no salió de la caja.
- **`resultado`** ahora resta también `costoMateriales` (antes solo restaba
  gastos operativos) — es la corrección más importante de esta fase.
- La categoría **"Publicidad Meta"** se separa en dos: **"Publicidad Meta
  (consumo)"** (lo que Meta efectivamente gastó — cuenta como gasto
  operativo) y **"Saldo publicitario (carga)"** (plata que pasó a la cuenta
  de Meta, todavía no gastada — se trata como `NO_OPERATIVA`, junto con
  Retiros y Envíos). Los gastos históricos con la categoría vieja se
  renombran a "(consumo)" — es lo que efectivamente representaban.
- Panel: nueva sección "Publicidad: invertido vs. atribuido" (cargado vs.
  consumido vs. saldo restante en la cuenta de Meta).
- `listas` suma una opción de canal "No sé / no preguntado", para no forzar
  una respuesta inventada.

**Archivos nuevos:** `scripts/migrate-fase5-gastos.js`. **Modificados:**
`netlify/functions/_lib/schema.js`, `lib/calc.ts`, `lib/types.ts`,
`app/gastos/nuevo/page.tsx`, `app/page.tsx`, `app/config/page.tsx`.

**Correr antes o después de mergear** (las columnas van al final, así que no
rompe nada mientras tanto — pero sin correrlo, los gastos de publicidad
cargados como "Publicidad Meta" viejo no se separan de carga/consumo):
```
node scripts/migrate-fase5-gastos.js --apply
node scripts/verificar.js
```

## Fase 6 — Fusionar categorías de producto

Sin cambio de esquema ni de código de la app — `porProducto` ya agrupa por
lo que sea que diga `producto`, así que reescribir el dato alcanza.
`"Libros / apuntes"` se fusiona en `"Cuadernillos / anillados"` y
`"Etiquetas para productos"` en `"Stickers troquelados / corte de contorno"`
(las dos resultaron ser lo mismo que la otra categoría, según el uso real).
La entrada vieja se desactiva en `listas`, nunca se borra.

```
node scripts/migrate-fase6-merge-productos.js
node scripts/migrate-fase6-merge-productos.js --apply
node scripts/verificar.js
```

## Fase 7 — Contador de páginas

Compara lo que cada máquina imprimió de verdad (lectura de su contador
físico) contra lo cargado como venta para esa máquina en el mismo período —
detecta trabajos hechos y no registrados.

- Hoja nueva `contadores` (fecha, máquina, contador BN, contador color).
- `lib/calc.ts: ventasFaltantes(d, maquina, desde, hasta)` — toma la última
  lectura de contador en o antes de cada extremo del período, calcula el
  delta, y lo compara contra la suma de `hojas` cargadas en `ventas` para
  esa máquina (depende de `hojas`/`maquina`, ya disponibles desde la Fase 3).
- `/contadores/nuevo/`: carga una lectura (fecha, máquina, contador BN,
  contador color). `/contadores/`: por máquina, compara las dos lecturas más
  recientes y avisa si hay hojas sin explicar.
- `lib/constants.ts` (nuevo): `MAQUINAS` pasa a vivir acá en vez de
  duplicarse entre `ventas/nueva` y `contadores/nuevo`.

⚠️ **Correr esto ANTES de desplegar el código de esta fase**, no después:
`netlify/functions/data.js` ya pide la pestaña `contadores` en su lectura
batcheada, y si no existe todavía en la planilla real, `/api/data` se rompe
entero (mismo problema que ya pasó con `plantillas`/`tarifas` en la Fase 1).

```
node scripts/migrate-fase7-contadores.js --apply
node scripts/verificar.js
```

**Archivos nuevos:** `netlify/functions/contadores.js`,
`app/contadores/nuevo/page.tsx`, `app/contadores/page.tsx`,
`scripts/migrate-fase7-contadores.js`, `lib/constants.ts`. **Modificados:**
`netlify/functions/_lib/schema.js`, `netlify/functions/data.js`, `lib/types.ts`,
`lib/data-context.tsx`, `lib/calc.ts`, `components/AppShell.tsx`,
`app/ventas/nueva/page.tsx` (usa `MAQUINAS` de `lib/constants.ts`).

---

## Migración local (alternativa sin credenciales de API)

`scripts/migrate-local-xlsx.js` aplica las Fases 1, 3, 4, 5, 6 y 7 sobre un
archivo Excel descargado de la planilla real (no crea `contadores` con datos
de la Fase 7 vía API porque no hace falta credencial — la crea vacía igual).
Ver la cabecera del archivo para el modo de uso y la advertencia sobre
"Reemplazar la hoja de cálculo".
