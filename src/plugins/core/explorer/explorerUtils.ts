/**
 * Given a base name (filename or folder name) and a set of names that already
 * exist in the target directory, return a unique name by appending " (1)", " (2)", etc.
 *
 * Handles compound extensions like `.excalidraw.md`.
 *
 * Examples:
 *   getUniqueName("notes.md", new Set(["notes.md"])) => "notes (1).md"
 *   getUniqueName("notes.md", new Set(["notes.md", "notes (1).md"])) => "notes (2).md"
 *   getUniqueName("folder", new Set(["folder"])) => "folder (1)"
 */
export function getUniqueName(baseName: string, existingNames: Set<string>): string {
    if (!existingNames.has(baseName)) return baseName;

    const { stem, ext } = splitName(baseName);

    let counter = 1;
    while (true) {
        const candidate = `${stem} (${counter})${ext}`;
        if (!existingNames.has(candidate)) return candidate;
        counter++;
    }
}

/**
 * Split a filename into stem + extension, handling compound extensions.
 */
export function splitName(name: string): { stem: string; ext: string } {
    // Compound extensions first
    const compoundExts = ['.excalidraw.md'];
    for (const ce of compoundExts) {
        if (name.endsWith(ce)) {
            return { stem: name.slice(0, -ce.length), ext: ce };
        }
    }

    const dotIndex = name.lastIndexOf('.');
    if (dotIndex <= 0) {
        // No extension or dot-file like ".hidden"
        return { stem: name, ext: '' };
    }
    return { stem: name.slice(0, dotIndex), ext: name.slice(dotIndex) };
}
