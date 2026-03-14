import { CompletionContext, snippetCompletion, startCompletion } from "@codemirror/autocomplete";
import type { CompletionResult } from "@codemirror/autocomplete";
import { FileSystemAPI } from "../../utils/fs";
import { useVaultIndexStore } from "../../store/vaultIndexStore";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useSettingsStore } from "../../store/settingsStore";
import {
    Decoration,
    type DecorationSet,
    EditorView,
    ViewPlugin,
    ViewUpdate,
    WidgetType
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import type { Extension } from "@codemirror/state";

// 1. Autocomplete Logic
export function wikilinkAutocomplete(context: CompletionContext): CompletionResult | null {
    // Look backwards from the cursor for `[[` formatting
    let word = context.matchBefore(/\[\[[^\]]*/);

    // If not matching `[[` and we aren't explicitly requesting a completion, ignore.
    if (!word) return null;
    if (word.from === word.to && !context.explicit) return null;

    const searchTerm = word.text.slice(2).toLowerCase(); // remove the '[['
    const { files } = useVaultIndexStore.getState();

    // Recommend markdown files
    const options: CompletionResult["options"] = files
        .filter(f => !f.isDirectory && f.name.toLowerCase().endsWith(".md"))
        .filter(f => f.name.toLowerCase().includes(searchTerm))
        .map(f => {
            const cleanName = f.name.replace(/\.md$/i, '');
            // snippetCompletion returns a Completion object. We just override the label/display types.
            return snippetCompletion(`[[${cleanName}]]#{1}`, {
                label: cleanName,
                type: "text"
            });
        });

    if (options.length === 0) return null;

    return {
        from: word.from,
        options,
        validFor: /^\[\[[^\]]*$/
    };
}

// 2. Rendering Logic

class WikilinkWidget extends WidgetType {
    targetNote: string;
    displayText: string;

    constructor(targetNote: string, displayText: string) {
        super();
        this.targetNote = targetNote;
        this.displayText = displayText;
    }

    eq(other: WikilinkWidget) {
        return this.targetNote === other.targetNote && this.displayText === other.displayText;
    }

    toDOM() {
        const wrap = document.createElement("span");
        wrap.className = "cm-wikilink";
        wrap.innerText = this.displayText;
        wrap.title = `Open ${this.targetNote}`;

        wrap.onmousedown = (e) => {
            // Prevent CodeMirror from handling mousedown and unmounting the widget before the click resolves
            e.preventDefault();
            e.stopPropagation();
        };

        wrap.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const resolvedPath = useVaultIndexStore.getState().resolveShortestPath(this.targetNote);

            if (resolvedPath) {
                useWorkspaceStore.getState().openTab({ id: resolvedPath, title: this.targetNote });
            } else {
                // If a wikilink doesn't exist, we create it
                const vaultPath = useWorkspaceStore.getState().vaultPath;
                if (vaultPath) {
                    const { newFileLocation } = useSettingsStore.getState();
                    let targetDir = vaultPath;

                    if (newFileLocation === "current") {
                        const workspaceStore = useWorkspaceStore.getState();
                        let activeTabId = null;
                        if (workspaceStore.activeGroupId) {
                            const findGroup = (node: any): any => {
                                if (node.type === "leaf" && node.group?.id === workspaceStore.activeGroupId) return node.group;
                                if (node.children) {
                                    for (const child of node.children) {
                                        const found = findGroup(child);
                                        if (found) return found;
                                    }
                                }
                                return null;
                            };
                            const group = findGroup(workspaceStore.rootSplit);
                            if (group) activeTabId = group.activeTabId;
                        }

                        // activeTabId is usually the absolute path for markdown files
                        if (activeTabId && !activeTabId.startsWith("tab-") && activeTabId !== "welcome" && !activeTabId.startsWith("browser-")) {
                            const lastSlash = activeTabId.lastIndexOf('/');
                            if (lastSlash !== -1) {
                                targetDir = activeTabId.substring(0, lastSlash);
                            }
                        }
                    }

                    const newPath = `${targetDir}/${this.targetNote}.md`;
                    // Create the file on disk
                    const success = await FileSystemAPI.writeFile(newPath, "");
                    if (success) {
                        // Rebuild index to register new file
                        await useVaultIndexStore.getState().buildIndex(vaultPath);
                        useWorkspaceStore.getState().openTab({ id: newPath, title: `${this.targetNote}.md` });
                    } else {
                        console.error("Failed to create new file at", newPath);
                    }
                }
            }
        };

        return wrap;
    }
}

export function buildWikilinkDecorations(view: EditorView) {
    const builder = new RangeSetBuilder<Decoration>();
    const decorations: { from: number; to: number; deco: Decoration }[] = [];

    const { state } = view;
    const selection = state.selection.main;

    const isCursorInside = (from: number, to: number) => {
        return selection.from <= to && selection.to >= from;
    };

    for (let { from, to } of view.visibleRanges) {
        const text = state.sliceDoc(from, to);

        // Match [[Link]] or [[Link|Alias]]
        // Ignoring ![[Image]] using a negative lookbehind for '!'
        const wikilinkRegex = /(?<!\!)\[\[([^\]]+)\]\]/g;
        let m;
        while ((m = wikilinkRegex.exec(text)) !== null) {
            const matchFrom = from + m.index;
            const matchTo = matchFrom + m[0].length;

            const linkContent = m[1];
            // Handle piped aliases [[Actual Note|Display Name]]
            const displayParts = linkContent.split('|');
            const targetNote = displayParts[0];
            const displayText = displayParts.length > 1 ? displayParts[1] : targetNote;

            if (!isCursorInside(matchFrom, matchTo)) {
                // Render custom pill widget taking up the entire span
                decorations.push({
                    from: matchFrom,
                    to: matchTo,
                    deco: Decoration.replace({ widget: new WikilinkWidget(targetNote, displayText) })
                });
            } else {
                // Highlight plain text formatting exactly around [[Link]]
                decorations.push({
                    from: matchFrom,
                    to: matchTo,
                    deco: Decoration.mark({ class: "cm-wikilink-edit" })
                });
            }
        }
    }

    decorations.sort((a, b) => a.from - b.from);
    for (const { from, to, deco } of decorations) {
        builder.add(from, to, deco);
    }
    return builder.finish();
}

const wikilinkPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = buildWikilinkDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged || update.selectionSet) {
                this.decorations = buildWikilinkDecorations(update.view);
            }
        }
    },
    {
        decorations: (v) => v.decorations,
    }
);

const wikilinkTheme = EditorView.theme({
    ".cm-wikilink": {
        color: "var(--text-accent)",
        textDecoration: "none",
        cursor: "pointer",
        padding: "0 2px",
        borderRadius: "4px",
        fontWeight: 500,
        "&:hover": {
            backgroundColor: "var(--bg-tertiary)",
            textDecoration: "underline"
        }
    },
    ".cm-wikilink-edit": {
        color: "var(--text-accent)",
        opacity: 0.8
    }
});

export const wikilinkExtension = (): Extension => {
    const triggerAutocomplete = EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged && update.selectionSet) {
            const pos = update.state.selection.main.head;
            const line = update.state.doc.lineAt(pos);
            const textBefore = line.text.substring(0, pos - line.from);

            // Check if we are inside a wikilink that we are currently typing in
            if (/\[\[[^\]]*$/.test(textBefore)) {
                // Schedule completion asynchronously to circumvent update state conflicts
                setTimeout(() => startCompletion(update.view), 10);
            }
        }
    });

    return [wikilinkPlugin, wikilinkTheme, triggerAutocomplete];
};
