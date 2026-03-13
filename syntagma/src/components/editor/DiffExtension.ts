import { Decoration, EditorView, WidgetType } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { RangeSetBuilder, StateField } from "@codemirror/state";
import type { Text } from "@codemirror/state";

class FileHeaderWidget extends WidgetType {
  filename: string;
  constructor(filename: string) {
    super();
    this.filename = filename;
  }
  eq(other: FileHeaderWidget) {
    return this.filename === other.filename;
  }
  toDOM() {
    const div = document.createElement("div");
    div.className = "cm-diff-file-header";
    div.innerText = this.filename;
    return div;
  }
}

const additionMark = Decoration.line({ attributes: { class: "cm-diff-add" } });
const deletionMark = Decoration.line({ attributes: { class: "cm-diff-del" } });
const headerMark = Decoration.line({ attributes: { class: "cm-diff-header" } });
const hiddenMark = Decoration.replace({});

function diffDecorations(doc: Text) {
  const builder = new RangeSetBuilder<Decoration>();
  
  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const text = line.text;
    const replaceEnd = Math.min(line.to + 1, doc.length);

    if (text.startsWith("diff --git ")) {
      const match = text.match(/^diff --git a\/(.+) b\//);
      const filename = match ? match[1] : text.replace("diff --git ", "");
      builder.add(line.from, line.from, Decoration.widget({
          widget: new FileHeaderWidget(filename),
          block: true
      }));
      builder.add(line.from, replaceEnd, hiddenMark);
    } else if (text.startsWith("index ") || text.startsWith("--- ") || text.startsWith("+++ ") || text.startsWith("similarity index ") || text.startsWith("rename from ") || text.startsWith("rename to ")) {
      builder.add(line.from, replaceEnd, hiddenMark);
    } else if (text.startsWith("+") && !text.startsWith("+++")) {
      builder.add(line.from, line.from, additionMark);
    } else if (text.startsWith("-") && !text.startsWith("---")) {
      builder.add(line.from, line.from, deletionMark);
    } else if (text.startsWith("@@ ")) {
      builder.add(line.from, line.from, headerMark);
    }
  }
  
  return builder.finish();
}

const diffStateField = StateField.define<DecorationSet>({
  create(state) {
    return diffDecorations(state.doc);
  },
  update(value, tr) {
    if (tr.docChanged) return diffDecorations(tr.state.doc);
    return value.map(tr.changes);
  },
  provide: f => EditorView.decorations.from(f)
});

export const diffExtension = () => [
  diffStateField,
  EditorView.baseTheme({
    ".cm-diff-add": { 
        backgroundColor: "rgba(46, 160, 167, 0.15)",
        color: "#3fb950" 
    },
    ".cm-diff-del": { 
        backgroundColor: "rgba(248, 81, 73, 0.15)",
        color: "#f85149" 
    },
    ".cm-diff-header": { 
        color: "var(--text-accent)", 
        opacity: 0.8,
        fontFamily: "monospace",
        backgroundColor: "rgba(123, 44, 191, 0.1)",
        padding: "4px 0"
    },
    ".cm-diff-file-header": { 
        color: "var(--text-primary)", 
        fontWeight: "bold",
        backgroundColor: "var(--bg-tertiary)",
        borderTop: "1px solid var(--bg-border)",
        borderBottom: "1px solid var(--bg-border)",
        borderLeft: "4px solid var(--text-accent)",
        paddingTop: "8px",
        paddingBottom: "8px",
        paddingLeft: "12px",
        marginTop: "16px",
        marginBottom: "8px",
        borderRadius: "0 4px 4px 0"
    }
  })
];

