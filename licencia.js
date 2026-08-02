// Importar CryptoJS para desencriptar (AES-256 y HMAC-SHA256)
import CryptoJS from "https://esm.sh/crypto-js@4.1.1";

// Importar funciones de Firebase desde nuestro archivo de configuración
import { db, doc, getDoc, setDoc } from "./firebase-config.js";

// ==========================================
// CONFIGURACIÓN
// ==========================================
const CLAVE_SECRETA = El23sp3luzn4nt312p4s1ll07M32pr3gunt08m32pr3gunt08s12y02cr3043nl0s; 

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================
function obtenerDeviceId() {
  let deviceId = localStorage.getItem('device_id_v1');
  if (!deviceId) {
    deviceId = 'M2-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    localStorage.setItem('device_id_v1', deviceId);
  }
  return deviceId;
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

// ==========================================
// DECODIFICAR Y VALIDAR LICENCIA
// ==========================================
async function validarLicencia(token) {
  try {
    // 1. Separar el token JWT en sus 3 partes
    const partes = token.split('.');
    if (partes.length !== 3) throw new Error("Formato de clave inválido");

    const headerB64 = partes[0];
    const payloadB64 = partes[1];
    const signatureB64 = partes[2];

    // 2. Verificar la firma HMAC-SHA256
    const firmaEsperada = CryptoJS.HmacSHA256(headerB64 + '.' + payloadB64, CLAVE_SECRETA)
      .toString(CryptoJS.enc.Base64)
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    if (firmaEsperada !== signatureB64) {
      throw new Error("La clave ha sido modificada o es falsa");
    }

    // 3. Desencriptar el payload con AES-256
    const payloadEncriptado = base64UrlDecode(payloadB64);
    const bytesDesencriptados = CryptoJS.AES.decrypt(payloadEncriptado, CLAVE_SECRETA);
    const payloadJSON = bytesDesencriptados.toString(CryptoJS.enc.Utf8);
    
    if (!payloadJSON) throw new Error("No se pudo desencriptar la clave");
    
    const datos = JSON.parse(payloadJSON);

    // 4. Verificar Device ID
    const deviceIdLocal = obtenerDeviceId();
    if (datos.deviceId !== deviceIdLocal) {
      throw new Error("Esta licencia no pertenece a este dispositivo");
    }

    // 5. Verificar fecha de expiración (si no es permanente)
    if (datos.tipo === 'temporal' && datos.fechaExpiracion) {
      const hoy = new Date();
      const expiracion = new Date(datos.fechaExpiracion);
      if (hoy > expiracion) {
        throw new Error("La licencia ha expirado");
      }
    }

    // 6. Validar contra Firebase (si hay internet)
    if (navigator.onLine) {
      const docRef = doc(db, "licencias", datos.deviceId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const dataFirebase = docSnap.data();
        if (dataFirebase.activa === false) {
          throw new Error("La licencia ha sido deshabilitada por el administrador");
        }
      } else {
        // Si no existe en Firebase, la registramos como activa por defecto al validarla por primera vez
        await setDoc(docRef, {
          deviceId: datos.deviceId,
          cliente: datos.cliente,
          proyecto: datos.proyecto,
          activa: true,
          ultimaValidacion: new Date().toISOString()
        });
      }

      // Guardar token de respaldo para modo offline
      const tokenOffline = {
        token: token,
        timestamp: new Date().toISOString(),
        diasOffline: datos.diasOffline || 7
      };
      localStorage.setItem('licencia_offline_v1', JSON.stringify(tokenOffline));
    } else {
      // 7. Modo Offline: Verificar token local
      const offlineStr = localStorage.getItem('licencia_offline_v1');
      if (!offlineStr) throw new Error("Conecte a internet para validar la licencia por primera vez");
      
      const offline = JSON.parse(offlineStr);
      const diasDesdeUltimaValidacion = (new Date() - new Date(offline.timestamp)) / (1000 * 60 * 60 * 24);
      
      if (diasDesdeUltimaValidacion > offline.diasOffline) {
        throw new Error("Período offline excedido. Conecte a internet para renovar.");
      }
    }

    // ¡Todo correcto!
    localStorage.setItem('licencia_v1', 'activa');
    localStorage.setItem('licencia_datos_v1', JSON.stringify(datos));
    
    return { valida: true, datos: datos };

  } catch (error) {
    console.error("Error de licencia:", error.message);
    return { valida: false, error: error.message };
  }
}

// ==========================================
// VERIFICACIÓN AL INICIAR LA APP
// ==========================================
async function verificarLicenciaAlIniciar() {
  const estado = localStorage.getItem('licencia_v1');
  
  // Si no hay licencia guardada, requerimos activación
  if (estado !== 'activa') {
    return { requiereActivacion: true };
  }

  // Si hay licencia, verificamos que siga siendo válida (especialmente offline)
  const offlineStr = localStorage.getItem('licencia_offline_v1');
  if (offlineStr && !navigator.onLine) {
    const offline = JSON.parse(offlineStr);
    const diasDesdeUltimaValidacion = (new Date() - new Date(offline.timestamp)) / (1000 * 60 * 60 * 24);
    if (diasDesdeUltimaValidacion > offline.diasOffline) {
      return { requiereActivacion: true, error: "Período offline excedido" };
    }
  }

  return { requiereActivacion: false };
}

// Exportar funciones para usarlas en index.html
export { validarLicencia, verificarLicenciaAlIniciar, obtenerDeviceId };
