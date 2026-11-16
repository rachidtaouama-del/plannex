/**
 * electron/config.js
 * Plannex Desktop — Bundled API Keys
 *
 * These keys are injected as environment variables into the renderer process
 * by main.js before the window loads. This is equivalent to the .env file
 * used in the web version, but bundled inside the desktop app.
 */

module.exports = {
  // ── Application Info ──────────────────────────────────────────────────────
  APP_NAME: 'Plannex',
  APP_AUTHOR: 'Rachid Taouama',

  // ── AI API Keys ───────────────────────────────────────────────────────────
  VITE_OPENROUTER_API_KEY: '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',
};
