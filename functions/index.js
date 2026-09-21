/* ═══════════════════════════════════════════════════════════ */
/* MEJORA 2 — Cloud Functions                                 */
/* v1.0 — ARCA (scaffolding) + health check                   */
/* Requiere plan Blaze para deploy                            */
/* ═══════════════════════════════════════════════════════════ */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

/* ═══════════════════════════════════════════════════════════ */
/* HELPERS                                                    */
/* ═══════════════════════════════════════════════════════════ */

/**
 * Valida que el caller sea admin del comercio indicado.
 * Lanza error si no lo es.
 */
async function validarAdminComercio(comercioId, auth) {
  if (!auth || !auth.uid) {
    throw new functions.https.HttpsError(
      'unauthenticated', 'No hay sesión activa'
    );
  }
  if (!comercioId) {
    throw new functions.https.HttpsError(
      'invalid-argument', 'Falta comercioId'
    );
  }

  const userDoc = await db.collection('usuarios').doc(auth.uid).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError(
      'not-found', 'Usuario no encontrado'
    );
  }
  const userData = userDoc.data();
  if (userData.comercioId !== comercioId) {
    throw new functions.https.HttpsError(
      'permission-denied', 'No pertenecés a este comercio'
    );
  }
  if (userData.rol !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied', 'Solo el admin puede hacer esto'
    );
  }

  const comercioDoc = await db.collection('comercios').doc(comercioId).get();
  if (!comercioDoc.exists) {
    throw new functions.https.HttpsError(
      'not-found', 'Comercio no encontrado'
    );
  }

  return { userData, comercioData: comercioDoc.data() };
}

/* ═══════════════════════════════════════════════════════════ */
/* ARCA — Probar conexión                                     */
/* ═══════════════════════════════════════════════════════════ */
exports.arcaProbarConexion = functions.https.onCall(async (data, context) => {
  const { comercioId, entorno } = data || {};
  await validarAdminComercio(comercioId, context.auth);

  functions.logger.info('arcaProbarConexion', { comercioId, entorno });

  // TODO: implementar handshake con WSAA de ARCA
  // 1. Generar TRA (Ticket de Requerimiento de Acceso)
  // 2. Firmar con el certificado del comercio
  // 3. Llamar a WSAA para obtener TA (Ticket de Acceso)
  // 4. Devolver ok: true si todo funciona

  return {
    ok: true,
    entorno: entorno || 'homologacion',
    mensaje: 'Conexión simulada OK. Falta implementar WSAA real.',
    timestamp: Date.now()
  };
});

/* ═══════════════════════════════════════════════════════════ */
/* ARCA — Vincular (guardar certificado)                      */
/* ═══════════════════════════════════════════════════════════ */
exports.arcaConectar = functions.https.onCall(async (data, context) => {
  const { comercioId, entorno, cert, key, password, puntoVenta } = data || {};
  await validarAdminComercio(comercioId, context.auth);

  if (!cert) {
    throw new functions.https.HttpsError(
      'invalid-argument', 'Falta el certificado'
    );
  }
  if (!puntoVenta || puntoVenta < 1) {
    throw new functions.https.HttpsError(
      'invalid-argument', 'Punto de venta inválido'
    );
  }

  functions.logger.info('arcaConectar', {
    comercioId, entorno,
    certLen: cert.length,
    tieneKey: !!key,
    puntoVenta
  });

  // TODO: validar que el certificado y la key sean válidos
  // TODO: guardar en un campo seguro (o Secret Manager)
  // Por ahora solo guardamos metadata

  await db.collection('comercios').doc(comercioId).update({
    arca_config: {
      conectado: true,
      entorno: entorno || 'homologacion',
      punto_venta: puntoVenta,
      fecha_vinculacion: Date.now(),
      // NO guardar cert/key acá en producción.
      // Usar Secret Manager o un bucket privado.
      _pendiente_implementacion: true,
      ultimo_error: null
    }
  });

  return {
    ok: true,
    mensaje: 'Configuración guardada. Falta implementar la conexión real con ARCA.',
    entorno: entorno || 'homologacion'
  };
});

/* ═══════════════════════════════════════════════════════════ */
/* ARCA — Emitir factura                                      */
/* ═══════════════════════════════════════════════════════════ */
exports.arcaEmitirFactura = functions.https.onCall(async (data, context) => {
  const { comercioId, ventaId } = data || {};
  await validarAdminComercio(comercioId, context.auth);

  if (!ventaId) {
    throw new functions.https.HttpsError(
      'invalid-argument', 'Falta ventaId'
    );
  }

  const ventaDoc = await db
    .collection('comercios').doc(comercioId)
    .collection('ventas').doc(ventaId).get();

  if (!ventaDoc.exists) {
    throw new functions.https.HttpsError(
      'not-found', 'Venta no encontrada'
    );
  }

  functions.logger.info('arcaEmitirFactura', { comercioId, ventaId });

  // TODO: implementar WSFE (Web Service de Facturación Electrónica)
  // 1. Obtener TA (Ticket de Acceso) vigente o pedir uno nuevo
  // 2. Armar el request de FECAESolicitar con los datos de la venta
  // 3. Enviar a ARCA y esperar CAE
  // 4. Guardar CAE en la venta

  return {
    ok: false,
    motivo: 'proximamente',
    mensaje: 'La emisión de facturas todavía no está implementada. Requiere WSAA + WSFE reales.',
    ventaId
  };
});

/* ═══════════════════════════════════════════════════════════ */
/* Health check (para debugging)                              */
/* ═══════════════════════════════════════════════════════════ */
exports.health = functions.https.onRequest((req, res) => {
  res.json({
    ok: true,
    version: '1.0.0',
    timestamp: Date.now(),
    funciones: ['arcaProbarConexion', 'arcaConectar', 'arcaEmitirFactura']
  });
});
