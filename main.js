'use strict';
const electron = require('electron');

const ipc = electron.ipcMain;

const app = electron.app;

// adds debug features like hotkeys for triggering dev tools and reload
require('electron-debug')();

// prevent window being garbage collected
let mainWindow;

function onClosed() {
  // dereference the window
  // for multiple windows store them in an array
  mainWindow = null;
}

ipc.on('open', (evt, options) => {
  electron.dialog.showOpenDialog(mainWindow, options, files => {
    evt.sender.send('open', files);
  });
});

function createMainWindow() {
  const win = new electron.BrowserWindow({
    width: 800,
    height: 600
  });

  win.loadURL(`file://${__dirname}/index.html`);
  win.on('closed', onClosed);

  return win;
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (!mainWindow) {
    mainWindow = createMainWindow();
  }
});

app.on('ready', () => {
  mainWindow = createMainWindow();
});
