# Módulo ARCA — Pendiente de implementación real

Este directorio es un placeholder. Cuando se active el plan Blaze de Firebase
y se decida implementar facturación electrónica real, acá van los módulos:

- `wsaa.js` — Web Service de Autenticación y Autorización
- `wsfe.js` — Web Service de Facturación Electrónica
- `afip-config.js` — URLs y constantes de ARCA

Por ahora, las Cloud Functions de ARCA (`arcaProbarConexion`, `arcaConectar`,
`arcaEmitirFactura` en `../index.js`) devuelven respuestas simuladas.

---

## Qué falta implementar

### 1. `wsaa.js` — Autenticación

El flujo WSAA (Web Service de Autenticación y Autorización) es:

1. Generar un **TRA** (Ticket de Requerimiento de Acceso) en XML con:
   - `uniqueId` (timestamp en segundos)
   - `generationTime` (ahora - 10 min)
   - `expirationTime` (ahora + 10 min)
   - `service` (ej: `wsfe`)

2. Firmar el TRA con **CMS** usando el certificado X.509 y la clave privada
   - Usar `node-forge` para esto
   - El resultado es un sobre PKCS#7 en base64

3. Enviar el TRA firmado al endpoint WSAA:
   - Homologación: `https://wswhomo.afip.gov.ar/wsaa/services/wsaa.asmx`
   - Producción: `https://wsaa.afip.gov.ar/wsaa/services/wsaa.asmx`
   - Método SOAP: `loginCms`

4. Parsear la respuesta XML y extraer:
   - `token`
   - `sign`
   - `expirationTime` (válido 12 horas)

5. **Cachear el TA** (Ticket de Acceso) para no pedirlo en cada factura.
   Guardarlo en Firestore o en memoria de la function (con cuidado, las
   functions son stateless).

### 2. `wsfe.js` — Facturación

El flujo WSFE (Web Service de Facturación Electrónica):

1. Obtener el TA vigente (o pedir uno nuevo con `wsaa.js`)

2. Para cada factura, llamar a `FECAESolicitar` con:
   - `Auth` (token + sign del TA)
   - `FeCabReq` (CUIT, punto de venta, tipo de comprobante, cantidad)
   - `FeDetReq` (detalle de items, importes, alícuotas de IVA)
   - `CbteDesde` / `CbteHasta` (número correlativo)

3. Parsear la respuesta:
   - Si `Resultado === 'A'`: aprobada → guardar `CAE` y `CAEVencimiento`
   - Si `Resultado === 'R'`: rechazada → guardar observaciones y errores
   - Si `Resultado === 'P'`: parcial → revisar observaciones

4. Guardar el CAE en la venta en Firestore

5. Manejar los **últimos números de comprobante** con `FECompUltimoAutorizado`
   antes de facturar, para no repetir correlativos.

### 3. `afip-config.js` — Constantes

```javascript
module.exports = {
  HOMOLOGACION: {
    WSAA_URL: 'https://wswhomo.afip.gov.ar/wsaa/services/wsaa.asmx',
    WSFE_URL: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
    CUIT_HOMOLOGACION: '20409378472' // CUIT de prueba de AFIP
  },
  PRODUCCION: {
    WSAA_URL: 'https://wsaa.afip.gov.ar/wsaa/services/wsaa.asmx',
    WSFE_URL: 'https://servicios1.afip.gob.ar/wsfev1/service.asmx'
  },
  TIPOS_COMPROBANTE: {
    FACTURA_A: 1,
    FACTURA_B: 6,
    FACTURA_C: 11,
    NOTA_CREDITO_A: 3,
    NOTA_CREDITO_B: 7,
    NOTA_CREDITO_C: 12,
    REMITO: 91
  },
  ALICUOTAS_IVA: {
    NO_GRAVADO: 1,
    EXENTO: 2,
    CERO: 3,
    DIEZ_Y_MEDIO: 4,
    VEINTIUNO: 5,
    VEINTISIETE: 6
  },
  MONEDA: {
    PESOS: 'PES',
    DOLARES: 'DOL'
  },
  COTIZACION_PESOS: 1
};
