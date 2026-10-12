```
<!--
README.md — Catálogo de productos de Mejora2
Ubicación: Mejora2/catalogo/README.md
Última actualización: 2026-10-12

Changelog:
  - 2026-10-12: Reescritura completa.
      · Se corrige la estructura real del directorio (4 archivos, no los 4 fantasma).
      · Se documenta que el catálogo está comprimido con gzip y cómo descomprimirlo.
      · Se documenta el esquema real del JSON ({ meta, productos }) con tipos y obligatoriedad.
      · Se agrega sección de integración con Mejora2 (URL, método, persistencia, deuda técnica).
      · Se corrigen las fuentes de datos y se aclara la situación de licencias (MIT + ODbL).
      · Se reemplaza el título "mejora2-catalogo" (repo eliminado) por "Catálogo de productos — Mejora2".
      · Se agregan badges, links a la app, y nota histórica.
  - Versión anterior: documentaba archivos inexistentes (tabla_caducidad.json,
    precios_referencia.json, scripts/), apuntaba a catalogo_productos.json sin .gz,
    no mencionaba compresión ni esquema, ni la integración con Mejora2.
-->

# Catálogo de productos — Mejora2

[![Validar catálogo](https://github.com/ArbolDeLosTero/Mejora2/actions/workflows/validar-catalogo.yml/badge.svg)](https://github.com/ArbolDeLosTero/Mejora2/actions/workflows/validar-catalogo.yml)

Catálogo de referencia de productos con códigos de barras **EAN-13**, comprimido con gzip, que la aplicación [Mejora2](https://arboldelosterro.github.io/Mejora2/) consume para autocompletar descripciones y categorías al escanear un producto en el POS.

---

## 📁 Estructura del directorio

Este catálogo vive dentro del repositorio principal [`Mejora2`](https://github.com/ArbolDeLosTero/Mejora2), en la carpeta `catalogo/`. Contiene exactamente **cuatro archivos**:

| Archivo | Descripción |
|---|---|
| `LICENSE` | Licencia MIT del código del repositorio |
| `README.md` | Este archivo |
| `catalogo_productos.json.gz` | Catálogo completo, comprimido con gzip (~7.86 MB) |
| `schema.json` | Esquema JSON del catálogo, usado por el workflow de validación |

**No contiene** (pese a lo que decía la versión anterior de este README): `tabla_caducidad.json`, `precios_referencia.json`, ni la carpeta `scripts/`. Esos archivos nunca existieron en el repo.

---

## 📦 El archivo `catalogo_productos.json.gz`

**Importante:** el catálogo está comprimido con **gzip**. No es un JSON plano. Si hacés `fetch(url)` seguido de `await resp.json()`, va a fallar con `SyntaxError` porque el cuerpo de la respuesta son bytes gzip, no texto JSON.

### ¿Por qué comprimido?

| Formato | Tamaño aproximado |
|---|---|
| `.json.gz` (actual) | ~7.86 MB |
| `.json` sin comprimir | ~30-40 MB |

GitHub tiene un límite *soft* de 50 MB por archivo y bloquea a partir de 100 MB. Mantener el catálogo comprimido:

- Evita acercarse a ese límite.
- Reduce el ancho de banda por cada importación (el cliente baja ~7.86 MB en vez de ~40 MB).
- Acelera el `git clone` para cualquiera que trabaje con el repo.

### ¿Cómo descomprimirlo?

**Terminal (Linux / macOS):**

```bash
gunzip -c catalogo_productos.json.gz > catalogo_productos.json
```

**Node.js:**

```js
const fs = require('fs');
const zlib = require('zlib');
const json = zlib.gunzipSync(fs.readFileSync('catalogo_productos.json.gz'));
const data = JSON.parse(json);
```

**Navegador** (Chrome 80+, Firefox 113+, Safari 16.4+, Edge 80+):

```js
const resp = await fetch(url);
if (!resp.ok) throw new Error('HTTP ' + resp.status);
const ds = new DecompressionStream('gzip');
const stream = resp.body.pipeThrough(ds);
const data = await new Response(stream).json();
```

En navegadores sin soporte de `DecompressionStream`, se puede usar [`pako`](https://github.com/nodeca/pako) como fallback.

---

## 📊 Esquema del JSON

Estructura raíz: **objeto** con dos propiedades, `meta` y `productos`.

```json
{
  "meta": {
    "fecha_generacion": "2026-10-08T00:00:00Z",
    "fuente": "Open Food Facts + categorización propia",
    "total_productos": 335932
  },
  "productos": [
    {
      "ean": "7790895000782",
      "descripcion": "Coca-Cola 2.25L",
      "marca": "Coca-Cola",
      "categoria": "Bebidas",
      "dias_caducidad": 180
    },
    {
      "ean": "7790040112301",
      "descripcion": "Yerba Mate Playadito 1kg",
      "marca": "Playadito",
      "categoria": "Almacén",
      "dias_caducidad": 730
    }
  ]
}
```

> El ejemplo de arriba es **ilustrativo**. Los valores reales de `meta` (fecha, fuente, total) son los que estén efectivamente dentro del `.gz`.

### Campos de `meta`

| Campo | Tipo | Descripción |
|---|---|---|
| `fecha_generacion` | string (ISO 8601) | Fecha en que se generó el catálogo |
| `fuente` | string | Descripción textual de las fuentes usadas |
| `total_productos` | number | Cantidad de productos en el array `productos` |

### Campos de cada producto

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `ean` | string | ✅ Sí | Código de barras EAN-13. Es string, no number (puede empezar con `0`) |
| `descripcion` | string | ✅ Sí | Nombre del producto tal como aparece en el envase |
| `marca` | string | ❌ Opcional | Marca comercial. Puede estar vacío |
| `categoria` | string | ❌ Opcional | Categoría general (Bebidas, Almacén, Limpieza, etc.). Puede ser `""` |
| `dias_caducidad` | number | ❌ Opcional | Días estimados de caducidad desde la fecha de fabricación |

**Nota:** el catálogo **no incluye precios**. La versión anterior de este README mencionaba "precios sugeridos" — eso era incorrecto. Los precios se cargan manualmente en cada comercio desde el panel Stock de Mejora2.

El esquema formal está en [`schema.json`](./schema.json), que es el archivo contra el que se valida en el workflow.

---

## 🔗 Integración con Mejora2

### URL del catálogo

```
https://raw.githubusercontent.com/ArbolDeLosTero/Mejora2/main/catalogo/catalogo_productos.json.gz
```

Esta es la URL que hay que pegar en el panel Stock de Mejora2 para importar el catálogo.

### Cómo se consume desde la app

1. El usuario abre la vista **Stock** en Mejora2.
2. Hace clic en **Importar catálogo**.
3. Pega la URL de arriba en el prompt.
4. La app guarda la URL en dos lugares para no volver a pedirla:
   - `config/comercio.catalogo_url` (Firestore).
   - `localStorage.catalogo_url_v1` (local).
5. La app descarga el `.gz`, lo descomprime, mapea los campos y guarda los productos en `comercios/{comercioId}/productos`.

El método que hace todo esto es `window.Stock.importarCatalogoDesdeURL(url)` (Bloque 14 de `index.html`).

### ⚠️ Deuda técnica conocida (bloquea la importación hoy)

Dos puntos pendientes de fix en el Bloque 14 de `index.html` que impiden que la importación funcione de punta a punta, **aunque el archivo sea válido**:

1. **Descompresión gzip.** El método actual hace `fetch(url)` seguido de `await resp.json()` directo. Si la URL termina en `.gz`, falla con `SyntaxError`. Hay que agregar detección de gzip (por extensión o `Content-Type: application/gzip`) y descompresión con `DecompressionStream` (o `pako` como fallback).

2. **Mapeo de campos.** La app espera los campos `nombre`, `precio_venta` y `codigo`. El catálogo entrega `descripcion` (no `nombre`), **no entrega precios**, y el código EAN viene en `ean` (no `codigo`). Hay que adaptar el mapeo en B14 o los nombres en el catálogo. Si no, todos los productos se descartan silenciosamente por la guarda `if (!item || !item.nombre) return;` y el usuario ve "0 productos importados".

Mientras esos dos puntos no se arreglen, el catálogo **se puede descargar y descomprimir** correctamente, pero **no se puede importar** desde el cliente de Mejora2.

---

## 🔄 Actualización del catálogo

**Estado actual:** el catálogo se generó una vez y no hay un pipeline automático de regeneración. La carpeta `scripts/` mencionada en la versión anterior de este README **no existe**.

### Cómo regenerarlo (manual, hoy)

1. Obtener los datos crudos de las fuentes (ver sección siguiente).
2. Normalizar los campos al esquema de arriba (`ean`, `descripcion`, `marca`, `categoria`, `dias_caducidad`).
3. Construir el objeto raíz con `meta` y `productos`.
4. Serializar a JSON **sin pretty-print**, para minimizar el tamaño:
   ```js
   JSON.stringify(data);           // ✅ bien
   JSON.stringify(data, null, 2);  // ❌ desperdicia bytes
   ```
5. Comprimir con gzip (nivel máximo):
   ```bash
   gzip -9 -c catalogo_productos.json > catalogo_productos.json.gz
   ```
6. Verificar integridad antes de subir:
   ```bash
   gzip -t catalogo_productos.json.gz
   gunzip -c catalogo_productos.json.gz | jq '.productos | length'
   ```
   El conteo tiene que coincidir con `meta.total_productos`.
7. Reemplazar `catalogo_productos.json.gz` en el repo.
8. Pushear a `main`. El workflow **Validar catálogo** corre automáticamente y valida contra `schema.json`.

### Automatización futura (pendiente)

Idealmente, esto se convierte en un workflow que:

- Corre periódicamente (semanal o mensual).
- Descarga las fuentes, genera el `.gz` y valida.
- Si el conteo de productos cambió más de un umbral, abre un PR en vez de pushear directo a `main`.

Todavía no existe. Cuando se implemente, esta sección se actualiza.

---

## 📚 Fuentes de datos

Las fuentes declaradas en el `meta` del catálogo son:

- **Open Food Facts** — Base de datos abierta y colaborativa de productos alimenticios. Licencia **ODbL** (Open Database License).
- **Categorización propia** — Asignación de categorías y días de caducidad basada en el Código Alimentario Argentino.

### ⚠️ Sobre la licencia ODbL de Open Food Facts

Si el catálogo efectivamente incorpora datos de Open Food Facts, **la licencia ODbL obliga a**:

1. **Atribuir** la fuente (mencionar Open Food Facts en cualquier redistribución).
2. **Compartir derivados** bajo la misma licencia ODbL (copyleft).

Esto es **independiente** de la licencia MIT del código del repo. El código es MIT; los datos derivados de OFF son ODbL.

Si el catálogo **no** usa datos de Open Food Facts, hay que corregir el campo `fuente` del `meta` para reflejar las fuentes reales. Un dato importante a tener en cuenta: el programa **Precios Claros** del Gobierno Argentino fue discontinuado, así que si en algún momento se usó como fuente, ya no se actualiza.

---

## 📄 Licencia

- **Código y scripts del repositorio:** MIT License (ver archivo [`LICENSE`](./LICENSE)).
- **Datos del catálogo:** ver sección de fuentes arriba. Si hay datos derivados de Open Food Facts, aplica ODbL.

---

## ✅ Validación

El workflow [`validar-catalogo.yml`](../.github/workflows/validar-catalogo.yml) valida automáticamente que:

1. El archivo `catalogo_productos.json.gz` existe y es un gzip válido.
2. Al descomprimirlo, es JSON parseable.
3. Cumple el esquema declarado en `schema.json`.

Se puede disparar manualmente desde la pestaña **Actions** → **Validar catálogo** → **Run workflow** (branch: `main`).

Badge de estado:

[![Validar catálogo](https://github.com/ArbolDeLosTero/Mejora2/actions/workflows/validar-catalogo.yml/badge.svg)](https://github.com/ArbolDeLosTero/Mejora2/actions/workflows/validar-catalogo.yml)

---

## 🔗 Enlaces

- **App en producción:** [https://arboldelosterro.github.io/Mejora2/](https://arboldelosterro.github.io/Mejora2/)
- **Repositorio principal:** [https://github.com/ArbolDeLosTero/Mejora2](https://github.com/ArbolDeLosTero/Mejora2)
- **Workflow de validación:** [validar-catalogo.yml](https://github.com/ArbolDeLosTero/Mejora2/actions/workflows/validar-catalogo.yml)

---

## 📝 Nota histórica

Este README reemplaza una versión anterior que documentaba un repositorio independiente llamado `mejora2-catalogo` con archivos que nunca existieron en el repo (`tabla_caducidad.json`, `precios_referencia.json`, `scripts/`). Ese repositorio fue eliminado y el catálogo se integró como carpeta `catalogo/` dentro del repositorio principal `Mejora2`.

La versión anterior también:

- Apuntaba a `catalogo_productos.json` (sin `.gz`), lo que producía 404 al copiar la URL.
- No mencionaba que el archivo estaba comprimido con gzip.
- No documentaba el esquema del JSON (`{ meta, productos }`).
- No mencionaba la integración con la app Mejora2.
- Listaba "precios sugeridos" como parte del catálogo, cuando el catálogo no incluye precios.

Todo eso quedó corregido en esta versión.
