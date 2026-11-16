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
  VITE_OPENROUTER_API_KEY: process.env.VITE_OPENROUTER_API_KEY || '',
};
