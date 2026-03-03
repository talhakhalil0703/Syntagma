const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        titleBarStyle: 'hiddenInset', // Makes it look native on Mac
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false // Simplifies plugin access to the FS for this prototype
        }
    });

    // Load from Vite dev server if running locally, else load build
    const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../dist/index.html')}`;
    mainWindow.loadURL(startUrl);

    if (process.env.ELECTRON_START_URL) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.env.OS !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// IPC Communication for File System operations

// Write file utility (often used for vault settings, tabs)
ipcMain.handle('fs:writeFile', async (event, { filePath, content }) => {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            await fsPromises.mkdir(dir, { recursive: true });
        }
        await fsPromises.writeFile(filePath, content, 'utf-8');
        return { success: true };
    } catch (error) {
        console.error("Failed to write file:", error);
        return { success: false, error: error.message };
    }
});

// Read file utility
ipcMain.handle('fs:readFile', async (event, { filePath }) => {
    try {
        if (!fs.existsSync(filePath)) {
            return { success: false, error: "File not found" };
        }
        const content = await fsPromises.readFile(filePath, 'utf-8');
        return { success: true, content };
    } catch (error) {
        console.error("Failed to read file:", error);
        return { success: false, error: error.message };
    }
});

// Read directory utility
ipcMain.handle('fs:readDir', async (event, { dirPath }) => {
    try {
        if (!fs.existsSync(dirPath)) {
            return { success: false, error: "Directory not found" };
        }
        const dirents = await fsPromises.readdir(dirPath, { withFileTypes: true });
        const items = dirents.map(dirent => ({
            name: dirent.name,
            isDirectory: dirent.isDirectory(),
            path: path.join(dirPath, dirent.name)
        }));
        return { success: true, items };
    } catch (error) {
        console.error("Failed to read directory:", error);
        return { success: false, error: error.message };
    }
});

// Stat utility
ipcMain.handle('fs:stat', async (event, { targetPath }) => {
    try {
        const stats = await fsPromises.stat(targetPath);
        return { success: true, isDirectory: stats.isDirectory(), size: stats.size, mtimeMs: stats.mtimeMs };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Mkdir utility
ipcMain.handle('fs:mkdir', async (event, { dirPath }) => {
    try {
        await fsPromises.mkdir(dirPath, { recursive: true });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Helper to get Vault Path (currently mocks the user documents folder)
ipcMain.handle('fs:getVaultPath', () => {
    // For local prototype testing we will just use a folder in Documents
    return path.join(app.getPath('documents'), 'SyntagmaVault');
});

// Select Vault Directory using Native OS Dialog
ipcMain.handle('fs:selectVault', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory', 'createDirectory'],
            buttonLabel: 'Select Vault',
            title: 'Select a folder to use as your Syntagma Vault'
        });

        if (result.canceled || result.filePaths.length === 0) {
            return { success: false, path: null };
        }

        return { success: true, path: result.filePaths[0] };
    } catch (error) {
        console.error("Failed to open directory dialog:", error);
        return { success: false, error: error.message };
    }
});
