import type { DirEntry, FileStat, SearchResult, FileSystemProvider } from "./fs";

// Simple wrapper around Electron's ipcRenderer to safely speak to the Node backend
const getIpcRenderer = () => {
    return typeof window !== 'undefined' && (window as any).require ? (window as any).require('electron').ipcRenderer : null;
};

export class ElectronFileSystem implements FileSystemProvider {
    async writeFile(filePath: string, content: string): Promise<boolean> {
        try {
            const ipc = getIpcRenderer();
            if (!ipc) return false;
            const res = await ipc.invoke('fs:writeFile', { filePath, content });
            return res.success;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    async readFile(filePath: string): Promise<string | null> {
        try {
            const ipc = getIpcRenderer();
            if (!ipc) return null;
            const res = await ipc.invoke('fs:readFile', { filePath });
            if (res.success) {
                return res.content;
            }
            return null;
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    async readImageBase64(filePath: string): Promise<string | null> {
        try {
            const ipc = getIpcRenderer();
            if (!ipc) return null;
            const res = await ipc.invoke('fs:readImageBase64', { filePath });
            if (res.success) {
                return res.dataUrl;
            }
            return null;
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    async getVaultPath(): Promise<string> {
        const ipc = getIpcRenderer();
        if (!ipc) return "";
        return await ipc.invoke('fs:getVaultPath');
    }

    async selectVaultDirectory(): Promise<string | null> {
        try {
            const ipc = getIpcRenderer();
            if (!ipc) return null;
            const res = await ipc.invoke('fs:selectVault');
            if (res.success) {
                return res.path;
            }
            return null;
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    async readDir(dirPath: string): Promise<DirEntry[]> {
        try {
            const ipc = getIpcRenderer();
            if (!ipc) return [];
            const res = await ipc.invoke('fs:readDir', { dirPath });
            if (res.success) {
                return res.items;
            }
            return [];
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    async readDirRecursive(dirPath: string): Promise<DirEntry[]> {
        try {
            const ipc = getIpcRenderer();
            if (!ipc) return [];
            const res = await ipc.invoke('fs:readDirRecursive', { dirPath });
            if (res.success) {
                return res.items;
            }
            return [];
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    async searchVault(vaultPath: string, query: string): Promise<SearchResult[]> {
        try {
            const ipc = getIpcRenderer();
            if (!ipc) return [];
            const res = await ipc.invoke('fs:searchVault', { vaultPath, query });
            if (res.success) {
                return res.results;
            }
            return [];
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    async executeGitCommand(vaultPath: string, command: string): Promise<{ success: boolean; stdout?: string; stderr?: string; error?: string }> {
        try {
            const ipc = getIpcRenderer();
            if (!ipc) return { success: false, error: "IPC not configured" };
            return await ipc.invoke('fs:executeGitCommand', { vaultPath, command });
        } catch (e: any) {
            console.error(e);
            return { success: false, error: e.message };
        }
    }

    async stat(targetPath: string): Promise<FileStat | null> {
        try {
            const ipc = getIpcRenderer();
            if (!ipc) return null;
            const res = await ipc.invoke('fs:stat', { targetPath });
            if (res.success) {
                return { isDirectory: res.isDirectory, size: res.size, mtimeMs: res.mtimeMs };
            }
            return null;
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    async mkdir(dirPath: string): Promise<boolean> {
        try {
            const ipc = getIpcRenderer();
            if (!ipc) return false;
            const res = await ipc.invoke('fs:mkdir', { dirPath });
            return res.success;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    async copyFile(source: string, destination: string): Promise<boolean> {
        try {
            const ipc = getIpcRenderer();
            if (!ipc) return false;
            const res = await ipc.invoke('fs:copyFile', { source, destination });
            return res.success;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    async printToPDF(htmlContent: string, filePath: string): Promise<boolean> {
        try {
            const ipc = getIpcRenderer();
            if (!ipc) return false;
            const res = await ipc.invoke('fs:printToPDF', { htmlContent, filePath });
            return res.success;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    async showSaveDialog(options: { title?: string, defaultPath?: string, filters?: { name: string, extensions: string[] }[] }): Promise<{ canceled: boolean; filePath?: string }> {
        try {
            const ipc = getIpcRenderer();
            if (!ipc) return { canceled: true };
            const res = await ipc.invoke('fs:showSaveDialog', options);
            if (res.success && res.filePath) {
                return { canceled: false, filePath: res.filePath };
            }
            return { canceled: !!res.canceled };
        } catch (e) {
            console.error(e);
            return { canceled: true };
        }
    }

    async deleteFile(filePath: string): Promise<boolean> {
        try {
            const ipc = getIpcRenderer();
            if (!ipc) return false;
            const res = await ipc.invoke('fs:deleteFile', { filePath });
            return res.success;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    async renameFile(oldPath: string, newPath: string): Promise<boolean> {
        try {
            const ipc = getIpcRenderer();
            if (!ipc) return false;
            const res = await ipc.invoke('fs:renameFile', { oldPath, newPath });
            return res.success;
        } catch (e) {
            console.error(e);
            return false;
        }
    }
}
