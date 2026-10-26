# Stock v5 — Notas de implementación

## Estado: v8 del bloque B14

## Limitaciones conocidas

### 1. Importación concurrente entre dispositivos
`Storage.saveManyProductos` hace merge contra `StockState.productos` local.
Si dos dispositivos importan simultáneamente:
- Los IDs únicos de `_genId('prod')` evitan colisiones de ID.
- Las colisiones por código/nombre se resuelven con `_esDuplicado` local,
  pero NO cruzan dispositivos.
- Resultado: last-write-wins por producto. Si ambos dispositivos crean el
  mismo producto (mismo código), ambos quedan en Firestore hasta la
  próxima lectura, que devuelve el del último write.

**No hay lock cross-tab en B11.** Los locks de `navigator.locks` están
solo en B13 (correlativo de ticket y turno). El plan §13 punto 7 asumía
lo contrario; esa asunción era incorrecta.

**Mitigación actual:** ninguna automática. Es una limitación aceptada
para el caso de uso (kiosco con 1-2 dispositivos).

### 2. Productos draft que nunca se completan
Los productos con `_import_status: 'draft'` persisten indefinidamente
si el usuario nunca los edita. No hay cleanup automático ni cron.

**Mitigación actual:** el badge "Incompleto" en el catálogo y en el POS
los hace visibles. El filtro `p04-filtro-origen = draft` permite verlos
en bloque.

**Recomendación para v6:** agregar un contador de "drafts > 90 días" en
Mi Cuenta → Sistema, o un cron en Cloud Functions que los archive.

### 3. `_resolverProveedorPorNombre` — fallback con cache potencialmente stale
Si B15 (`Proveedores`) nunca se inicializó en la sesión, B14 cae al
fallback `StockState.proveedores`. Este cache puede contener
proveedores ya eliminados en Firestore por otro dispositivo.

**Mitigación implementada (FIX-B14-A):** si `Proveedores.estaListo()`
retorna `true`, B14 usa SOLO B15 (onSnapshot vivo). El fallback se
aplica únicamente cuando B15 nunca cargó.

## Flujos cubiertos por Fase 5

- Focus trap en los 10 modales de B14 (paridad con B06 v7).
- Badge draft en POS (`renderListaProductos`).
- Warning draft en POS (`agregarAlTicket`).
- `POS.completarProductoRapido` para el atajo de completado.
- `destroy()` en `ImportWizard`, `Enricher`, `Discovery`.
- Flag `Proveedores.estaListo()` para consumo desde B14.

## Puntos abiertos del plan que NO se implementan en v5

- Punto #3: drafts sin cleanup → documentado arriba, dejado para v6.
- Punto #7: lock cross-tab en `Data.set` → no implementado, documentado arriba.
- Punto #4 y #5: verificación de Precios Claros (mayorista/minorista, IVA) →
  requiere validación manual contra la API real.