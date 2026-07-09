/**
 * electron/main.js
 * Plannex Desktop — Electron Main Process
 * Author: Rachid Taouama
 */

const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const config = require('./config');

// ─── Inject API keys before renderer loads ────────────────────────────────────
Object.entries(config).forEach(([key, value]) => {
  process.env[key] = value;
});

// ─── Keep a global reference to prevent garbage collection ────────────────────
let mainWindow = null;
const isDev = process.env.NODE_ENV === 'development';

// ─── Create the main application window ──────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: 'Plannex',
    icon: path.join(__dirname, '../assets/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    show: false, // Hidden until ready-to-show to avoid flash
    backgroundColor: '#0f1729',
  });

  // ── Load the app ────────────────────────────────────────────────────────────
  if (isDev) {
    // Dev mode: load from Vite dev server
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load built files
    mainWindow.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
  }

  // ── Show window once fully loaded (no white flash) ──────────────────────────
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // ── Open external links in browser, not in the app ──────────────────────────
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('get-config', (event, key) => {
  // Only expose safe, non-sensitive config values to renderer
  const safeKeys = ['APP_NAME', 'APP_VERSION'];
  if (safeKeys.includes(key)) return config[key];
  return null;
});

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();

  // Set up auto-updater after window is ready
  if (!isDev) {
    const { setupUpdater } = require('./updater');
    setupUpdater(mainWindow);
  }

  app.on('activate', () => {
    // macOS: re-create window when clicking dock icon
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
