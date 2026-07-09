/**
 * electron/config.js
 * Plannex Desktop — Bundled API Keys
 *
 * These keys are injected as environment variables into the renderer process
 * by main.js before the window loads. This is equivalent to the .env file
 * used in the web version, but bundled inside the desktop app.
 *
 * ⚠️  SECURITY NOTE: This file is compiled into the app's .asar bundle.
 * Keep this repository PRIVATE on GitHub. Never share the .exe source.
 */

module.exports = {
  // ── Application Info ──────────────────────────────────────────────────────
  APP_NAME: 'Plannex',
  APP_AUTHOR: 'Rachid Taouama',

  // ── AI API Keys ───────────────────────────────────────────────────────────
  // These mirror the .env variables used in the Vite web build.
  // They are set as process.env.VITE_* so the renderer can access them
  // through the same import.meta.env.VITE_* pattern.
  VITE_GEMINI_API_KEY: 'AIzaSyDbq_CvT6pC28bffnnIQ1cSlDC35ub2L0Q',
  VITE_COHERE_API_KEY: 'Ek0vTACIkQorhqj4qclZxeHFV5CB3CePOQ7KButF',
  VITE_HF_API_KEY: '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',
  VITE_GROQ_API_KEY: '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',
  VITE_OPENROUTER_API_KEY: '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',
};
