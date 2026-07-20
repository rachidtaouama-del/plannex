/**
 * electron/userStore.js
 * Manages reading/writing user profile data to AppData (persists across updates).
 */

const path = require('path');
const fs = require('fs');
const { app } = require('electron');

function getProfilePath() {
  const dir = path.join(app.getPath('userData'), 'plannex_data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'user_profile.json');
}

function readProfile() {
  try {
    const p = getProfilePath();
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch { return null; }
}

function writeProfile(data) {
  try {
    fs.writeFileSync(getProfilePath(), JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch { return false; }
}

function deleteProfile() {
  try {
    const p = getProfilePath();
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return true;
  } catch { return false; }
}

module.exports = { readProfile, writeProfile, deleteProfile };
