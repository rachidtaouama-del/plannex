/**
 * electron/main.js
 * Plannex Desktop — Electron Main Process
 * Author: Rachid Taouama
 */

const { app, BrowserWindow, shell, ipcMain, dialog, Menu } = require('electron');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');

const path = require('path');
const config = require('./config');
const { readProfile, writeProfile, deleteProfile } = require('./userStore');

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
    autoHideMenuBar: true,        // Hide File/Edit/View menu bar
  });

  // Remove the default application menu entirely
  Menu.setApplicationMenu(null);
  mainWindow.maximize();          // Start maximized (full screen)


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

// Quit the app from renderer (called when user clicks Exit on login screen)
ipcMain.handle('quit-app', () => app.quit());

// ── User Profile (AppData) ─────────────────────────────────────────────────────
ipcMain.handle('profile-read',   () => readProfile());
ipcMain.handle('profile-write',  (_, data) => writeProfile(data));
ipcMain.handle('profile-delete', () => deleteProfile());

// Generate a unique Machine ID from hardware info
ipcMain.handle('get-machine-id', () => {
  const cpus = os.cpus();
  const raw = [
    os.hostname(),
    cpus.length > 0 ? cpus[0].model : 'unknown',
    os.platform(),
    os.arch(),
  ].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16).toUpperCase();
});

// Open a file dialog to load a .plxlicense file
ipcMain.handle('load-license-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Load PlanneX License File',
    filters: [{ name: 'PlanneX License', extensions: ['plxlicense'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  try {
    return fs.readFileSync(result.filePaths[0], 'utf8').trim();
  } catch { return null; }
});

// Save a generated license file to disk
ipcMain.handle('save-license-file', async (event, { content, filename }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save License File',
    defaultPath: filename || 'license.plxlicense',
    filters: [{ name: 'PlanneX License', extensions: ['plxlicense'] }],
  });
  if (result.canceled || !result.filePath) return false;
  try {
    fs.writeFileSync(result.filePath, content, 'utf8');
    return true;
  } catch { return false; }
});

// Manual update check triggered by the user clicking "Check for Updates" in the app
ipcMain.handle('check-for-update', async () => {
  if (!mainWindow || isDev) {
    mainWindow?.webContents.send('update-status', { type: 'not-available' });
    return;
  }
  const { autoUpdater } = require('electron-updater');
  mainWindow.webContents.send('update-status', { type: 'checking' });
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    mainWindow.webContents.send('update-status', { type: 'error', message: err?.message || 'Update check failed' });
  }
});

// Install update triggered by the user clicking the Ready button
ipcMain.handle('install-update', () => {
  const { autoUpdater } = require('electron-updater');
  // Arg 1: isSilent=true (don't show UI), Arg 2: isForceRunAfter=true (restart app)
  autoUpdater.quitAndInstall(true, true);
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
