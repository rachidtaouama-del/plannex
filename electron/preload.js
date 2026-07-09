/**
 * electron/preload.js
 * Plannex Desktop — Secure Context Bridge
 *
 * This script runs in the renderer process but has access to Node.js APIs.
 * It safely exposes only what the renderer needs via contextBridge.
 * This is Electron's security best practice (Context Isolation).
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  platform: process.platform,
  isElectron: true,

  // Safe config access
  getConfig: (key) => ipcRenderer.invoke('get-config', key),
});
