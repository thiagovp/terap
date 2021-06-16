const electron  = require('electron');
const ChronoTray = require('./app/chronotray');
const ws = require('windows-shortcuts');
const {app, BrowserWindow, ipcMain, autoUpdater,dialog, crashReporter } = electron;

const isDev = require('electron-is-dev');
const server = 'http://download.localhost:4000';

const feed = `${server}/update/${process.platform}/${app.getVersion()}`;

let tray = null;
let mainWindow;

// handling squirrel events
if (require('electron-squirrel-startup')) return;
// this should be placed at top of main.js to handle setup events quickly
if (handleSquirrelEvent()) {
 // squirrel event handled and app will exit in 1000ms, so don't doanything else
 return;
}
function handleSquirrelEvent() {
 if (process.argv.length === 1) {
 return false;
 }
 const ChildProcess = require('child_process');
 const path = require('path');
 const appFolder = path.resolve(process.execPath, '..');
 const rootAtomFolder = path.resolve(appFolder, '..');
 const updateDotExe = path.resolve(path.join(rootAtomFolder,
'Update.exe'));
 const exeName = path.basename(process.execPath);
 const spawn = function(command, args) {
 let spawnedProcess, error;
 try {
 spawnedProcess = ChildProcess.spawn(command, args, {detached:
true});
 } catch (error) {}
 return spawnedProcess;
 };
 const spawnUpdate = function(args) {
 return spawn(updateDotExe, args);
 };
 const squirrelEvent = process.argv[1];
 switch (squirrelEvent) {
 case '--squirrel-install':
 case '--squirrel-updated':
 // Optionally do things such as:
 // - Add your .exe to the PATH
 // - Write to the registry for things like file associations and
 // explorer context menus
 // Install desktop and start menu shortcuts
 spawnUpdate(['--createShortcut', exeName]);
 setTimeout(app.quit, 1000);
 return true;
 case '--squirrel-uninstall':
 // Undo anything you did in the --squirrel-install and
 // --squirrel-updated handlers
 // Remove desktop and start menu shortcuts
 spawnUpdate(['--removeShortcut', exeName]);
 setTimeout(app.quit, 1000);
 return true;
 case '--squirrel-obsolete':
 // This is called on the outgoing version of your app before
 // we update to the new version - it's the opposite of
 // --squirrel-updated
 app.quit();
 return true;
 }
};

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        height: 160,
        width: 351,
        frame: false,
        resizable: false,
        show: false,
        skipTaskbar: true
    });
    tray = new ChronoTray(`${__dirname}/robot.ico`, mainWindow);
    mainWindow.loadURL(`file://${__dirname}/index.html`);
    mainWindow.on('blur',() => {
        setTimeout(()=> mainWindow.hide(), 200);
    });
    if(process.env.NODE_ENV !== 'production' && process.platform === 'win32') {
        ws.create("%APPDATA%/Microsoft/Windows/Start Menu/Programs/Electron.lnk", process.execPath);
        app.setAppUserModelId(process.execPath);
    }
    if(isDev === false){
        autoUpdater.setFeedURL(feed);
        setInterval(() => {
            autoUpdater.checkForUpdates();
        }, 60000)
    }
   /* crashReporter.start({
        productName: "cronometro",
        companyName: "thiago-veloso",
        submitURL: "",
        uploadToServer: true
    });

    setTimeout(()=>{
        process.crash();
    }, 30000);*/


});

ipcMain.on('timeUpdate',(event, timeUpdate) => {
    if(process.platform === 'darwin') {
        tray.setTitle(timeUpdate);
    }else {
        tray.setToolTip(timeUpdate);
    }
});

autoUpdater.on('update-downloaded', (event, releaseNotes,releaseName) => {
    const dialogOpts = {
        type: 'info',
        buttons: ['Reiniciar', 'Mais tarde'],
        title: 'Atualização da Aplicação',
        message: process.platform === 'win32' ? releaseNotes : releaseName,
        detail: 'Uma nova versão foi recebida. Reinicie a aplicação para aplicar a atualização.'
    }

    dialog.showMessageBox(dialogOpts, (response) => {
        if(response === 0) autoUpdater.quitAndInstall();
    });
});

autoUpdater.on('error', message => {
    console.error('Houve um problema ao atualizar a aplicação');
    console.error(message);
})