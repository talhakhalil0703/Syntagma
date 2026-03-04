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
}

import { ElectronFileSystem } from "./ElectronFileSystem";
import { MockFileSystem } from "./MockFileSystem";

// Simple wrapper around Electron's ipcRenderer to safely check if we are in Electron
const isElectron = () => {
    return typeof window !== 'undefined' && (window as any).require && (window as any).require('electron');
};

export const FileSystemAPI: FileSystemProvider = isElectron() ? new ElectronFileSystem() : new MockFileSystem();
