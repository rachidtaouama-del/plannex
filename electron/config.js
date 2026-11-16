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
