import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { registerRepositoryIpc } from './ipc/repository';
import { registerFilesystemIpc } from './ipc/filesystem';
import { registerOauthIpc, setOauthWindow } from './ipc/oauth';

const isDev = !app.isPackaged;
const DEV_SERVER_URL = 'http://localhost:5173';

registerRepositoryIpc();
registerFilesystemIpc();
registerOauthIpc();

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#08090A',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  setOauthWindow(win);
  win.once('ready-to-show', () => win.show());

  if (isDev) {
    void win.loadURL(DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'right' });
    win.webContents.on('did-finish-load', () => {
      void win.webContents
        .executeJavaScript(
          `({ title: document.title, heading: document.querySelector('h1')?.textContent ?? '' })`
        )
        .then((info) => console.log('[repo-electron] renderer ready:', JSON.stringify(info)))
        .catch((err) => console.error('[repo-electron] renderer probe failed:', String(err)));
    });
  } else {
    void win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  console.log(`[repo-electron] starting (packaged=${app.isPackaged})`);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
