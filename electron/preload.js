/**
 * electron/preload.js
 * Plannex Desktop — Secure Context Bridge
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  platform: process.platform,
  isElectron: true,

  // Safe config access
  getConfig: (key) => ipcRenderer.invoke('get-config', key),

  // Auto-updater
  checkForUpdate: () => ipcRenderer.invoke('check-for-update'),
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (_event, status) => callback(status));
    // Return cleanup function
    return () => ipcRenderer.removeAllListeners('update-status');
  },
});

