const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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

// Recursive Read directory utility (for Quick Open / searching)
ipcMain.handle('fs:readDirRecursive', async (event, { dirPath }) => {
    try {
        if (!fs.existsSync(dirPath)) {
            return { success: false, error: "Directory not found" };
        }

        const results = [];

        async function walk(currentPath) {
            const dirents = await fsPromises.readdir(currentPath, { withFileTypes: true });
            for (const dirent of dirents) {
                // Skip hidden files/directories like .git or .syntagma
                if (dirent.name.startsWith('.')) continue;

                const fullPath = path.join(currentPath, dirent.name);
                if (dirent.isDirectory()) {
                    await walk(fullPath);
                } else {
                    results.push({
                        name: dirent.name,
                        isDirectory: false,
                        path: fullPath
                    });
                }
            }
        }

        await walk(dirPath);
        return { success: true, items: results };
    } catch (error) {
        console.error("Failed to read directory recursively:", error);
        return { success: false, error: error.message };
    }
});

// Vault Full Text Search
ipcMain.handle('fs:searchVault', async (event, { vaultPath, query }) => {
    try {
        if (!fs.existsSync(vaultPath)) {
            return { success: false, error: "Vault not found" };
        }

        if (!query || query.trim() === '') {
            return { success: true, results: [] };
        }

        const results = [];
        const lowerQuery = query.toLowerCase();

        async function searchWalk(currentPath) {
            const dirents = await fsPromises.readdir(currentPath, { withFileTypes: true });
            for (const dirent of dirents) {
                // Skip hidden files/directories like .git or .syntagma
                if (dirent.name.startsWith('.')) continue;

                const fullPath = path.join(currentPath, dirent.name);
                if (dirent.isDirectory()) {
                    await searchWalk(fullPath);
                } else if (dirent.name.endsWith('.md')) {
                    // Read file content
                    try {
                        const content = await fsPromises.readFile(fullPath, 'utf8');
                        const lines = content.split(/\r?\n/);
                        const fileMatches = [];

                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i];
                            const idx = line.toLowerCase().indexOf(lowerQuery);
                            if (idx !== -1) {
                                // Found a match, capture context
                                // Grab up to 40 chars before and 60 after the match
                                const start = Math.max(0, idx - 40);
                                const end = Math.min(line.length, idx + query.length + 60);
                                let excerpt = line.substring(start, end);

                                if (start > 0) excerpt = "..." + excerpt;
                                if (end < line.length) excerpt = excerpt + "...";

                                fileMatches.push({
                                    lineNumber: i + 1,
                                    excerpt
                                });
                            }
                        }

                        if (fileMatches.length > 0) {
                            results.push({
                                filePath: fullPath,
                                fileName: dirent.name,
                                matches: fileMatches
                            });
                        }
                    } catch (e) {
                        console.error(`Error reading file during search: ${fullPath}`, e);
                    }
                }
            }
        }

        await searchWalk(vaultPath);
        return { success: true, results };
    } catch (error) {
        console.error("Failed to search vault:", error);
        return { success: false, error: error.message };
    }
});

// Git Command Execution Utility
ipcMain.handle('fs:executeGitCommand', async (event, { vaultPath, command }) => {
    try {
        if (!fs.existsSync(vaultPath)) {
            return { success: false, error: "Vault not found" };
        }

        // Execute the command in the context of the vault directory
        const { stdout, stderr } = await execPromise(`git ${command}`, { cwd: vaultPath });
        return { success: true, stdout, stderr };

    } catch (error) {
        console.error(`Failed to execute git command (${command}):`, error.message);
        // git commands often exit with 1 on errors, which child_process throws.
        // We still want to return the stdout/stderr so the frontend can parse the git error message
        return {
            success: false,
            error: error.message,
            stdout: error.stdout,
            stderr: error.stderr
        };
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
