import type { DirEntry, FileStat, SearchResult } from "./fs";

export class MockFileSystem {
    private files: Map<string, string> = new Map();
    private dirs: Set<string> = new Set(['/mock-vault', '/mock-vault/.syntagma']);

    constructor() {
        let loaded = false;
        if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
            const savedFiles = localStorage.getItem('syntagma-mock-fs-files');
            const savedDirs = localStorage.getItem('syntagma-mock-fs-dirs');

            if (savedFiles) {
                try {
                    this.files = new Map(JSON.parse(savedFiles));
                    loaded = true;
                } catch (e) { }
            }
            if (savedDirs) {
                try {
                    this.dirs = new Set(JSON.parse(savedDirs));
                } catch (e) { }
            }
        }

        if (!loaded) {
            this.files.set('/mock-vault/Welcome.md', '# Welcome to the Mock Vault!\n\nThis is an isolated testing environment running completely in your browser.');
            this.files.set('/mock-vault/drawing.excalidraw', '{\n  "type": "excalidraw",\n  "version": 2,\n  "source": "https://excalidraw.com",\n  "elements": [\n    {\n      "id": "mock-rect",\n      "type": "rectangle",\n      "x": 100,\n      "y": 100,\n      "width": 200,\n      "height": 100,\n      "angle": 0,\n      "strokeColor": "#1e1e1e",\n      "backgroundColor": "transparent",\n      "fillStyle": "hachure",\n      "strokeWidth": 1,\n      "strokeStyle": "solid",\n      "roughness": 1,\n      "opacity": 100,\n      "groupIds": [],\n      "frameId": null,\n      "roundness": { "type": 3 },\n      "seed": 1,\n      "version": 1,\n      "versionNonce": 1,\n      "isDeleted": false,\n      "boundElements": null,\n      "updated": 1,\n      "link": null,\n      "locked": false\n    }\n  ],\n  "appState": {\n    "viewBackgroundColor": "#ffffff"\n  },\n  "files": {}\n}');
            this.save();
        }
    }

    private save() {
        if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
            localStorage.setItem('syntagma-mock-fs-files', JSON.stringify(Array.from(this.files.entries())));
            localStorage.setItem('syntagma-mock-fs-dirs', JSON.stringify(Array.from(this.dirs)));
        }
    }

    async writeFile(filePath: string, content: string): Promise<boolean> {
        this.files.set(filePath, content);
        const parts = filePath.split('/');
        let currentString = '';
        for (let i = 1; i < parts.length - 1; i++) {
            currentString += '/' + parts[i];
            this.dirs.add(currentString);
        }
        this.save();
        return true;
    }

    async readFile(filePath: string): Promise<string | null> {
        return this.files.get(filePath) ?? null;
    }

    async readDir(dirPath: string): Promise<DirEntry[]> {
        const entries: DirEntry[] = [];
        const seen = new Set<string>();

        for (const [path] of this.files.entries()) {
            if (path.startsWith(dirPath + '/') && path !== dirPath) {
                const remainder = path.slice(dirPath.length + 1);
                const parts = remainder.split('/');
                const name = parts[0];
                if (!seen.has(name)) {
                    seen.add(name);
                    entries.push({ name, isDirectory: parts.length > 1, path: `${dirPath}/${name}` });
                }
            }
        }
        for (const path of this.dirs) {
            if (path.startsWith(dirPath + '/') && path !== dirPath) {
                const remainder = path.slice(dirPath.length + 1);
                const parts = remainder.split('/');
                if (parts.length === 1) {
                    const name = parts[0];
                    if (!seen.has(name)) {
                        seen.add(name);
                        entries.push({ name, isDirectory: true, path: `${dirPath}/${name}` });
                    }
                }
            }
        }
        return entries;
    }

    async mkdir(dirPath: string): Promise<boolean> {
        this.dirs.add(dirPath);
        this.save();
        return true;
    }

    async stat(targetPath: string): Promise<FileStat | null> {
        if (this.dirs.has(targetPath)) return { isDirectory: true, size: 0, mtimeMs: Date.now() };
        if (this.files.has(targetPath)) return { isDirectory: false, size: this.files.get(targetPath)!.length, mtimeMs: Date.now() };
        return null;
    }

    async deleteFile(filePath: string): Promise<boolean> {
        let deleted = false;
        // Delete exact file match
        if (this.files.delete(filePath)) deleted = true;
        // Delete all files under this path (directory delete)
        for (const key of Array.from(this.files.keys())) {
            if (key.startsWith(filePath + '/')) {
                this.files.delete(key);
                deleted = true;
            }
        }
        // Delete the directory itself and subdirectories
        for (const dir of Array.from(this.dirs)) {
            if (dir === filePath || dir.startsWith(filePath + '/')) {
                this.dirs.delete(dir);
                deleted = true;
            }
        }
        if (deleted) this.save();
        return deleted;
    }

    async getVaultPath(): Promise<string> {
        return '/mock-vault';
    }

    async selectVaultDirectory(): Promise<string | null> {
        return '/mock-vault';
    }

    async readImageBase64(_filePath: string): Promise<string | null> {
        return null;
    }

    async readDirRecursive(dirPath: string): Promise<DirEntry[]> {
        return this.readDir(dirPath);
    }

    async searchVault(_vaultPath: string, _query: string): Promise<SearchResult[]> {
        return [];
    }

    async executeGitCommand(_vaultPath: string, _command: string): Promise<{ success: boolean; stdout?: string; stderr?: string; error?: string }> {
        return { success: false, error: "Git not supported in mock vault" };
    }

    async copyFile(source: string, destination: string): Promise<boolean> {
        // Check if source is a directory
        if (this.dirs.has(source)) {
            // Recursive directory copy
            this.dirs.add(destination);
            for (const dir of Array.from(this.dirs)) {
                if (dir.startsWith(source + '/')) {
                    const newDir = destination + dir.slice(source.length);
                    this.dirs.add(newDir);
                }
            }
            for (const [path, content] of Array.from(this.files.entries())) {
                if (path.startsWith(source + '/')) {
                    const newPath = destination + path.slice(source.length);
                    this.files.set(newPath, content);
                }
            }
            this.save();
            return true;
        }
        // Single file copy
        const content = await this.readFile(source);
        if (content !== null) {
            return this.writeFile(destination, content);
        }
        return false;
    }

    async printToPDF(_htmlContent: string, _filePath: string): Promise<boolean> {
        return false;
    }

    async showSaveDialog(_options: { title?: string, defaultPath?: string, filters?: { name: string, extensions: string[] }[] }): Promise<{ canceled: boolean; filePath?: string }> {
        return { canceled: true };
    }

    async renameFile(oldPath: string, newPath: string): Promise<boolean> {
        let success = false;
        // Rename files
        const filesToRename: [string, string][] = [];
        for (const filePath of this.files.keys()) {
            if (filePath === oldPath) {
                filesToRename.push([filePath, newPath]);
            } else if (filePath.startsWith(oldPath + '/')) {
                filesToRename.push([filePath, filePath.replace(oldPath, newPath)]);
            }
        }

        for (const [oldFilePath, newFilePath] of filesToRename) {
            const content = this.files.get(oldFilePath);
            if (content !== undefined) {
                this.files.set(newFilePath, content);
                this.files.delete(oldFilePath);
                success = true;
            }
        }

        // Rename directories
        const dirsToRename: [string, string][] = [];
        for (const dirPath of this.dirs) {
            if (dirPath === oldPath) {
                dirsToRename.push([dirPath, newPath]);
            } else if (dirPath.startsWith(oldPath + '/')) {
                dirsToRename.push([dirPath, dirPath.replace(oldPath, newPath)]);
            }
        }

        for (const [oldDirPath, newDirPath] of dirsToRename) {
            this.dirs.add(newDirPath);
            this.dirs.delete(oldDirPath);
            success = true;
        }

        if (success) {
            this.save();
        }
        return success;
    }

    async getAppVersion(): Promise<string> {
        return "0.0.0-mock";
    }
}
