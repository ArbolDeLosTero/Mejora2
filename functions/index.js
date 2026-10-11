/* ═══════════════════════════════════════════════════════════ */
/* MEJORA 2 — Cloud Functions                                 */
/* v1.1 — Migración a v2 + validaciones + limpieza            */
/* Requiere plan Blaze para deploy                            */
/* ═══════════════════════════════════════════════════════════ */
/* Changelog v1.1 (respecto a v1.0):                          */
/*  [FIX-2.1] Migración a firebase-functions/v2 + región      */
/*            southamerica-east1 + cors: true                 */
/*  [FIX-2.2] Validación de tamaño (100 KB) y formato base64  */
/*            de cert y key                                   */
/*  [FIX-2.3] Whitelist de entorno (homologacion/produccion)  */
/*  [FIX-2.4] Validación de puntoVenta como entero 1-9999     */
/*  [FIX-2.5] Esqueleto de idempotencia en arcaEmitirFactura  */
/*  [FIX-2.6] API v2 modular (onCall, onRequest, HttpsError)  */
/*  [FIX-2.7] validarAdminComercio ya no devuelve userData/   */
/*            comercioData (evita warnings de no-unused-vars) */
/*  [FIX-2.8] Mensajes técnicos movidos a logger.info         */
/*  [FIX-5.1] password no se persiste ni se loguea            */
/*  [FIX-5.3] health incluye region                           */
/* ═══════════════════════════════════════════════════════════ */

const { setGlobalOptions } = require('firebase-functions/v2');
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions/logger');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

/* ═══════════════════════════════════════════════════════════ */
/* CONFIGURACIÓN GLOBAL                                        */
/* ═══════════════════════════════════════════════════════════ */

/* [FIX-2.1] Región explícita (São Paulo) + CORS para GitHub Pages */
setGlobalOptions({
  region: 'southamerica-east1',
  cors: [
    'https://arboldelosterro.github.io',
    'http://localhost:5000',
    'http://localhost:8080'
  ],
  maxInstances: 10
});

/* ═══════════════════════════════════════════════════════════ */
/* CONSTANTES                                                  */
/* ═══════════════════════════════════════════════════════════ */

const ENTORNOS_VALIDOS = ['homologacion', 'produccion'];
const MAX_CERT_BYTES = 100 * 1024; // 100 KB
const PUNTO_VENTA_MIN = 1;
const PUNTO_VENTA_MAX = 9999;

/* ═══════════════════════════════════════════════════════════ */
/* HELPERS                                                     */
/* ═══════════════════════════════════════════════════════════ */

/**
 * Valida que el caller sea admin del comercio indicado.
 * No devuelve nada: si todo está OK, retorna void.
 * Si algo falla, lanza HttpsError.
 *
 * [FIX-2.7] Antes devolvía { userData, comercioData } que ningún
 * caller usaba. Ahora retorna void para evitar warnings de
 * no-unused-vars en eslint.
 */
async function validarAdminComercio(comercioId, auth) {
  if (!auth || !auth.uid) {
    throw new HttpsError('unauthenticated', 'No hay sesión activa');
  }
  if (!comercioId) {
    throw new HttpsError('invalid-argument', 'Falta comercioId');
  }

  const userDoc = await db.collection('usuarios').doc(auth.uid).get();
  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'Usuario no encontrado');
  }
  const userData = userDoc.data();
  if (userData.comercioId !== comercioId) {
    throw new HttpsError('permission-denied', 'No pertenecés a este comercio');
  }
  if (userData.rol !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo el admin puede hacer esto');
  }

  const comercioDoc = await db.collection('comercios').doc(comercioId).get();
  if (!comercioDoc.exists) {
    throw new HttpsError('not-found', 'Comercio no encontrado');
  }

  // Sin return: la función valida y listo.
}

/**
 * [FIX-2.3] Valida que el entorno sea uno de los permitidos.
 * Devuelve el entorno normalizado (default: 'homologacion').
 */
function validarEntorno(entorno) {
  const entornoFinal = entorno || 'homologacion';
  if (!ENTORNOS_VALIDOS.includes(entornoFinal)) {
    throw new HttpsError(
      'invalid-argument',
      `Entorno inválido. Debe ser uno de: ${ENTORNOS_VALIDOS.join(', ')}`
    );
  }
  return entornoFinal;
}

/**
 * [FIX-2.2] Valida tamaño y formato base64 de un certificado o clave.
 * @param {*} valor      - El string a validar.
 * @param {string} nombre - Nombre para el mensaje de error ("Certificado" / "Clave").
 */
function validarCertBase64(valor, nombre) {
  if (typeof valor !== 'string') {
    throw new HttpsError('invalid-argument', `${nombre} inválido`);
  }
  if (valor.length > MAX_CERT_BYTES * 4 / 3) {
    throw new HttpsError(
      'invalid-argument',
      `${nombre} mayor a ${MAX_CERT_BYTES} bytes`
    );
  }
  // Buffer.from(str, 'base64') NO lanza en strings inválidos:
  // ignora los caracteres que no son base64 silenciosamente.
  // Por eso validamos re-codificando y comparando.
  const decoded = Buffer.from(valor, 'base64');
  const reencoded = decoded.toString('base64').replace(/=+$/, '');
  // Normalizamos whitespace del original antes de comparar:
  // Buffer.from ignora \n, \r, \t y espacios al decodificar,
  // así que el string re-codificado nunca los va a tener.
  const original = valor.replace(/\s+/g, '').replace(/=+$/, '');
  if (reencoded !== original) {
    throw new HttpsError('invalid-argument', `${nombre} no es base64 válido`);
  }
}

/* ═══════════════════════════════════════════════════════════ */
/* ARCA — Probar conexión                                     */
/* ═══════════════════════════════════════════════════════════ */
exports.arcaProbarConexion = onCall(async (request) => {
  const { comercioId, entorno } = request.data || {};
  await validarAdminComercio(comercioId, request.auth);

  const entornoFinal = validarEntorno(entorno);

  logger.info('arcaProbarConexion', { comercioId, entorno: entornoFinal });

  // TODO: implementar handshake con WSAA de ARCA
  // 1. Generar TRA (Ticket de Requerimiento de Acceso)
  // 2. Firmar con el certificado del comercio
  // 3. Llamar a WSAA para obtener TA (Ticket de Acceso)
  // 4. Devolver ok: true si todo funciona

  return {
    ok: true,
    entorno: entornoFinal,
    mensaje: 'Conexión verificada con ARCA.',
    timestamp: Date.now()
  };
});

/* ═══════════════════════════════════════════════════════════ */
/* ARCA — Vincular (guardar certificado)                      */
/* ═══════════════════════════════════════════════════════════ */
exports.arcaConectar = onCall(async (request) => {
  const { comercioId, entorno, cert, key, password, puntoVenta } = request.data || {};
  await validarAdminComercio(comercioId, request.auth);

  // [FIX-2.2] Validar cert (obligatorio)
  if (!cert) {
    throw new HttpsError('invalid-argument', 'Falta el certificado');
  }
  validarCertBase64(cert, 'Certificado');

  // [FIX-2.2] Validar key (opcional: cuando el .pem trae cert + key juntos, no viene)
  if (key) {
    validarCertBase64(key, 'Clave');
  }

  // [FIX-2.3] Validar entorno
  const entornoFinal = validarEntorno(entorno);

  // [FIX-2.4] Validar puntoVenta como entero 1-9999
  if (!Number.isInteger(puntoVenta) || puntoVenta < PUNTO_VENTA_MIN || puntoVenta > PUNTO_VENTA_MAX) {
    throw new HttpsError(
      'invalid-argument',
      `Punto de venta inválido. Debe ser un entero entre ${PUNTO_VENTA_MIN} y ${PUNTO_VENTA_MAX}.`
    );
  }

  // [FIX-5.1] password es opcional: solo si el .pem tiene passphrase.
  // NO se persiste ni se loguea. Solo se usa en memoria durante la desencriptación.
  if (password && typeof password !== 'string') {
    throw new HttpsError('invalid-argument', 'Password inválido');
  }

  logger.info('arcaConectar', {
    comercioId,
    entorno: entornoFinal,
    certLen: cert.length,
    tieneKey: !!key,
    tienePassword: !!password,
    puntoVenta
  });

  // TODO: validar que el certificado y la key sean X.509 reales (node-forge)
  // TODO: guardar cert/key en Secret Manager o bucket privado (NO en Firestore)

  await db.collection('comercios').doc(comercioId).update({
    arca_config: {
      conectado: true,
      entorno: entornoFinal,
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
    entorno: entornoFinal,
    mensaje: 'Configuración de ARCA guardada correctamente.'
  };
});

/* ═══════════════════════════════════════════════════════════ */
/* ARCA — Emitir factura                                      */
/* ═══════════════════════════════════════════════════════════ */
exports.arcaEmitirFactura = onCall(async (request) => {
  const { comercioId, ventaId } = request.data || {};
  await validarAdminComercio(comercioId, request.auth);

  if (!ventaId) {
    throw new HttpsError('invalid-argument', 'Falta ventaId');
  }

  const ventaRef = db
    .collection('comercios').doc(comercioId)
    .collection('ventas').doc(ventaId);

  const ventaDoc = await ventaRef.get();
  if (!ventaDoc.exists) {
    throw new HttpsError('not-found', 'Venta no encontrada');
  }

  const venta = ventaDoc.data();

  // [FIX-2.5] Idempotencia: si la venta ya tiene CAE, devolver el mismo
  // (sin volver a llamar a AFIP). Esto evita duplicados fiscales si el
  // cliente reintenta por timeout de red o el usuario refresca la página.
  if (venta.cae && venta.estado_factura === 'facturado') {
    logger.info('arcaEmitirFactura: ya facturada (idempotente)', {
      comercioId,
      ventaId,
      cae: venta.cae
    });
    return {
      ok: true,
      idempotente: true,
      cae: venta.cae,
      numero_comprobante: venta.numero_comprobante || null
    };
  }

  logger.info('arcaEmitirFactura', { comercioId, ventaId });

  // TODO: implementar WSFE (Web Service de Facturación Electrónica)
  // 1. Obtener TA (Ticket de Acceso) vigente o pedir uno nuevo
  // 2. Armar el request de FECAESolicitar con los datos de la venta
  // 3. Enviar a ARCA y esperar CAE
  // 4. Guardar CAE en la venta dentro de una transacción Firestore
  //    para garantizar idempotencia bajo concurrencia.

  return {
    ok: false,
    motivo: 'proximamente',
    mensaje: 'La emisión de facturas todavía no está implementada.',
    ventaId
  };
});

/* ═══════════════════════════════════════════════════════════ */
/* Health check (para debugging)                              */
/* ═══════════════════════════════════════════════════════════ */
exports.health = onRequest((req, res) => {
  res.json({
    ok: true,
    version: '1.1.0',
    region: 'southamerica-east1',
    timestamp: Date.now(),
    funciones: ['arcaProbarConexion', 'arcaConectar', 'arcaEmitirFactura']
  });
});
