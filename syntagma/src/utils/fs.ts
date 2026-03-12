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

export interface SearchMatch {
    lineNumber: number;
    excerpt: string;
}

export interface SearchResult {
    filePath: string;
    fileName: string;
    matches: SearchMatch[];
}

export interface FileSystemProvider {
    writeFile(filePath: string, content: string): Promise<boolean>;
    readFile(filePath: string): Promise<string | null>;
    readImageBase64(filePath: string): Promise<string | null>;
    getVaultPath(): Promise<string>;
    selectVaultDirectory(): Promise<string | null>;
    readDir(dirPath: string): Promise<DirEntry[]>;
    readDirRecursive(dirPath: string): Promise<DirEntry[]>;
    searchVault(vaultPath: string, query: string): Promise<SearchResult[]>;
    executeGitCommand(vaultPath: string, command: string): Promise<{ success: boolean; stdout?: string; stderr?: string; error?: string }>;
    stat(targetPath: string): Promise<FileStat | null>;
    mkdir(dirPath: string): Promise<boolean>;
    copyFile(source: string, destination: string): Promise<boolean>;
    printToPDF(htmlContent: string, filePath: string): Promise<boolean>;
    showSaveDialog(options: { title?: string, defaultPath?: string, filters?: { name: string, extensions: string[] }[] }): Promise<{ canceled: boolean; filePath?: string }>;
    deleteFile(filePath: string): Promise<boolean>;
    renameFile(oldPath: string, newPath: string): Promise<boolean>;
}

import { ElectronFileSystem } from "./ElectronFileSystem";
import { MockFileSystem } from "./MockFileSystem";

// Simple wrapper around Electron's ipcRenderer to safely check if we are in Electron
const isElectron = () => {
    return typeof window !== 'undefined' && (window as any).require && (window as any).require('electron');
};

class FileSystemEventTracker implements FileSystemProvider {
    private _inner: FileSystemProvider | null = null;

    private get inner(): FileSystemProvider {
        if (!this._inner) {
            this._inner = isElectron() ? new ElectronFileSystem() : new MockFileSystem();
        }
        // In test environments, we might want to re-evaluate if mocks were applied after first access
        if (import.meta.env.MODE === 'test') {
             return isElectron() ? new ElectronFileSystem() : new MockFileSystem();
        }
        return this._inner;
    }

    private emit() {
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('filesystem-changed'));
    }

    async writeFile(filePath: string, content: string): Promise<boolean> {
        const res = await this.inner.writeFile(filePath, content);
        if (res) this.emit();
        return res;
    }

    async mkdir(dirPath: string): Promise<boolean> {
        const res = await this.inner.mkdir(dirPath);
        if (res) this.emit();
        return res;
    }

    async copyFile(source: string, destination: string): Promise<boolean> {
        const res = await this.inner.copyFile(source, destination);
        if (res) this.emit();
        return res;
    }

    async deleteFile(filePath: string): Promise<boolean> {
        const res = await this.inner.deleteFile(filePath);
        if (res) this.emit();
        return res;
    }

    async renameFile(oldPath: string, newPath: string): Promise<boolean> {
        const res = await this.inner.renameFile(oldPath, newPath);
        if (res) this.emit();
        return res;
    }

    // Pass through methods
    readFile(filePath: string) { return this.inner.readFile(filePath); }
    readImageBase64(filePath: string) { return this.inner.readImageBase64(filePath); }
    getVaultPath() { return this.inner.getVaultPath(); }
    selectVaultDirectory() { return this.inner.selectVaultDirectory(); }
    readDir(dirPath: string) { return this.inner.readDir(dirPath); }
    readDirRecursive(dirPath: string) { return this.inner.readDirRecursive(dirPath); }
    searchVault(vaultPath: string, query: string) { return this.inner.searchVault(vaultPath, query); }
    executeGitCommand(v: string, c: string) { return this.inner.executeGitCommand(v, c); }
    stat(targetPath: string) { return this.inner.stat(targetPath); }
    printToPDF(html: string, path: string) { return this.inner.printToPDF(html, path); }
    showSaveDialog(opts: any) { return this.inner.showSaveDialog(opts); }
}

export const FileSystemAPI: FileSystemProvider = new FileSystemEventTracker();
