import { describe, it, expect } from 'vitest';
import { getUniqueName, splitName } from '../../../plugins/core/explorer/explorerUtils';

describe('splitName', () => {
    it('splits a simple .md file', () => {
        expect(splitName('notes.md')).toEqual({ stem: 'notes', ext: '.md' });
    });

    it('splits a compound .excalidraw.md extension', () => {
        expect(splitName('drawing.excalidraw.md')).toEqual({ stem: 'drawing', ext: '.excalidraw.md' });
    });

    it('handles a folder name (no extension)', () => {
        expect(splitName('myfolder')).toEqual({ stem: 'myfolder', ext: '' });
    });

    it('handles a .excalidraw file', () => {
        expect(splitName('sketch.excalidraw')).toEqual({ stem: 'sketch', ext: '.excalidraw' });
    });

    it('handles a dotfile', () => {
        expect(splitName('.gitignore')).toEqual({ stem: '.gitignore', ext: '' });
    });

    it('handles multiple dots', () => {
        expect(splitName('my.file.name.txt')).toEqual({ stem: 'my.file.name', ext: '.txt' });
    });
});

describe('getUniqueName', () => {
    it('returns original name when no conflict', () => {
        expect(getUniqueName('notes.md', new Set(['other.md']))).toBe('notes.md');
    });

    it('returns original name when existing set is empty', () => {
        expect(getUniqueName('notes.md', new Set())).toBe('notes.md');
    });

    it('appends (1) when name exists', () => {
        expect(getUniqueName('notes.md', new Set(['notes.md']))).toBe('notes (1).md');
    });

    it('increments to (2) when (1) already exists', () => {
        expect(getUniqueName('notes.md', new Set(['notes.md', 'notes (1).md']))).toBe('notes (2).md');
    });

    it('increments to (3) when (1) and (2) already exist', () => {
        expect(getUniqueName('notes.md', new Set(['notes.md', 'notes (1).md', 'notes (2).md']))).toBe('notes (3).md');
    });

    it('handles compound extension .excalidraw.md', () => {
        expect(getUniqueName('drawing.excalidraw.md', new Set(['drawing.excalidraw.md']))).toBe('drawing (1).excalidraw.md');
    });

    it('handles folders (no extension)', () => {
        expect(getUniqueName('myfolder', new Set(['myfolder']))).toBe('myfolder (1)');
    });

    it('handles folders with multiple conflicts', () => {
        expect(getUniqueName('myfolder', new Set(['myfolder', 'myfolder (1)']))).toBe('myfolder (2)');
    });
});
