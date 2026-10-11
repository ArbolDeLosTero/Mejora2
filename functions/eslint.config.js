/**
 * ESLint 9 — Flat config para Cloud Functions de Mejora2
 *
 * Contexto:
 *   · firebase.json → functions.predeploy ejecuta `npm run lint`.
 *   · package.json → scripts.lint = "eslint ."
 *   · Este archivo es la config que ESLint 9 busca por convención
 *     (flat config, reemplaza al viejo .eslintrc.*).
 *
 * Alcance:
 *   · Solo lintea los .js de functions/ (index.js y módulos futuros
 *     como wsaa.js, wsfe.js, afip-config.js).
 *   · Node 20, CommonJS (require/module.exports).
 *
 * Reglas:
 *   · Hereda eslint:recommended vía @eslint/js.
 *   · no-unused-vars → 'warn' (no rompe el deploy, solo avisa).
 *   · no-console      → 'off'  (deja console disponible para debug).
 */

'use strict';

const js = require('@eslint/js');

module.exports = [
  // 1) Reglas recomendadas de ESLint (equivalentes a "eslint:recommended").
  js.configs.recommended,

  // 2) Configuración específica para el runtime de Node 20 + CommonJS.
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',

      // Globals del runtime de Node 20.
      // Los de CommonJS (require, module, exports, __dirname, __filename)
      // los habilita automáticamente sourceType: 'commonjs'.
      // Estos son los que hay que declarar a mano:
      globals: {
        console:        'readonly',
        process:        'readonly',
        Buffer:         'readonly',
        setTimeout:     'readonly',
        clearTimeout:   'readonly',
        setInterval:    'readonly',
        clearInterval:  'readonly',
        setImmediate:   'readonly',
        clearImmediate: 'readonly',
        global:         'readonly',
        globalThis:     'readonly'
      }
    },

    rules: {
      // Warnings, no errores: el predeploy no se bloquea por vars sin usar.
      'no-unused-vars': 'warn',

      // Permitir console.* para debugging local.
      // El código de producción usa functions.logger, no console.
      'no-console': 'off'
    }
  }
];
