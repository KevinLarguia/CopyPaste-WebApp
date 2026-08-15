# CopyPaste — Panel del local

Reemplaza el Excel `CopyPaste_Panel_2.xlsx` por una webapp. La base de datos es
una Google Sheet; el frontend es Next.js exportado estático y toda la escritura
pasa por Netlify Functions, que son las únicas que ven las credenciales de Google.

```
Navegador  →  Netlify (HTML estático)
              └─ /api/*  →  Netlify Function  →  Google Sheets API
                            (acá vive el service account)
```

---

## 1. Crear la Google Sheet

Creá una planilla nueva en Google Sheets. Llamala como quieras (por ejemplo
**CopyPaste — Base**) y armá **cinco hojas** con estos nombres exactos, en
minúscula y sin acentos:

| Hoja | Para qué |
|---|---|
| `ventas` | Un renglón por trabajo entregado |
| `gastos` | Un renglón por pago |
| `clientes` | Maestro de clientes con su historial previo |
| `listas` | Lo que aparece en los desplegables |
| `historico_mensual` | Mayo–julio 2026, solo lectura |

La forma más rápida de armarlas con la estructura correcta y los datos ya
migrados es importar los CSV de la carpeta `seed/`:

1. En la planilla: **Archivo → Importar → Subir**, elegí `seed/ventas.csv`.
2. En "Importar archivo" marcá **Insertar hojas nuevas** y separador **coma**.
3. Renombrá la hoja resultante a `ventas` (Sheets la llama `ventas.csv`).
4. Repetí con `gastos.csv`, `clientes.csv`, `listas.csv` y `historico_mensual.csv`.
5. Borrá la hoja `Hoja 1` que viene vacía por defecto.

Los CSV ya traen los datos del Excel limpios: 18 ventas, 4 gastos, 309 clientes
(los 296 de MercadoPago más los 13 que aparecían solo en Ventas), las listas en
formato largo y el histórico. La primera fila de cada uno es el encabezado, y
**el orden de las columnas tiene que quedar tal cual**: el código las lee por
posición.

> **Importante:** antes de importar, poné el formato de las columnas de fecha en
> **Formato → Número → Texto sin formato**. Las fechas se guardan como texto ISO
> (`2026-08-14`) a propósito, para que Sheets no las reinterprete según el país
> de la planilla.

Copiá el ID de la planilla: está en la URL, entre `/d/` y `/edit`.

```
https://docs.google.com/spreadsheets/d/1AbCdEf...XyZ/edit
                                       ^^^^^^^^^^^^^^ esto
```

---

## 2. Google Cloud y la cuenta de servicio

1. Entrá a <https://console.cloud.google.com> con la cuenta de Google dueña de la planilla.
2. Arriba a la izquierda, **Seleccionar proyecto → Proyecto nuevo**. Nombre: `copypaste`. Crear.
3. Con el proyecto seleccionado, andá a **APIs y servicios → Biblioteca**, buscá
   **Google Sheets API** y tocá **Habilitar**.
4. Andá a **APIs y servicios → Credenciales → Crear credenciales → Cuenta de servicio**.
   - Nombre: `copypaste-app`.
   - Los pasos de "rol" y "acceso de usuarios" se pueden saltear: la cuenta de
     servicio no necesita permisos de Google Cloud, solo que la planilla la invite.
   - Crear.
5. Entrá a la cuenta de servicio recién creada → pestaña **Claves** →
   **Agregar clave → Crear clave nueva → JSON**. Se te descarga un archivo.
   **Ese archivo es la llave del negocio: no va al repo, no se manda por WhatsApp.**

Del JSON vas a usar dos campos:

```json
{
  "client_email": "copypaste-app@copypaste.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
}
```

---

## 3. Compartir la planilla con la cuenta de servicio

La cuenta de servicio es, para Google, un usuario más. Si no la invitás, no ve nada.

1. Abrí la Google Sheet → botón **Compartir**.
2. Pegá el `client_email` del JSON (termina en `.iam.gserviceaccount.com`).
3. Permiso: **Editor**.
4. Destildá "Notificar a las personas" (es un robot, no tiene inbox) y compartí.

---

## 4. Variables de entorno

Son cuatro. En local van en un archivo `.env` (copiá `.env.example`); en
producción van en Netlify.

| Variable | De dónde sale |
|---|---|
| `GOOGLE_SHEET_ID` | La URL de la planilla |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` del JSON |
| `GOOGLE_PRIVATE_KEY` | `private_key` del JSON, **completa y entre comillas** |
| `APP_PASSWORD` | La inventás vos: es la clave que van a usar en el local |

En Netlify: **Site configuration → Environment variables → Add a variable**.

Para `GOOGLE_PRIVATE_KEY`, pegá el valor tal cual está en el JSON, incluyendo
`-----BEGIN PRIVATE KEY-----`, los `\n` literales y `-----END PRIVATE KEY-----\n`.
El código se encarga de convertir los `\n` en saltos de línea reales. Si la
pegás sin los `\n`, la app va a decir "La clave privada de Google está mal cargada".

Si dejás `APP_PASSWORD` vacía, la app queda abierta a cualquiera con el link.

---

## 5. Correr en local

```bash
npm install
npm install -g netlify-cli   # una sola vez
cp .env.example .env         # y completá los cuatro valores
netlify dev
```

`netlify dev` levanta Next y las Functions juntas en <http://localhost:8888>, con
`/api/*` funcionando igual que en producción. `npm run dev:next` levanta solo el
frontend, sin backend: sirve para tocar estilos, no para probar la carga de datos.

---

## 6. Deploy en Netlify

1. Subí el proyecto a un repo de GitHub (privado).
2. En Netlify: **Add new site → Import an existing project → GitHub**, elegí el repo.
3. Netlify lee `netlify.toml`, así que los campos de build vienen solos:
   - Build command: `npm run build`
   - Publish directory: `out`
   - Functions directory: `netlify/functions`
4. Antes del primer deploy, cargá las cuatro variables de entorno del punto 4.
5. **Deploy site**.

Desde ahí, cada `git push` a la rama principal redeploya solo. Los pull requests
generan una preview con su propia URL.

Pasale a los empleados la URL del sitio y la `APP_PASSWORD`. Se pide una sola vez
por celular y queda guardada en el navegador.

---

## 7. Estructura del proyecto

```
app/                      pantallas (Next.js App Router, export estático)
  page.tsx                Panel del mes
  ventas/                 listado y formulario de ventas
  gastos/                 listado y formulario de gastos
  clientes/               buscador, ficha y corrección de nombres
  productos/              rendimiento por producto
  evolucion/              serie mensual + histórico mayo-julio
  config/                 ABM de las listas de los desplegables

components/               shell, tablas, formularios, autocompletado
lib/
  calc.ts                 TODAS las métricas del panel viven acá
  api.ts                  cliente HTTP contra /api
  data-context.tsx        trae el dataset una vez y lo comparte
  format.ts               plata, porcentajes, fechas, calculadora de campos

netlify/functions/
  data.js                 GET /api/data — dataset completo en un batchGet
  ventas.js gastos.js     CRUD por entidad
  clientes.js listas.js
  _lib/sheets.js          acceso a Google Sheets (lectura, append, update)
  _lib/schema.js          orden de columnas y validaciones
  _lib/crud.js            handler genérico que usan las cuatro entidades
  _lib/auth.js            clave compartida
  _lib/respond.js         traducción de errores de Google a castellano

seed/                     CSV listos para importar en la Sheet
```

### Dónde tocar para cambiar cosas

- **Agregar un producto, canal o categoría** → desde la app, en *Listas*. No hay
  que tocar código ni la planilla.
- **Cambiar un umbral** (margen mínimo 55%, publicidad máxima 15%, los días de
  recompra) → `lib/calc.ts`, arriba de todo.
- **Agregar una columna a una hoja** → agregala al final de la hoja en Sheets
  **y** al final del array `columns` en `netlify/functions/_lib/schema.js`. Las
  columnas se leen por posición: si cambiás el orden en un lado y no en el otro,
  los datos se mezclan.

---

## 8. Decisiones que conviene conocer antes de tocar el código

**No hay columnas calculadas en la planilla.** Margen, margen por hora, minutos
totales y la clave de mes no se guardan: los calcula `lib/calc.ts` al vuelo. Es a
propósito. Un valor guardado que se puede recalcular es un valor que en algún
momento va a estar desactualizado.

**Nada se borra de verdad.** "Borrar" pone `activo` en `FALSE`. La fila queda en
la planilla y deja de aparecer en la app. Si dos personas están cargando al mismo
tiempo y una borra un registro, los números de fila del resto no se corren y la
otra no termina editando el registro equivocado.

**Cada registro tiene un `id`.** Para editar, la Function busca la fila por `id`,
vuelve a leerla, verifica que el `id` siga siendo el mismo y recién ahí escribe.
Si la planilla cambió en el medio, corta con "La planilla cambió mientras
editabas" en vez de pisar el dato de otro.

**Las fechas se escriben con `valueInputOption: RAW`.** Google recibe el texto
`2026-08-14` y lo guarda tal cual, sin interpretar. Con `USER_ENTERED`,
`14/08/2026` puede terminar siendo el 8 de febrero según el idioma de la planilla.

**Los campos de plata aceptan cuentas.** En "Costo de materiales" y en "Monto" se
puede escribir `15*127+200` y la app muestra el resultado abajo mientras escribís.
Se guarda el número resuelto en la columna del monto y la cuenta original en
`costo_expresion`. Es lo que ya hacían en el Excel; la app lo contempla en vez de
pelearlo.

---

## 9. Limitaciones reales de este approach

Vale la pena tenerlas claras desde el día uno.

### Cuotas de la Google Sheets API

Google permite **300 lecturas por minuto por proyecto y 60 por minuto por
usuario**, y lo mismo para escrituras. Acá el "usuario" es la cuenta de
servicio, así que el límite que aplica es el de 60/minuto.

Cada pantalla que abre un empleado consume **una** lectura (`/api/data` trae todo
en un solo `batchGet`), y hay 20 segundos de caché en el contenedor de Netlify.
Cada venta guardada consume dos o tres escrituras. Con tres personas usando la
app a la vez, estás en el orden del 5% de la cuota. No es un problema realista.

Si aun así se llega al límite, la app no rompe: la Function devuelve 429 y el
empleado ve *"Google está recibiendo demasiados pedidos. Esperá unos segundos y
volvé a guardar. El dato no se perdió."*

El techo real de la planilla es de **10 millones de celdas**. Con 20 columnas por
venta y 200 ventas por mes, eso es más de mil años. Lo que sí se va a notar antes
es la velocidad: pasadas unas 20.000 filas, traer la planilla entera en cada
carga empieza a pesar. Si llega ese día, el paso siguiente es mover `ventas` a
Postgres (Supabase o Neon) sin tocar el frontend, porque toda la lógica de
lectura está detrás de `/api/data`.

### Dos personas cargando al mismo tiempo

- **Cargar (lo más frecuente):** es seguro. Se usa `values.append`, que resuelve
  Google del lado del servidor. Dos empleados guardando en el mismo segundo
  generan dos filas distintas; ninguno pisa al otro.
- **Editar y borrar:** hay una ventana de riesgo de milisegundos entre que la
  Function encuentra la fila y la escribe. Se mitiga releyendo y verificando el
  `id` antes de escribir, y con el borrado lógico, que evita que las filas se
  corran. Con dos o tres personas es un escenario prácticamente imposible; no es
  una garantía transaccional como la de una base de datos de verdad, y con
  Google Sheets no la vas a poder tener.
- **Alguien editando la planilla a mano mientras la app escribe:** eso sí puede
  causar problemas. Si van a corregir cosas directo en Sheets, que sea con la app
  cerrada, o mejor, que lo hagan desde la app.

### Netlify (plan gratis)

- **125.000 invocaciones de Functions por mes** y 100 horas de ejecución.
  Cada carga de pantalla es una invocación. Tres empleados abriendo pantallas
  100 veces por día son ~9.000 invocaciones mensuales: 7% del límite.
- **100 GB de ancho de banda** y **300 minutos de build** por mes. El sitio pesa
  menos de 200 KB y cada build tarda alrededor de un minuto.
- Las Functions tienen **10 segundos** de tope. Las llamadas a Sheets tardan
  entre 300 ms y 1,5 s: sobra margen.
- Los contenedores son efímeros: el caché de 20 segundos es best-effort, no una
  garantía. Si Netlify recicla el contenedor, la próxima llamada simplemente
  vuelve a leer la planilla.

### Seguridad

`APP_PASSWORD` es una clave única compartida, no un sistema de usuarios. No
distingue quién cargó qué ni se puede revocar por persona: si se va un empleado,
la cambiás en Netlify y la app pide la clave nueva a todos. Es la diferencia
entre "cualquiera con el link" y "cualquiera del local", y para un local de tres
personas alcanza. Si en algún momento hace falta saber quién cargó cada cosa, el
paso siguiente es Netlify Identity con un campo `cargado_por` en las hojas.

Las credenciales de Google nunca llegan al navegador: viven como variables de
entorno en Netlify y solo las leen las Functions. El `.gitignore` ya excluye
`.env`, pero revisá igual que el JSON de la cuenta de servicio no haya entrado
nunca al repo.

---

## 10. Qué quedó pendiente de la auditoría

Cosas que la app resuelve o expone, pero que necesitan una decisión humana:

- **95 clientes con el nombre cortado por MercadoPago** (`Danila Eluney Milena M`).
  Vienen marcados como incompletos y aparecen arriba de todo en la pantalla de
  Clientes. Se corrigen tocando el nombre y escribiendo el completo. No se pueden
  reconstruir automáticamente: el dato original está truncado en el origen.
- **La cuota de máquinas** ($192.000 mensuales en mayo, junio y julio) no está
  cargada en agosto. El panel avisa cuando un gasto fijo que venía todos los
  meses desaparece, pero cargarlo es manual.
- **Los envíos de agosto** están cobrados ($12.700) pero no hay ningún gasto de
  categoría "Envíos" cargado, así que la diferencia da falsamente positiva.
- **Tres ventas sin canal, etapa o minutos.** Esas quedan afuera del análisis de
  cuello de botella y de canales hasta que se completen desde *Editar*.
