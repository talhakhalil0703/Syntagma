import { RangeSetBuilder, type EditorState, StateField, type Extension } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { 
    Decoration, 
    type DecorationSet, 
    EditorView, 
    WidgetType 
} from "@codemirror/view";
import { useVaultIndexStore } from "../../store/vaultIndexStore";
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { EmbeddedMarkdown } from '../markdown/EmbeddedMarkdown';
import { ResizableImage } from '../markdown/ResizableImage';
import { MermaidWidget } from '../markdown/MermaidWidget';
import { useMermaidStore } from '../../plugins/core/mermaid/mermaidStore';

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
    root: Root | null = null;

    constructor(src: string) {
        super();
        this.src = src;
    }

    eq(other: ImageWidget) {
        return this.src === other.src;
    }

    toDOM() {
        const wrap = document.createElement("span");
        wrap.className = "cm-image-widget-react";

        this.root = createRoot(wrap);

        let cleanSrc = this.src;
        let width: number | undefined = undefined;

        if (cleanSrc.includes('|')) {
            const parts = cleanSrc.split('|');
            cleanSrc = parts[0];
            const wPart = parts[parts.length - 1]; // Use last part like width
            if (wPart.match(/^\d+$/)) {
                width = parseInt(wPart, 10);
            }
        }

        const resolvedPath = useVaultIndexStore.getState().resolveShortestPath(cleanSrc);
        const finalSrc = resolvedPath ? `file://${resolvedPath}` : cleanSrc;

        this.root.render(
            React.createElement(ResizableImage, { 
                src: finalSrc, 
                originalSrc: this.src, 
                alt: cleanSrc, 
                defaultWidth: width 
            })
        );

        return wrap;
    }

    destroy(_dom: HTMLElement) {
        if (this.root) {
            this.root.unmount();
        }
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

class MermaidWidgetCM extends WidgetType {
    code: string;
    root: Root | null = null;

    constructor(code: string) {
        super();
        this.code = code;
    }

    eq(other: MermaidWidgetCM) {
        return this.code === other.code;
    }

    toDOM() {
        const wrap = document.createElement("div");
        wrap.className = "cm-mermaid-widget";
        this.root = createRoot(wrap);
        this.root.render(React.createElement(MermaidWidget, { code: this.code }));
        return wrap;
    }

    destroy(_dom: HTMLElement) {
        if (this.root) {
            this.root.unmount();
        }
    }

    ignoreEvent() {
        return false;
    }
}

export function buildDecorations(state: EditorState, selection = state.selection.main) {
    const decorations: { from: number; to: number; deco: Decoration; isLine: boolean }[] = [];
    const processedNodes = new Set<string>();

    const isCursorInside = (from: number, to: number) => {
        return selection.from <= to && selection.to >= from;
    };

    syntaxTree(state).iterate({
        from: 0,
        to: state.doc.length,
        enter: (node) => {
            const nodeId = `node-${node.from}-${node.to}-${node.type.name}`;
            if (processedNodes.has(nodeId)) return;
            processedNodes.add(nodeId);

            const name = node.type.name;
            const parent = node.node?.parent;
            const checkNode = parent && parent.type.name !== "Document" ? parent : node;
            const inside = isCursorInside(checkNode.from, checkNode.to);

            // --- Line Formatting ---
            if (name.startsWith("ATXHeading")) {
                const level = parseInt(name.replace("ATXHeading", ""), 10);
                if (!isNaN(level)) {
                    decorations.push({ from: node.from, to: node.from, deco: Decoration.line({ class: `cm-header cm-header-${level}` }), isLine: true });
                }
            }

            if (name === "Blockquote") {
                const text = state.sliceDoc(node.from, Math.min(node.to, node.from + 100));
                const match = text.match(/^>\s*\[!([\w-]+)\](?:(.*))?(?:\n|$)/);
                const className = match ? `cm-callout cm-callout-${match[1].toLowerCase()}` : `cm-blockquote`;

                const startLine = state.doc.lineAt(node.from).number;
                const endLine = state.doc.lineAt(node.to).number;
                for (let l = startLine; l <= endLine; l++) {
                    const line = state.doc.line(l);
                    decorations.push({ from: line.from, to: line.from, deco: Decoration.line({ class: className }), isLine: true });
                }
            }

            if (name === "FencedCode" || name === "CodeBlock") {
                const codeText = state.sliceDoc(node.from, node.to);
                const isMermaid = codeText.trim().startsWith('```mermaid');
                const renderMermaid = useMermaidStore.getState().renderInViewMode;

                if (isMermaid && renderMermaid && !inside) {
                    const lines = codeText.trim().split('\n');
                    const mermaidCode = lines.slice(1, lines.length - 1).join('\n');
                    
                    decorations.push({
                        from: node.from,
                        to: node.to,
                        deco: Decoration.replace({ 
                            widget: new MermaidWidgetCM(mermaidCode),
                            // side is still useful for ordering against other decorations at exactly node.from/to
                            side: 1 
                        }),
                        isLine: false
                    });
                    return;
                }

                const contentMatch = codeText.match(/^```[^\n]*\n([\s\S]*?)```\n?$/);
                const copyText = contentMatch ? contentMatch[1] : codeText;
                const startLine = state.doc.lineAt(node.from).number;
                const endLine = state.doc.lineAt(node.to).number;
                for (let l = startLine; l <= endLine; l++) {
                    const line = state.doc.line(l);
                    decorations.push({ from: line.from, to: line.from, deco: Decoration.line({ class: "cm-codeblock-line" }), isLine: true });
                }
                decorations.push({
                    from: node.from, to: node.from,
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

            if (!inside) {
                if (["HeaderMark", "EmphasisMark", "StrongEmphasisMark", "StrikethroughMark", "QuoteMark"].includes(name)) {
                    if (name === "QuoteMark" && parent?.type.name === "Blockquote") {
                        const bqText = state.sliceDoc(parent.from, parent.to);
                        const match = bqText.match(/^>\s*\[!([\w-]+)\](.*)(?:\n|$)/);
                        if (match && node.from === parent.from) {
                            let replaceLen = match[0].endsWith('\n') ? match[0].length - 1 : match[0].length;
                            decorations.push({
                                from: node.from, to: node.from + replaceLen,
                                deco: Decoration.replace({ widget: new CalloutIconWidget(match[1].toLowerCase(), match[2]?.trim() || match[1]) }),
                                isLine: false
                            });
                            return;
                        }
                    }
                    decorations.push({ from: node.from, to: node.to, deco: hideMarkDeco, isLine: false });
                }
            }

            if (name === "StrongEmphasis") decorations.push({ from: node.from, to: node.to, deco: Decoration.mark({ class: "cm-strong" }), isLine: false });
            else if (name === "Emphasis") decorations.push({ from: node.from, to: node.to, deco: Decoration.mark({ class: "cm-em" }), isLine: false });
            else if (name === "Strikethrough") decorations.push({ from: node.from, to: node.to, deco: Decoration.mark({ class: "cm-strikethrough" }), isLine: false });
            else if (name === "InlineCode") decorations.push({ from: node.from, to: node.to, deco: Decoration.mark({ class: "cm-inline-code" }), isLine: false });
        },
    });

    const docText = state.doc.toString();
    const fmMatch = docText.match(/^---\n([\s\S]*?)\n---/);
    if (fmMatch && !isCursorInside(0, fmMatch[0].length)) {
        decorations.push({ 
            from: 0, 
            to: fmMatch[0].length, 
            deco: Decoration.replace({ widget: new FrontmatterWidget(fmMatch[1]) }), 
            isLine: false 
        });
    }

    const embedRegex = /!\[\[([^\]]+)\]\]/g;
    let m;
    while ((m = embedRegex.exec(docText)) !== null) {
        const from = m.index, to = from + m[0].length;
        if (processedNodes.has(`embed-${from}-${to}`)) continue;
        if (!isCursorInside(from, to)) {
            const isMarkdown = !m[1].match(/\.(png|jpg|jpeg|gif|webp|svg)$/i);
            const deco = Decoration.replace({ widget: isMarkdown ? new EmbedWidget(m[1]) : new ImageWidget(m[1]) });
            decorations.push({ from, to, deco, isLine: false });
        } else {
            decorations.push({ from, to: from + m[0].length, deco: Decoration.mark({ class: "cm-wikilink-edit" }), isLine: false });
        }
    }

    // A more comprehensive side-assignment to enforce strict ordering
    const getSide = (deco: Decoration, isLine: boolean, from: number, to: number) => {
        // Explicit sides from specs take precedence
        if ((deco as any).spec?.side !== undefined) return (deco as any).spec.side;
        
        if (isLine) {
            // Line decorations must come before any widgets/marks at the same position.
            // CM internally uses very small numbers for line decorations.
            if (deco.spec.class?.includes("cm-header")) return -1100;
            if (deco.spec.class?.includes("cm-callout")) return -1050;
            if (deco.spec.class?.includes("cm-mermaid-hidden")) return -1000;
            if (deco.spec.class?.includes("cm-codeblock-line")) return -950;
            if (deco.spec.class?.includes("cm-list-item-line")) return -900;
            if (deco.spec.class?.includes("cm-frontmatter-hidden")) return -850;
            return -800;
        }

        // Widgets usually come after marks at the same start position
        if (deco.spec.widget) return 10;
        
        // Replacement/Mark decorations
        if (deco.spec.replace) return 0;
        
        // Default for marks
        return from === to ? 0 : -1;
    };

    // Prepare and sort
    const decoratedList = decorations.map((d, index) => ({
        ...d,
        side: getSide(d.deco, d.isLine, d.from, d.to),
        originalOrder: index
    }));

    decoratedList.sort((a, b) => {
        if (a.from !== b.from) return a.from - b.from;
        if (a.side !== b.side) return a.side - b.side;
        if (a.to !== b.to) return a.to - b.to;
        return a.originalOrder - b.originalOrder;
    });

    const builder = new RangeSetBuilder<Decoration>();
    let lastFrom = -1, lastSide = -2e9;

    for (const { from, to, deco, side } of decoratedList) {
        // RangeSetBuilder rule: from must be non-decreasing.
        // If from is same, side must be strictly increasing.
        if (from < lastFrom) continue;
        if (from === lastFrom && side <= lastSide) {
            // If they have the same position and side, we can only add one.
            // We skip the subsequent ones to prevent RangeError.
            continue;
        }

        try {
            builder.add(from, to, deco);
            lastFrom = from;
            lastSide = side;
        } catch (e) {
            console.warn("Failsafe: skipping decoration due to RangeSetBuilder error", e, { from, to, deco, side });
        }
    }

    return builder.finish();
}

const livePreviewField = StateField.define<DecorationSet>({
    create(state) {
        return buildDecorations(state);
    },
    update(deco, tr) {
        if (tr.docChanged || tr.state.selection.main.from !== tr.startState.selection.main.from || tr.state.selection.main.to !== tr.startState.selection.main.to) {
            return buildDecorations(tr.state);
        }
        return deco.map(tr.changes);
    },
    provide: f => EditorView.decorations.from(f)
});

const livePreviewTheme = EditorView.theme({
    ".cm-header": {
        fontWeight: "bold",
        color: "var(--text-primary)",
        paddingTop: "1.5rem",
        paddingBottom: "0.5rem",
        display: "inline-block",
    },
    ".cm-header-1": { fontSize: "var(--md-h1-size)", color: "var(--md-h1-color)" },
    ".cm-header-2": { fontSize: "var(--md-h2-size)", color: "var(--md-h2-color)" },
    ".cm-header-3": { fontSize: "var(--md-h3-size)", color: "var(--md-h3-color)" },
    ".cm-header-4": { fontSize: "var(--md-h4-size)", color: "var(--md-h4-color)" },
    ".cm-header-5": { fontSize: "var(--md-h5-size)" },
    ".cm-header-6": { fontSize: "var(--md-h6-size)", color: "var(--text-secondary)" },

    ".cm-blockquote": {
        borderLeft: "4px solid var(--text-accent)",
        paddingLeft: "16px",
        color: "var(--text-secondary)",
        backgroundColor: "rgba(0, 212, 255, 0.03)",
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
        backgroundColor: "rgba(0, 212, 255, 0.03)",
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
    },
    ".cm-mermaid-hidden": {
        fontSize: "0",
        lineHeight: "0",
        height: "0",
        overflow: "hidden",
        padding: "0 !important",
        margin: "0 !important",
    }
});

export const livePreviewExtension = (): Extension => {
    return [
        livePreviewField,
        livePreviewTheme
    ];
};
