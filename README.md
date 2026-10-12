# Mejora2

**Sistema de gestión comercial para kioscos, almacenes y comercios minoristas argentinos.** Punto de venta, control de caja, stock con lotes y vencimientos, proveedores, pedidos, devoluciones, impuestos y facturación electrónica opcional vía ARCA (ex AFIP).

[![Deploy](https://github.com/ArbolDeLosTero/Mejora2/actions/workflows/deploy.yml/badge.svg)](https://github.com/ArbolDeLosTero/Mejora2/actions/workflows/deploy.yml)



## 🚀 App en producción

**https://arboldelosterro.github.io/Mejora2/**

Se instala como PWA en móviles y desktop (Chrome, Edge, Safari). Los datos se sincronizan con Firebase y funcionan parcialmente offline mediante una cola local.



## 🛠️ Stack técnico

| Capa | Tecnología |
|---|---|
| **Frontend** | HTML monolítico (~15.000 líneas) + vanilla JavaScript (ES2022) |
| **CSS** | CSS puro con variables CSS, dentro del mismo `index.html` |
| **Build step** | ❌ No hay. Todo corre tal cual se escribe. |
| **Bundler / transpilador** | ❌ No hay. |
| **Framework** | ❌ No hay. IIFEs y contratos explícitos entre bloques. |
| **Backend** | Firebase (Auth + Firestore + Cloud Functions) |
| **Firebase SDK** | v9 en modo compatibilidad global (compat), vía CDN |
| **Deploy** | GitHub Pages (no Firebase Hosting) |
| **CI/CD** | GitHub Actions (`.github/workflows/`) |
| **PWA** | Manifest + favicon SVG inline + apple-touch-icon |



## 📁 Estructura del repositorio

Mejora2/
├── .github/
│   ├── workflows/
│   │   ├── deploy.yml              → CI/CD con auto-bump de versión
│   │   ├── codeql.yml              → Análisis estático de seguridad (JS)
│   │   └── validar-catalogo.yml    → Validación semanal del catálogo
│   ├── ISSUE_TEMPLATE/
│   │   └── bug_report.md           → Template de reporte de bugs
│   ├── CODEOWNERS                  → Reviewers por ruta
│   └── dependabot.yml              → Actualización de dependencias
│
├── catalogo/                       → Catálogo de productos EAN-13
│   ├── LICENSE                     → MIT
│   ├── README.md                   → Documentación del catálogo
│   ├── catalogo_productos.json.gz  → Catálogo comprimido (~7.86 MB)
│   └── schema.json                 → JSON Schema del catálogo
│
├── functions/                      → Cloud Functions (ARCA + health)
│   ├── arca/
│   │   └── README.md               → Documentación del módulo ARCA
│   ├── .gitignore
│   ├── eslint.config.js            → Config ESLint 9 (flat)
│   ├── index.js                    → Entry point (4 exports)
│   └── package.json
│
├── firebase.json                   → Config de Firebase
├── firestore.indexes.json          → Índices compuestos
├── firestore.rules                 → Reglas de seguridad
├── index.html                      → LA APP COMPLETA (~15.000 líneas)
├── reset-password.html             → Página de reset de contraseña
├── version.json                    → Fuente de verdad de la versión
├── README.md                       → Este archivo
└── SECURITY.md                     → Política de reporte de vulnerabilidades


## 🧩 Arquitectura de `index.html`

Todo el frontend vive en un único `index.html`, organizado en **17 bloques numerados (B00 a B17) + Bloque Final**. Cada bloque tiene una responsabilidad específica y expone una API pública vía `window.*`. Los bloques se comunican **solo** por esas APIs, nunca por variables internas.

| Bloque | Nombre | API pública |
|---|---|---|
| **B00** | Apertura HTML + SDK Firebase + PWA | (setup) |
| **B01** | CSS Base + Sistema de errores (CSS) | (CSS) |
| **B02** | CSS Auth + Licencia | (CSS) |
| **B03** | CSS Menú + POS + Caja | (CSS) |
| **B04** | CSS Framework + HTML Auth + Modales legales | `p04CambiarTab` |
| **B05** | Header global + Menú + 4 vistas + 9 modales | `Bloque05` |
| **B06** | POS UI + UX + accesibilidad | — |
| **B07** | Control de Caja UI + lógica de arqueo | `Caja07` |
| **B08** | Stock UI (4 tabs + 8 modales) | — |
| **B09** | Wiring de "Vincular productos" (delega a B15) | — |
| **B10** | JS Core + Sistema de errores (lógica) | `App` |
| **B11** | Data Layer (Firestore + caché + cola offline) | `Data` |
| **B12** | Auth + Licencia (JWT por dispositivo) | `Auth`, `Licencia` |
| **B13** | POS + Caja (lógica) | `POS`, `Caja` |
| **B14** | Stock + Inventario (catálogo, lotes, OCR) | `Stock` |
| **B15** | Proveedores + Pedidos + Devoluciones + Previsión | `Proveedores`, `Pedidos`, `Prevision`, `Devoluciones` |
| **B16** | Impresora + Impuestos + Cuenta + ARCA | `Impresora`, `Impuestos`, `Cuenta`, `Arca`, `Bloque16` |
| **B17** | Vistas legales + Footer + Cookies | — |
| **Final** | Modo oscuro + Notificaciones + Version checker | `Tema`, `Notif`, `VersionChecker` |

**Reglas de oro** al modificar un bloque:
- Si tocás **B13**, revisá **B06** (binds sobre los mismos IDs).
- Si tocás **B14**, revisá **B08** (IDs del DOM).
- Si tocás **B15**, revisá **B09** (delegación/fallback).
- Si tocás **B16**, revisá **B05** (vistas y modales).



## 🚦 Correr localmente

**No hay build step ni `npm install` en el cliente.** Basta con servir el `index.html` por HTTP (no `file://`) para que Firebase Auth, Firestore y `DecompressionStream` funcionen correctamente.

### Opción A — Servidor estático (recomendado)


# Con Python 3
python3 -m http.server 8000

# O con Node
npx serve .


Abrí `http://localhost:8000/`.

### Opción B — VS Code Live Server

Instalá la extensión [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) y hacé clic en "Go Live" desde `index.html`.

### Modo offline

La app funciona parcialmente offline: las operaciones se guardan en `localStorage.offline_queue_v1` y se sincronizan al recuperar conexión.



## 🚀 Deploy

El deploy es **automático**: cada push a `main` dispara el workflow [`deploy.yml`](.github/workflows/deploy.yml), que:

1. Construye el artefacto público (`index.html`, `reset-password.html`, `version.json`, `manifest.json`, assets de PWA).
2. **Excluye** `firebase.json`, `firestore.rules`, `functions/`, `catalogo/` y `_seed/` para no filtrarlos en Pages.
3. Hace sanity check abortando si algún archivo interno se cuela en el artefacto.
4. Publica en GitHub Pages.
5. Bumpea la versión en `version.json` y commitea con `[skip ci]`.

**Para deployar una nueva versión:** bumpear `version.json` (manual o desde el botón "Run workflow" de Actions). El HTML toma la versión dinámicamente desde el `<meta name="app-version">` o desde `localStorage.app_version_v1`.



## 📦 Catálogo de productos

El catálogo de productos EAN-13 vive en [`catalogo/`](catalogo/) y se sirve comprimido con gzip (~7.86 MB). El panel Stock de la app lo consume vía `Stock.importarCatalogoDesdeURL()`.

- **Documentación completa:** [`catalogo/README.md`](catalogo/README.md)
- **Esquema JSON:** [`catalogo/schema.json`](catalogo/schema.json)
- **Workflow de validación:** [`validar-catalogo.yml`](.github/workflows/validar-catalogo.yml)
- **URL de descarga:**

  ```  https://raw.githubusercontent.com/ArbolDeLosTero/Mejora2/main/catalogo/catalogo_productos.json.gz  ```


## 🔐 Seguridad

- **Secret scanning** y **push protection** activos en GitHub.
- **CodeQL** corre en cada push a `main` (ver [`codeql.yml`](.github/workflows/codeql.yml)).
- **Reglas de Firestore** estrictas en [`firestore.rules`](firestore.rules): el rol admin se valida por `exists(/databases/$(database)/documents/admins/$(uid()))`, no por UID hardcodeado.
- **Cloud Functions** deployadas en `southamerica-east1` con CORS explícito.
- **Certificados ARCA** nunca se loguean; se validan tamaño y formato.

### Reportar una vulnerabilidad

**No abras un issue público.** Ver [`SECURITY.md`](SECURITY.md) para el canal y el proceso.

---

## 📞 Soporte

- **WhatsApp:** +54 9 11 2581-6992
- **Issues:** https://github.com/ArbolDeLosTero/Mejora2/issues
- **Email de reportes automatizados:** configurado desde el panel "Mi Cuenta" → "Errores".



## 📄 Licencia

Software propietario. Todos los derechos reservados. El uso está sujeto al contrato de licencia por dispositivo (mensual, anual o de cajero).

El catálogo de productos (`catalogo/`) se distribuye bajo licencia MIT — ver [`catalogo/LICENSE`](catalogo/LICENSE).
