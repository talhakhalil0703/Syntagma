// Simple wrapper around Electron's ipcRenderer to safely speak to the Node backend
const getIpcRenderer = () => {
    return typeof window !== 'undefined' && (window as any).require ? (window as any).require('electron').ipcRenderer : null;
};

export interface FileStat {
    isDirectory: boolean;
    size: number;
    mtimeMs: number;
}

export interface DirEntry {
    name: string;
    isDirectory: boolean;
    path: string;
}

export const FileSystemAPI = {
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
    },

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
    },

    async getVaultPath(): Promise<string> {
        const ipc = getIpcRenderer();
        if (!ipc) return "";
        return await ipc.invoke('fs:getVaultPath');
    },

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
    },

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
    },

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
    },

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
};
