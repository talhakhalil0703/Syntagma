import React, { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { EditorView } from "@codemirror/view";
import { useThemeStore } from "../store/themeStore";

interface EditorProps {
  initialValue?: string;
  onChange?: (val: string) => void;
}

export const Editor: React.FC<EditorProps> = ({
  initialValue = "",
  onChange,
}) => {
  const { mode, systemDark } = useThemeStore();
  const isDark = mode === "dark" || (mode === "system" && systemDark);

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

  const extensions = useMemo(
    () => [
      markdown({
        base: markdownLanguage,
        codeLanguages: languages,
      }),
      EditorView.lineWrapping,
      ...themeExtensions,
    ],
    [themeExtensions],
  );

  return (
    <div style={{ height: "100%", width: "100%", overflow: "auto" }}>
      <CodeMirror
        value={initialValue}
        height="100%"
        extensions={extensions}
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
