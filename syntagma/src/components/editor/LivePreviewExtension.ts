import type { Extension } from "@codemirror/state";
import {
    Decoration,
    type DecorationSet,
    EditorView,
    ViewPlugin,
    ViewUpdate,
    WidgetType
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import { FileSystemAPI } from "../../utils/fs";
import { useVaultIndexStore } from "../../store/vaultIndexStore";
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { EmbeddedMarkdown } from '../markdown/EmbeddedMarkdown';

// Hide decoration for syntax markers
export const hideMarkDeco = Decoration.replace({});

class FrontmatterWidget extends WidgetType {
    content: string;
    constructor(content: string) { super(); this.content = content; }
    eq(other: FrontmatterWidget) { return this.content === other.content; }
    toDOM() {
        const wrap = document.createElement("div");
        wrap.className = "cm-frontmatter-widget";

        const heading = document.createElement("div");
        heading.className = "cm-frontmatter-heading";
        heading.innerText = "Properties";
        wrap.appendChild(heading);

        const lines = this.content.split('\n').filter(l => l.trim().length > 0 && !l.startsWith('---'));
        lines.forEach(line => {
            const idx = line.indexOf(':');
            if (idx !== -1) {
                const k = line.slice(0, idx).trim();
                const v = line.slice(idx + 1).trim();
                const row = document.createElement("div");
                row.className = "cm-frontmatter-row";
                const kEl = document.createElement("div");
                kEl.className = "cm-frontmatter-key";
                kEl.innerText = k;
                const vEl = document.createElement("div");
                vEl.className = "cm-frontmatter-value";
                vEl.innerText = v;
                row.appendChild(kEl);
                row.appendChild(vEl);
                wrap.appendChild(row);
            }
        });
        return wrap;
    }
}

class CalloutIconWidget extends WidgetType {
    type: string;
    title: string;
    constructor(type: string, title: string) { super(); this.type = type; this.title = title; }
    eq(other: CalloutIconWidget) { return this.type === other.type && this.title === other.title; }
    toDOM() {
        const wrap = document.createElement("div");
        wrap.className = "cm-callout-header";

        const icon = document.createElement("span");
        icon.className = "cm-callout-icon";
        // Simple map for icons
        let iconHtml = "ℹ️";
        if (this.type === "todo" || this.type === "success") iconHtml = "✅";
        else if (this.type === "warning" || this.type === "attention") iconHtml = "⚠️";
        else if (this.type === "error" || this.type === "danger" || this.type === "bug") iconHtml = "❌";
        else if (this.type === "note") iconHtml = "📝";
        else if (this.type === "tip") iconHtml = "💡";
        else if (this.type === "question") iconHtml = "❓";
        else if (this.type === "quote") iconHtml = "💬";
        icon.innerText = iconHtml;

        const titleEl = document.createElement("span");
        titleEl.className = "cm-callout-title";
        titleEl.innerText = this.title;

        wrap.appendChild(icon);
        wrap.appendChild(titleEl);
        return wrap;
    }
}

class CopyButtonWidget extends WidgetType {
    textToCopy: string;
    constructor(textToCopy: string) { super(); this.textToCopy = textToCopy; }
    eq(other: CopyButtonWidget) { return this.textToCopy === other.textToCopy; }
    toDOM() {
        const btn = document.createElement("button");
        btn.className = "cm-codeblock-copy-btn";
        btn.innerText = "Copy";
        btn.onclick = () => {
            navigator.clipboard.writeText(this.textToCopy).then(() => {
                btn.innerText = "Copied!";
                btn.style.borderColor = "var(--text-accent)";
                setTimeout(() => {
                    btn.innerText = "Copy";
                    btn.style.borderColor = "var(--bg-border)";
                }, 2000);
            });
        };
        return btn;
    }
    ignoreEvent() { return false; }
}

class ImageWidget extends WidgetType {
    src: string;

    constructor(src: string) {
        super();
        this.src = src;
    }

    eq(other: ImageWidget) {
        return this.src === other.src;
    }

    toDOM() {
        const wrap = document.createElement("span");
        wrap.className = "cm-image-widget";

        const img = document.createElement("img");
        img.style.maxWidth = "100%";
        img.style.maxHeight = "600px";
        img.style.borderRadius = "4px";
        img.style.marginTop = "8px";
        img.style.marginBottom = "8px";
        img.style.display = "block";
        let cleanSrc = this.src;
        let width: string | undefined = undefined;

        if (cleanSrc.includes('|')) {
            const parts = cleanSrc.split('|');
            cleanSrc = parts[0];
            width = parts[parts.length - 1]; // Use last part like width
        }

        img.alt = cleanSrc;

        if (width && width.match(/^\d+$/)) {
            img.style.width = `${width}px`;
        }

        const resolvedPath = useVaultIndexStore.getState().resolveShortestPath(cleanSrc);

        if (resolvedPath) {
            FileSystemAPI.readImageBase64(resolvedPath).then(base64 => {
                if (base64) {
                    img.src = base64;
                } else {
                    // Fallback visual
                    img.alt = "Image not found: " + cleanSrc;
                }
            });
        } else {
            img.alt = "Image not found: " + cleanSrc;
        }

        wrap.appendChild(img);
        return wrap;
    }
}

class EmbedWidget extends WidgetType {
    src: string;
    root: Root | null = null;

    constructor(src: string) {
        super();
        this.src = src;
    }

    eq(other: EmbedWidget) {
        return this.src === other.src;
    }

    toDOM() {
        const wrap = document.createElement("div");
        wrap.className = "cm-embed-widget";
        // Render EmbeddedMarkdown component into the widget
        this.root = createRoot(wrap);
        this.root.render(React.createElement(EmbeddedMarkdown, { src: this.src }));
        return wrap;
    }
    
    destroy(_dom: HTMLElement) {
        if (this.root) {
            this.root.unmount();
        }
    }
}

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
        // Iteration
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
                    const text = state.sliceDoc(node.from, Math.min(node.to, node.from + 100));
                    const match = text.match(/^>\s*\[!([\w-]+)\](?:(.*))?(?:\n|$)/);
                    const calloutType = match ? match[1].toLowerCase() : null;
                    const className = match ? `cm-callout cm-callout-${calloutType}` : `cm-blockquote`;

                    const startLine = state.doc.lineAt(node.from).number;
                    const endLine = state.doc.lineAt(node.to).number;
                    for (let l = startLine; l <= endLine; l++) {
                        const line = state.doc.line(l);
                        const lineDeco = Decoration.line({ class: className });
                        decorations.push({ from: line.from, to: line.from, deco: lineDeco, isLine: true });
                    }
                }

                // Add background to codeblocks
                if (name === "FencedCode" || name === "CodeBlock") {
                    const startLine = state.doc.lineAt(node.from).number;
                    const endLine = state.doc.lineAt(node.to).number;
                    for (let l = startLine; l <= endLine; l++) {
                        const line = state.doc.line(l);
                        decorations.push({ from: line.from, to: line.from, deco: Decoration.line({ class: "cm-codeblock-line" }), isLine: true });
                    }

                    // Add copy button
                    const codeText = state.sliceDoc(node.from, node.to);
                    const contentMatch = codeText.match(/^```[^\n]*\n([\s\S]*?)```\n?$/);
                    const copyText = contentMatch ? contentMatch[1] : codeText;

                    decorations.push({
                        from: node.from,
                        to: node.from,
                        deco: Decoration.widget({ widget: new CopyButtonWidget(copyText), side: 1 }),
                        isLine: false
                    });
                }

                if (name === "ListItem") {
                    const startLine = state.doc.lineAt(node.from).number;
                    const endLine = state.doc.lineAt(node.to).number;
                    for (let l = startLine; l <= endLine; l++) {
                        const line = state.doc.line(l);
                        decorations.push({ from: line.from, to: line.from, deco: Decoration.line({ class: "cm-list-item-line" }), isLine: true });
                    }
                }

                // --- Syntax Hiding (when cursor is not inside the parent element) ---
                if (!inside) {
                    if (
                        name === "HeaderMark" ||
                        name === "EmphasisMark" ||
                        name === "StrongEmphasisMark" ||
                        name === "StrikethroughMark" ||
                        name === "QuoteMark"
                    ) {
                        // For QuoteMark inside callouts
                        const p = node.node?.parent;
                        if (name === "QuoteMark" && p && p.type.name === "Blockquote") {
                            const bqText = state.sliceDoc(p.from, p.to);
                            if (bqText.match(/^>\s*\[!([\w-]+)\]/)) {
                                // hide the `> [!type]` entirely if it's the first line
                                if (node.from === p.from) {
                                    const match = bqText.match(/^>\s*\[!([\w-]+)\](.*)(?:\n|$)/);
                                    if (match) {
                                        // Calculate end without trailing newline
                                        let replaceLen = match[0].length;
                                        if (match[0].endsWith('\n')) replaceLen--;
                                        decorations.push({
                                            from: node.from,
                                            to: node.from + replaceLen,
                                            deco: Decoration.replace({ widget: new CalloutIconWidget(match[1].toLowerCase(), match[2]?.trim() || match[1]) }),
                                            isLine: false
                                        });
                                        return;
                                    }
                                }
                            }
                        }

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

        // --- Multi-line parsing for Code Blocks (for full line coverage), Frontmatter, etc. ---
        const text = state.sliceDoc(from, to);

        // Code block line styler (if Lezer doesn't visit empty lines in FencedCode)
        const docText = state.doc.toString();
        // Frontmatter
        if (from === 0) {
            const fmMatch = docText.match(/^---\n([\s\S]*?)\n---/);
            if (fmMatch) {
                const fmTo = fmMatch[0].length;
                if (!isCursorInside(0, fmTo)) {
                    // Add the widget on the first line only
                    decorations.push({
                        from: 0,
                        to: 0,
                        deco: Decoration.widget({ widget: new FrontmatterWidget(fmMatch[1]), side: -1 }),
                        isLine: false
                    });
                    // Hide each frontmatter line individually (replace decorations can't span line breaks)
                    const startLine = state.doc.lineAt(0).number;
                    const endLine = state.doc.lineAt(fmTo).number;
                    for (let l = startLine; l <= endLine; l++) {
                        const line = state.doc.line(l);
                        decorations.push({
                            from: line.from,
                            to: line.from,
                            deco: Decoration.line({ class: "cm-frontmatter-hidden" }),
                            isLine: true
                        });
                    }
                }
            }
        }

        // ![[image]] or ![[note]]
        const embedRegex = /!\[\[([^\]]+)\]\]/g;
        let m;
        while ((m = embedRegex.exec(text)) !== null) {
            const matchFrom = from + m.index;
            const matchTo = matchFrom + m[0].length;
            if (!isCursorInside(matchFrom, matchTo)) {
                let innerText = m[1];
                let isMarkdown = false;
                
                let cleanSrc = innerText.includes('|') ? innerText.split('|')[0] : innerText;
                
                // Determine if it's an image or markdown. Assume image unless it ends with .md, or there's no extension
                const extMatch = cleanSrc.match(/\.([a-zA-Z0-9]+)$/);
                if (extMatch && extMatch[1].toLowerCase() === 'md') {
                    isMarkdown = true;
                } else if (!extMatch) {
                    // No extension, typical for markdown note transclusions in Obsidian
                    isMarkdown = true; 
                }

                if (isMarkdown) {
                    decorations.push({
                        from: matchFrom,
                        to: matchTo,
                        deco: Decoration.replace({ widget: new EmbedWidget(innerText) }),
                        isLine: false
                    });
                } else {
                    decorations.push({
                        from: matchFrom,
                        to: matchTo,
                        deco: Decoration.replace({ widget: new ImageWidget(innerText) }),
                        isLine: false
                    });
                }
            } else {
                decorations.push({
                    from: matchFrom,
                    to: matchTo,
                    deco: Decoration.mark({ class: "cm-wikilink-edit" }),
                    isLine: false
                });
            }
        }
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

const livePreviewTheme = EditorView.theme({
    ".cm-header": {
        fontWeight: "bold",
        color: "var(--text-primary)",
        paddingTop: "1.5rem",
        paddingBottom: "0.5rem",
        display: "inline-block",
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
    },
    ".cm-wikilink-edit": {
        color: "var(--text-accent)",
        opacity: 0.8
    },

    // Frontmatter styling
    ".cm-frontmatter-widget": {
        border: "1px solid var(--bg-border)",
        borderRadius: "8px",
        padding: "12px",
        margin: "12px 0",
        backgroundColor: "var(--bg-secondary)",
        fontFamily: "'Inter', sans-serif",
    },
    ".cm-frontmatter-heading": {
        fontWeight: "bold",
        fontSize: "0.85em",
        color: "var(--text-secondary)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: "8px",
    },
    ".cm-frontmatter-row": {
        display: "flex",
        alignItems: "center",
        padding: "4px 0",
        borderBottom: "1px solid var(--bg-border)",
        "&:last-child": { borderBottom: "none" }
    },
    ".cm-frontmatter-key": {
        width: "120px",
        color: "var(--text-secondary)",
        fontWeight: "500",
        fontSize: "0.9em",
    },
    ".cm-frontmatter-value": {
        flex: 1,
        color: "var(--text-primary)",
        fontSize: "0.9em",
    },

    // Callout styling
    ".cm-callout": {
        borderLeft: "4px solid var(--text-accent)",
        backgroundColor: "rgba(123, 44, 191, 0.05)",
        padding: "4px 16px",
        margin: "0",
        borderRadius: "0 4px 4px 0",
    },
    ".cm-callout-header": {
        display: "flex",
        alignItems: "center",
        fontWeight: "bold",
        fontSize: "0.95em",
        marginBottom: "4px",
        color: "var(--text-accent)"
    },
    ".cm-callout-icon": {
        marginRight: "8px",
    },
    ".cm-callout-title": {
        lineHeight: "1.2",
    },

    // Specific Callout Types
    ".cm-callout-info": { borderLeftColor: "#3a86ff", backgroundColor: "rgba(58, 134, 255, 0.05)" },
    ".cm-callout-warning": { borderLeftColor: "#ffbe0b", backgroundColor: "rgba(255, 190, 11, 0.05)" },
    ".cm-callout-error": { borderLeftColor: "#ff006e", backgroundColor: "rgba(255, 0, 110, 0.05)" },
    ".cm-callout-success": { borderLeftColor: "#38b000", backgroundColor: "rgba(56, 176, 0, 0.05)" },
    ".cm-callout-vision": { borderLeftColor: "#06d6a0", backgroundColor: "rgba(6, 214, 160, 0.05)" },

    // Codeblock styling
    ".cm-codeblock-line": {
        backgroundColor: "var(--bg-tertiary)",
        fontFamily: "monospace",
    },
    ".cm-codeblock-copy-btn": {
        position: "absolute",
        right: "16px",
        marginTop: "8px",
        padding: "4px 8px",
        fontSize: "12px",
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--bg-border)",
        borderRadius: "4px",
        color: "var(--text-secondary)",
        cursor: "pointer",
        zIndex: 10,
        fontFamily: "'Inter', sans-serif"
    },
    ".cm-codeblock-copy-btn:hover": {
        backgroundColor: "var(--bg-tertiary)",
        color: "var(--text-primary)"
    },

    // Lists styling
    ".cm-list-item-line": {
        position: "relative",
    },
    ".cm-list-item-line::before": {
        content: "''",
        position: "absolute",
        left: "-16px",
        top: "0",
        bottom: "0",
        width: "2px",
        backgroundColor: "var(--bg-border)",
    },

    // Hidden frontmatter lines (raw source hidden when widget is shown)
    ".cm-frontmatter-hidden": {
        fontSize: "0",
        lineHeight: "0",
        height: "0",
        overflow: "hidden",
        padding: "0 !important",
        margin: "0 !important",
    }
});

export const livePreviewExtension = (): Extension => {
    return [livePreviewPlugin, livePreviewTheme];
};
