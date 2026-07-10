/**
 * electron/updater.js
 * Plannex Desktop — Auto-Update Manager
 *
 * Uses electron-updater to check GitHub Releases for new versions.
 * On startup: silently checks for updates.
 * When a new version is downloaded: prompts user to restart.
 */

const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');
const log = require('electron-log');

// ─── Configure logging ────────────────────────────────────────────────────────
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// ─── Update settings ──────────────────────────────────────────────────────────
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// ─── Setup function called from main.js ──────────────────────────────────────
function setupUpdater(mainWindow) {
  const send = (payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', payload);
    }
  };

  // Check for updates 3 seconds after launch
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err => {
      log.warn('Update check failed:', err?.message);
    });
  }, 3000);

  autoUpdater.on('checking-for-update', () => {
    log.info('Plannex: Checking for updates...');
    send({ type: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    log.info(`Plannex: Update available — v${info.version}`);
    send({ type: 'available', version: info.version });
  });

  autoUpdater.on('update-not-available', () => {
    log.info('Plannex: App is up to date.');
    send({ type: 'not-available' });
  });

  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent);
    log.info(`Downloading update: ${percent}%`);
    if (mainWindow) mainWindow.setTitle(`Plannex — Downloading update ${percent}%`);
    send({ type: 'downloading', percent });
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) mainWindow.setTitle('Plannex');
    log.info(`Plannex: Update v${info.version} downloaded.`);
    send({ type: 'downloaded', version: info.version });

    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Plannex Update Ready',
      message: `Version ${info.version} is ready to install.`,
      detail: 'The update has been downloaded. Restart Plannex to apply the latest improvements.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall(false, true);
    });
  });

  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error:', err?.message);
    send({ type: 'error', message: err?.message || 'Update failed' });
    if (mainWindow) mainWindow.setTitle('Plannex');
  });
}

module.exports = { setupUpdater };

