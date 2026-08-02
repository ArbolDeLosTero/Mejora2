// Importar Firebase desde CDN (versión modular v10)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBKqZH1mF983q04o8_XtuE7waF3tlBeXnI",
  authDomain: "mejora2-9eec7.firebaseapp.com",
  projectId: "mejora2-9eec7",
  storageBucket: "mejora2-9eec7.firebasestorage.app",
  messagingSenderId: "892721742749",
  appId: "1:892721742749:web:f37fa5364d2bc190736574"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Exportar lo que necesitamos para usar en otros archivos
export { db, doc, getDoc, setDoc };
