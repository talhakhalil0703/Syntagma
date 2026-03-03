import { describe, it, expect } from 'vitest';
import { fuzzyMatch } from '../../utils/search';

describe('Search Utils', () => {
    describe('fuzzyMatch', () => {
        it('should return true for exact matches', () => {
            expect(fuzzyMatch('test', 'test')).toBe(true);
        });

        it('should return true when query is empty', () => {
            expect(fuzzyMatch('', 'anything')).toBe(true);
        });

        it('should return true when characters exist in sequence', () => {
            expect(fuzzyMatch('abc', 'a longer text with b and c')).toBe(true);
            expect(fuzzyMatch('md', 'README.md')).toBe(true);
            expect(fuzzyMatch('tst', 'test')).toBe(true);
        });

        it('should return false when characters are out of order', () => {
            expect(fuzzyMatch('cba', 'abc')).toBe(false);
        });

        it('should return false when character is missing', () => {
            expect(fuzzyMatch('abcd', 'abc')).toBe(false);
            expect(fuzzyMatch('testz', 'test')).toBe(false);
        });

        it('should be case insensitive', () => {
            expect(fuzzyMatch('TEST', 'test')).toBe(true);
            expect(fuzzyMatch('test', 'TEST')).toBe(true);
            expect(fuzzyMatch('rEaD', 'README.md')).toBe(true);
        });

        it('should return false if query is longer than text', () => {
            expect(fuzzyMatch('toolong', 'short')).toBe(false);
        });
    });
});
