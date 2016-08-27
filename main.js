'use strict';
const electron = require('electron');
const windowState = require('electron-window-state');

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
  const winState = windowState({
    defaultWidth: 800,
    defaultHeight: 600
  });

  const win = new electron.BrowserWindow({
    x: winState.x,
    y: winState.y,
    width: winState.width,
    height: winState.height
  });

  winState.manage(win);

  win.loadURL(`file://${__dirname}/app/index.html`);
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
