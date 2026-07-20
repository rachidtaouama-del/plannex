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
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (_event, status) => callback(status));
    return () => ipcRenderer.removeAllListeners('update-status');
  },

  // App control
  quitApp: () => ipcRenderer.invoke('quit-app'),
  restartApp: () => { ipcRenderer.invoke('quit-app'); }, // will be overridden below

  // License system
  getMachineId: () => ipcRenderer.invoke('get-machine-id'),
  loadLicenseFile: () => ipcRenderer.invoke('load-license-file'),
  saveLicenseFile: (content, filename) => ipcRenderer.invoke('save-license-file', { content, filename }),

  // User profile (AppData — survives app updates)
  profileRead:   ()     => ipcRenderer.invoke('profile-read'),
  profileWrite:  (data) => ipcRenderer.invoke('profile-write', data),
  profileDelete: ()     => ipcRenderer.invoke('profile-delete'),

  // Power Events for security
  onPowerEvent: (callback) => {
    ipcRenderer.on('power-event', (_event, status) => callback(status));
    return () => ipcRenderer.removeAllListeners('power-event');
  },
});


