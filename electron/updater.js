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
autoUpdater.autoDownload = true;         // Download in background automatically
autoUpdater.autoInstallOnAppQuit = true; // Install when user quits normally

// ─── Setup function called from main.js ──────────────────────────────────────
function setupUpdater(mainWindow) {
  // Check for updates 3 seconds after launch (give UI time to load first)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err => {
      log.warn('Update check failed:', err?.message);
    });
  }, 3000);

  // ── Event Handlers ──────────────────────────────────────────────────────────
  autoUpdater.on('checking-for-update', () => {
    log.info('Plannex: Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    log.info(`Plannex: Update available — v${info.version}`);
    // No popup here — downloading silently in background
  });

  autoUpdater.on('update-not-available', () => {
    log.info('Plannex: App is up to date.');
  });

  autoUpdater.on('download-progress', (progress) => {
    const msg = `Downloading update: ${Math.round(progress.percent)}%`;
    log.info(msg);
    // Optionally update the window title to show progress
    if (mainWindow) {
      mainWindow.setTitle(`Plannex — ${msg}`);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    // Reset window title
    if (mainWindow) {
      mainWindow.setTitle('Plannex');
    }

    log.info(`Plannex: Update v${info.version} downloaded. Prompting user...`);

    // Show restart dialog
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Plannex Update Ready',
      message: `Version ${info.version} is ready to install.`,
      detail: 'The update has been downloaded. Restart Plannex to apply the latest features and improvements.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      icon: null,
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });

  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error:', err?.message);
  });
}

module.exports = { setupUpdater };
