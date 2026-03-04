import React, { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { Decoration, EditorView, WidgetType } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { StateField } from "@codemirror/state";
import { useThemeStore } from "../store/themeStore";
import { useWorkspaceStore } from "../store/workspaceStore";
import { FileSystemAPI } from "../utils/fs";
import { livePreviewExtension } from "./editor/LivePreviewExtension";
import { wikilinkExtension, wikilinkAutocomplete } from "./editor/WikilinkExtension";
import { autocompletion } from "@codemirror/autocomplete";

class TitleWidget extends WidgetType {
  title: string;
  constructor(title: string) { super(); this.title = title; }
  eq(other: TitleWidget) { return this.title === other.title; }
  toDOM() {
    const h1 = document.createElement("h1");
    h1.className = "cm-inline-title";
    h1.innerText = this.title;
    h1.style.marginTop = "0";
    h1.style.marginBottom = "24px";
    h1.style.fontSize = "2.5em";
    h1.style.color = "var(--text-primary)";
    h1.style.fontWeight = "800";
    h1.style.letterSpacing = "-0.02em";
    return h1;
  }
}

export const inlineTitleExtension = (title: string) => {
  return StateField.define<DecorationSet>({
    create(state) {
      if (state.doc.length === 0) return Decoration.none;
      return Decoration.set([Decoration.widget({ widget: new TitleWidget(title), side: -1 }).range(0)]);
    },
    update(_deco, tr) {
      if (tr.state.doc.length === 0) return Decoration.none;
      return Decoration.set([Decoration.widget({ widget: new TitleWidget(title), side: -1 }).range(0)]);
    },
    provide: f => EditorView.decorations.from(f)
  });
}

interface EditorProps {
  value?: string;
  onChange?: (val: string) => void;
  title?: string;
}

export const Editor: React.FC<EditorProps> = ({
  value = "",
  onChange,
  title,
}) => {
  const { mode, systemDark } = useThemeStore();
  const isDark = mode === "dark" || (mode === "system" && systemDark);
  const viewMode = useWorkspaceStore((state) => state.viewMode);

  // Extend the default theme to blend flawlessly into our background
  const themeExtensions = useMemo(
    () => [
      EditorView.theme(
        {
          "&": {
            backgroundColor: "var(--bg-primary)",
            color: "var(--text-primary)",
            fontSize: "16px",
            height: "100%",
            fontFamily:
              "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          },
          ".cm-content": {
            caretColor: "var(--text-accent)",
            maxWidth: "800px",
            margin: "0 auto",
            padding: "32px 16px",
          },
          "&.cm-focused .cm-cursor": {
            borderLeftColor: "var(--text-accent)",
          },
          "&.cm-focused .cm-selectionBackground, ::selection": {
            backgroundColor: "var(--bg-tertiary)",
          },
          ".cm-panels": {
            backgroundColor: "var(--bg-secondary)",
            color: "var(--text-primary)",
          },
          ".cm-panels.cm-panels-top": {
            borderBottom: "2px solid var(--bg-border)",
          },
          ".cm-panels.cm-panels-bottom": {
            borderTop: "2px solid var(--bg-border)",
          },
          ".cm-searchMatch": {
            backgroundColor: "rgba(123, 44, 191, 0.4)",
            outline: "1px solid var(--text-accent)",
          },
          ".cm-searchMatch.cm-searchMatch-selected": {
            backgroundColor: "var(--text-accent)",
            color: "white",
          },
          ".cm-gutters": {
            backgroundColor: "var(--bg-primary)",
            color: "var(--text-secondary)",
            border: "none",
          },
        },
        { dark: isDark },
      ),
    ],
    [isDark],
  );

  const extensions = useMemo(() => {
    const exts = [
      markdown({
        base: markdownLanguage,
        codeLanguages: languages,
      }),
      EditorView.lineWrapping,
      autocompletion({ override: [wikilinkAutocomplete] }),
      wikilinkExtension(),
      ...themeExtensions,
    ];
    if (viewMode === "live") {
      exts.push(livePreviewExtension());
    }
    if (title) {
      exts.push(inlineTitleExtension(title));
    }
    return exts;
  }, [themeExtensions, viewMode, title]);

  const dropExtension = useMemo(() => {
    return EditorView.domEventHandlers({
      drop(event, view) {
        const transfer = event.dataTransfer;
        if (!transfer || !transfer.files || transfer.files.length === 0) return false;

        const file = transfer.files[0];
        if (!file.type.startsWith("image/")) return false; // Ignore Text drops

        event.preventDefault();

        // Native File objects in desktop Electron emit absolute source paths natively
        const sourcePath = (file as any).path;
        if (!sourcePath) return false;

        const vaultPath = useWorkspaceStore.getState().vaultPath;
        if (!vaultPath) return false;

        (async () => {
          const attachmentsDir = `${vaultPath}/Attachments`;
          // Automatically scaffold Attachments tracking dir if absent
          await FileSystemAPI.mkdir(attachmentsDir);

          const safeIdentifier = file.name.replace(/\s+/g, "_");
          const fileName = `${Date.now()}_${safeIdentifier}`;
          const destPath = `${attachmentsDir}/${fileName}`;

          const success = await FileSystemAPI.copyFile(sourcePath, destPath);

          if (success) {
            const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
            if (pos !== null) {
              const syntax = `![[Attachments/${fileName}]]\n`;
              view.dispatch({
                changes: { from: pos, to: pos, insert: syntax },
                selection: { anchor: pos + syntax.length }
              });
            }
          } else {
            console.error("Failed to copy image to Attachments folder.");
          }
        })();

        return true; // We handled it
      }
    });
  }, []);

  return (
    <div style={{ height: "100%", width: "100%", overflow: "auto" }}>
      <CodeMirror
        value={value}
        height="100%"
        extensions={[...extensions, dropExtension]}
        onChange={onChange}
        theme={isDark ? "dark" : "light"}
        basicSetup={{
          lineNumbers: false, // Clean minimalist look by default
          foldGutter: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
        }}
      />
    </div>
  );
};
