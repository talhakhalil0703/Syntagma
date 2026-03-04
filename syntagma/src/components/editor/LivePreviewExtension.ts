import type { Extension } from "@codemirror/state";
import {
    Decoration,
    type DecorationSet,
    EditorView,
    ViewPlugin,
    ViewUpdate,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";

// Hide decoration for syntax markers
export const hideMarkDeco = Decoration.replace({});

export function buildDecorations(view: EditorView) {
    const decorations: { from: number; to: number; deco: Decoration; isLine: boolean }[] = [];
    const { state } = view;
    const selection = state.selection.main;

    // To avoid hiding syntax when cursor is near/inside it, we keep track of active ranges
    // For block elements, we might reveal if the cursor is on the same line.
    // For inline elements, we reveal if the cursor overlaps the element.

    // Helper to check if selection intersects a node
    const isCursorInside = (from: number, to: number) => {
        return selection.from <= to && selection.to >= from;
    };

    // Iterate over the visible tree
    for (let { from, to } of view.visibleRanges) {
        syntaxTree(state).iterate({
            from,
            to,
            enter: (node) => {
                const name = node.type.name;

                // For markup tokens, we want to check if the cursor is inside their parent block/inline element
                // (e.g. check StrongEmphasis instead of StrongEmphasisMark)
                const parent = node.node?.parent;
                const checkNode = parent && parent.type.name !== "Document" ? parent : node;
                const inside = isCursorInside(checkNode.from, checkNode.to);

                // --- Line Formatting ---
                if (name.startsWith("ATXHeading")) {
                    const level = parseInt(name.replace("ATXHeading", ""), 10);
                    if (!isNaN(level)) {
                        const lineDeco = Decoration.line({
                            class: `cm-header cm-header-${level}`,
                        });
                        decorations.push({ from: node.from, to: node.from, deco: lineDeco, isLine: true });
                    }
                }

                if (name === "Blockquote") {
                    const lineDeco = Decoration.line({
                        class: `cm-blockquote`,
                    });
                    decorations.push({ from: node.from, to: node.from, deco: lineDeco, isLine: true });
                }

                // --- Syntax Hiding (when cursor is not inside the parent element) ---
                if (!inside) {
                    if (
                        name === "HeaderMark" ||
                        name === "EmphasisMark" ||
                        name === "StrongEmphasisMark" ||
                        name === "StrikethroughMark" ||
                        name === "CodeMark" ||
                        name === "QuoteMark" ||
                        name === "ListMark"
                    ) {
                        decorations.push({ from: node.from, to: node.to, deco: hideMarkDeco, isLine: false });
                    }
                }

                // --- Additional Styling for Inline Elements ---
                // Even if cursor is inside or outside, we apply CSS classes to style the text
                if (name === "StrongEmphasis") {
                    decorations.push({ from: node.from, to: node.to, deco: Decoration.mark({ class: "cm-strong" }), isLine: false });
                } else if (name === "Emphasis") {
                    decorations.push({ from: node.from, to: node.to, deco: Decoration.mark({ class: "cm-em" }), isLine: false });
                } else if (name === "Strikethrough") {
                    decorations.push({ from: node.from, to: node.to, deco: Decoration.mark({ class: "cm-strikethrough" }), isLine: false });
                } else if (name === "InlineCode") {
                    decorations.push({ from: node.from, to: node.to, deco: Decoration.mark({ class: "cm-inline-code" }), isLine: false });
                }
            },
        });
    }

    // Sort decorations by `from`, then `to` ascending to satisfy RangeSetBuilder
    decorations.sort((a, b) => {
        if (a.from !== b.from) return a.from - b.from;
        // Line decorations should be added first at the same position, then mark/replace
        if (a.isLine && !b.isLine) return -1;
        if (!a.isLine && b.isLine) return 1;
        return a.to - b.to;
    });

    const builder = new RangeSetBuilder<Decoration>();
    for (const { from, to, deco } of decorations) {
        builder.add(from, to, deco);
    }

    return builder.finish();
}

const livePreviewPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = buildDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged || update.selectionSet) {
                this.decorations = buildDecorations(update.view);
            }
        }
    },
    {
        decorations: (v) => v.decorations,
    }
);

// We define a base theme for our custom classes injected by the decorations
const livePreviewTheme = EditorView.theme({
    ".cm-header": {
        fontWeight: "bold",
        color: "var(--text-primary)",
        marginTop: "1.5rem",
        marginBottom: "0.5rem",
    },
    ".cm-header-1": { fontSize: "2.2em" },
    ".cm-header-2": { fontSize: "1.8em" },
    ".cm-header-3": { fontSize: "1.5em" },
    ".cm-header-4": { fontSize: "1.2em" },
    ".cm-header-5": { fontSize: "1.0em" },
    ".cm-header-6": { fontSize: "0.9em", color: "var(--text-secondary)" },

    ".cm-blockquote": {
        borderLeft: "4px solid var(--text-accent)",
        paddingLeft: "16px",
        color: "var(--text-secondary)",
        backgroundColor: "transparent",
    },

    ".cm-strong": {
        fontWeight: "bold",
    },
    ".cm-em": {
        fontStyle: "italic",
    },
    ".cm-strikethrough": {
        textDecoration: "line-through",
        color: "var(--text-secondary)",
    },
    ".cm-inline-code": {
        fontFamily: "monospace",
        backgroundColor: "var(--bg-tertiary)",
        padding: "2px 4px",
        borderRadius: "4px",
        fontSize: "0.9em",
    }
});

export const livePreviewExtension = (): Extension => {
    return [livePreviewPlugin, livePreviewTheme];
};
