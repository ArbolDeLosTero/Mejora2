# Política de seguridad — Mejora2

Este documento describe cómo reportar vulnerabilidades de seguridad en el
proyecto **Mejora2** y sus componentes asociados (aplicación PWA, Cloud
Functions, reglas de Firestore, catálogo de productos).

Aplica al repositorio [`ArbolDeLosTero/Mejora2`](https://github.com/ArbolDeLosTero/Mejora2)
y a todo el código e infraestructura que depende de él.



## Versiones soportadas

Solo la última versión publicada en
[`https://arboldelosterro.github.io/Mejora2/`](https://arboldelosterro.github.io/Mejora2/)
recibe parches de seguridad. Las versiones anteriores no reciben soporte.

Si encontrás una vulnerabilidad en una versión anterior, primero verificá que
también esté presente en la última. Si ya fue corregida, no es necesario
reportarla.



## Alcance

### Dentro del alcance

Buscamos activamente reportes sobre:

- Bypass de las reglas de seguridad de Firestore (`firestore.rules`).
- Escalada de privilegios entre comercios (un comercio accediendo a datos de
  otro).
- Bypass del sistema de licencias por dispositivo.
- Ejecución remota de código en el cliente (XSS persistente o reflejado) vía
  `index.html`, `reset-password.html` o cualquier vista de la app.
- Filtración de datos de usuarios vía las Cloud Functions (`functions/`).
- Exposición de credenciales ARCA (certificados, claves privadas, tokens
  WSAA).
- Manipulación del catálogo de productos para inyectar contenido malicioso
  en la app.
- Vulnerabilidades en la cadena de autenticación (Firebase Auth, JWT de
  licencias, recuperación de contraseña).

### Fuera del alcance

No consideramos vulnerabilidades a:

- Falta de headers HTTP de seguridad (HSTS, CSP, X-Frame-Options). Es una
  limitación de GitHub Pages, no una decisión del proyecto.
- Ataques de denegación de servicio (DoS/DDoS). La infraestructura la opera
  GitHub y Google, no el mantenedor.
- Ingeniería social contra el mantenedor o contra los usuarios.
- Reportes de "el código no está minificado" o "podés leer el JavaScript". Es
  una PWA vanilla; todo el código es público por diseño.
- Vulnerabilidades en dependencias de terceros (`axios`, `firebase-functions`,
  etc.) **a menos que sean explotables en el contexto de Mejora2**. Esas se
  rastrean vía Dependabot.
- Resultados de escáneres automáticos sin prueba de concepto ni análisis de
  impacto real.
- Reportes sobre la API key pública de Firebase (`AIza...`). Firebase la
  diseñó para ser pública; su exposición no es una vulnerabilidad.



## Cómo reportar

### Canal principal — GitHub Private Security Advisories

**Recomendado.** Abrí un advisory privado desde:

```https://github.com/ArbolDeLosTero/Mejora2/security/advisories/new```

Esto abre un canal privado entre vos y el mantenedor. No requiere exponer tu
email ni tu identidad.

### Canal alternativo — WhatsApp

Si no podés usar GitHub Advisories (por ejemplo, no tenés cuenta), podés
escribir al WhatsApp:

```+54 9 11 2581-6992```

**Solo texto, no llamadas.** Es un canal de último recurso: si podés usar el
advisory de GitHub, usalo.

### Qué NO hacer

**No abras un issue público.** Los issues son indexados por Google y por
bots, y una vulnerabilidad publicada antes de tener un fix pone en riesgo a
todos los usuarios activos.

Si no estás seguro de si algo es una vulnerabilidad, reportalo por el canal
privado igual. Preferimos un reporte de más que un incidente real.



## Qué incluir en el reporte

Para que podamos triagear rápido, incluí:

1. **Descripción del problema.** Qué es, dónde está, por qué importa.
2. **Pasos para reproducirlo.** Precisos, numerados, sin asumir contexto.
3. **Prueba de concepto (PoC).** Un script, un video, una secuencia de
   requests, o pasos exactos que disparen el comportamiento. Sin PoC, muchos
   reportes no se pueden validar.
4. **Impacto estimado.** Qué puede hacer un atacante con esto. ¿Lee datos de
   otros comercios? ¿Ejecuta código? ¿Escala privilegios?
5. **Entorno donde lo probaste.** Navegador y versión (Chrome 120, Safari
   17.2, etc.), sistema operativo, y si usaste la app en producción o en
   local.
6. **Versión afectada.** La versión de la app (visible en el footer) o el
   commit hash si lo tenés.
7. **Si querés ser acreditado o preferís anonimato.** Ambas opciones son
   válidas.
8. **Si ya lo reportaste por otro canal.** Para no duplicar triage.



## Proceso post-reporte

### Acuse de recibo

Confirmamos la recepción del reporte dentro de los **3 días hábiles**
posteriores al envío (horario argentino, lunes a viernes).

### Triage inicial

Dentro de los **7 días hábiles** posteriores al acuse, te confirmamos:

- Si consideramos el reporte válido.
- Si lo consideramos inválido (con justificación).
- Si necesitamos más información para decidir.

### Plazos de fix

Desde el triage, nos comprometemos a tener un fix desplegado en:

| Severidad | Plazo máximo |
|---|---|
| Crítica | 14 días |
| Alta | 30 días |
| Media | 60 días |
| Baja | 90 días, o el próximo release (lo que ocurra primero) |

La severidad la definimos en conjunto con vos durante el triage. Si no estás
de acuerdo con la clasificación, lo discutimos.

### Divulgación coordinada

No publicamos nada sobre la vulnerabilidad hasta que haya un fix desplegado
o hasta que hayan pasado 90 días desde el reporte (lo que ocurra primero).

Antes de publicar cualquier detalle técnico, te avisamos y te damos la
oportunidad de revisar el texto. Si querés que te acreditemos públicamente,
decilo en el reporte. Si preferís mantenerte anónimo, respetamos eso.

### CVE

Para vulnerabilidades confirmadas de severidad **Alta** o **Crítica**,
solicitamos un CVE (Common Vulnerabilities and Exposures) a MITRE o al CNA de
GitHub. El CVE incluirá tu nombre o alias como descubridor, salvo que pidas
anonimato.

Para severidad Media o Baja, no solicitamos CVE; el fix se documenta en el
CHANGELOG y en las release notes.



## Safe Harbor

Consideramos que la investigación de seguridad de buena fe es una
contribución al proyecto. **Si reportás una vulnerabilidad siguiendo esta
política, no vamos a tomar acciones legales contra vos.**

Las actividades cubiertas por este safe harbor son:

- Probar la app en tu propio comercio de prueba o cuenta personal.
- Probar las reglas de Firestore con tu propia cuenta y tus propios datos.
- Analizar el código público de `index.html`, `reset-password.html`,
  `firestore.rules` y `functions/`.
- Interceptar tráfico entre tu propio cliente y el backend.
- Ejecutar pruebas automatizadas contra tu propia cuenta.

Quedan **explícitamente fuera** de este safe harbor:

- Acceder a datos de otros comercios o usuarios.
- Modificar o borrar datos que no te pertenezcan.
- Ataques de denegación de servicio (DoS/DDoS) contra la app, Firebase o
  GitHub Pages.
- Ingeniería social contra usuarios o contra el mantenedor.
- Divulgar la vulnerabilidad públicamente antes del plazo acordado.

Si tenés dudas sobre si una actividad está cubierta, preguntá antes por el
canal privado.



## Reconocimiento

Agradecemos a las personas que reportan vulnerabilidades de buena fe. Si
querés, te acreditamos en:

- El `CHANGELOG.md` del proyecto (cuando exista).
- Las release notes del fix.
- Una sección de agradecimientos que vamos a mantener en este mismo archivo.

### Agradecimientos

Todavía no hay reportes públicos acreditados.



## Contacto del mantenedor

**Mantenedor:** `@ArbolDeLosTero`
**Repo principal:** https://github.com/ArbolDeLosTero/Mejora2
**App en producción:** https://arboldelosterro.github.io/Mejora2/
**Canal de reporte preferido:** GitHub Private Security Advisories



*Última actualización: 11 de octubre de 2026.*
