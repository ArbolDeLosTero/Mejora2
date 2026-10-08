# mejora2-catalogo

Catálogo de productos con códigos de barras EAN-13 para la aplicación Mejora 2.

## 📋 Descripción

Este repositorio contiene el catálogo de referencia de productos que utiliza la aplicación Mejora 2 para autocompletar descripciones, categorías y precios sugeridos al escanear un código de barras.

## 📁 Estructura del repositorio

- `catalogo_productos.json` — Catálogo completo de productos (EAN, descripción, categoría, precio referencia)
- `tabla_caducidad.json` — Tabla de días estimados de caducidad por categoría
- `precios_referencia.json` — Precios de mercado de referencia (se actualiza periódicamente)
- `scripts/` — Scripts Python que generan y actualizan los archivos

## 📊 Fuentes de datos

- **Open Food Facts** — Base de datos abierta y colaborativa (licencia ODbL, uso comercial permitido)
- **Precios Claros** — Datos abiertos oficiales del Gobierno Argentino
- **Categorización propia** — Tabla de caducidad por categoría basada en el Código Alimentario Argentino

## 🔄 Actualización

Los archivos JSON se regeneran periódicamente mediante los scripts en `scripts/`.

## 📄 Licencia

MIT License — uso comercial permitido.
