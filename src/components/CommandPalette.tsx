import { useEffect, useState, useRef } from "react";
import { useSettingsStore, type QuickOpenResult } from "../store/settingsStore";
import { useWorkspaceStore } from "../store/workspaceStore";
import { Search, File, Command as CommandIcon } from "lucide-react";
import { fuzzyMatch } from "../utils/search";

export function CommandPalette() {
  const {
    isCommandPaletteOpen,
    isQuickOpen,
    closeCommandPalette,
    commands,
    quickOpenProvider,
  } = useSettingsStore();
  const { openTab } = useWorkspaceStore();
  const [query, setQuery] = useState("");
  const [quickOpenResults, setQuickOpenResults] = useState<QuickOpenResult[]>(
    [],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Delegate all search logic to whichever plugin registered a provider (i.e. SearchPlugin)
  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      if (!isCommandPaletteOpen || !isQuickOpen || !quickOpenProvider) {
        setQuickOpenResults([]);
        return;
      }
      const results = await quickOpenProvider(query);
      if (!cancelled) {
        setQuickOpenResults(results);
        setSelectedIndex(0);
      }
    }

    const debounce = setTimeout(runSearch, 120);
    return () => {
      cancelled = true;
      clearTimeout(debounce);
    };
  }, [isCommandPaletteOpen, isQuickOpen, query, quickOpenProvider]);

  // Command palette filtering (CMD+P mode) — simple fuzzy over registered commands
  const filteredCommands = commands.filter((c) => fuzzyMatch(query, c.name));

  // Keyboard navigation
  useEffect(() => {
    const totalItems = isQuickOpen
      ? quickOpenResults.length
      : filteredCommands.length;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isCommandPaletteOpen) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, totalItems - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (isQuickOpen) {
          const item = quickOpenResults[selectedIndex];
          if (item) {
            openTab({
              id: item.id,
              title: item.title.split("/").pop() || item.title,
            });
            closeCommandPalette();
          }
        } else {
          const item = filteredCommands[selectedIndex];
          if (item) {
            item.callback();
            closeCommandPalette();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isCommandPaletteOpen,
    isQuickOpen,
    quickOpenResults,
    filteredCommands,
    selectedIndex,
  ]);

  // CMD+P shortcut (CMD+O is owned by SearchPlugin via its registered command)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        useSettingsStore.getState().openCommandPalette(false);
      }
      if (e.key === "Escape") closeCommandPalette();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isCommandPaletteOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isCommandPaletteOpen]);

  // Scroll selected item into view
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-selected="true"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!isCommandPaletteOpen) return null;

  const renderQuickOpenItem = (item: QuickOpenResult, index: number) => {
    const isSelected = index === selectedIndex;
    const parts = item.title.split("/");
    const filename = parts.pop() || item.title;
    const folder = parts.join("/");

    return (
      <div
        key={item.id}
        data-selected={isSelected}
        onClick={() => {
          openTab({ id: item.id, title: filename });
          closeCommandPalette();
        }}
        onMouseEnter={() => setSelectedIndex(index)}
        style={{
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          cursor: "pointer",
          borderRadius: "4px",
          backgroundColor: isSelected ? "var(--bg-tertiary)" : "transparent",
          borderLeft: isSelected
            ? "2px solid var(--text-accent)"
            : "2px solid transparent",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <File
            size={14}
            color={
              item.isNameMatch ? "var(--text-accent)" : "var(--text-secondary)"
            }
            style={{ flexShrink: 0 }}
          />
          {item.filenameHtml ? (
            <span
              className="qo-filename"
              style={{
                fontSize: "14px",
                color: "var(--text-primary)",
                fontWeight: item.isNameMatch ? 500 : 400,
              }}
              dangerouslySetInnerHTML={{ __html: item.filenameHtml }}
            />
          ) : (
            <span
              style={{
                fontSize: "14px",
                color: "var(--text-primary)",
                fontWeight: item.isNameMatch ? 500 : 400,
              }}
            >
              {filename}
            </span>
          )}
          {folder && (
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              {folder}
            </span>
          )}
        </div>
        {item.excerptHtml && (
          <div
            className="qo-excerpt"
            style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
              paddingLeft: "22px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            dangerouslySetInnerHTML={{ __html: item.excerptHtml }}
          />
        )}
      </div>
    );
  };

  return (
    <div
      className="modal-overlay"
      onClick={closeCommandPalette}
      style={
        {
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          paddingTop: "15vh",
          zIndex: 1000,
          WebkitAppRegion: "no-drag",
        } as React.CSSProperties
      }
    >
      <div
        className="command-modal"
        onClick={(e) => e.stopPropagation()}
        style={
          {
            width: "600px",
            maxHeight: "450px",
            backgroundColor: "var(--bg-primary)",
            borderRadius: "8px",
            boxShadow: "var(--shadow-md)",
            display: "flex",
            flexDirection: "column",
            border: "1px solid var(--bg-border)",
            overflow: "hidden",
          } as React.CSSProperties
        }
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--bg-border)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Search size={18} color="var(--text-secondary)" />
          <input
            ref={inputRef}
            type="text"
            placeholder={
              isQuickOpen
                ? "Find file by name or content..."
                : "Type a command..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flexGrow: 1,
              border: "none",
              background: "transparent",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: "16px",
            }}
          />
        </div>

        <div
          ref={listRef}
          style={{ overflowY: "auto", flexGrow: 1, padding: "8px" }}
        >
          {isQuickOpen ? (
            <>
              {quickOpenResults.map((item, i) => renderQuickOpenItem(item, i))}
              {quickOpenResults.length === 0 && (
                <div
                  style={{
                    padding: "16px",
                    color: "var(--text-secondary)",
                    textAlign: "center",
                  }}
                >
                  {quickOpenProvider
                    ? "No files found."
                    : "Search plugin is disabled."}
                </div>
              )}
            </>
          ) : (
            <>
              {filteredCommands.map((cmd, i) => (
                <div
                  key={cmd.id}
                  data-selected={i === selectedIndex}
                  style={{
                    padding: "8px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    borderRadius: "4px",
                    backgroundColor:
                      i === selectedIndex
                        ? "var(--bg-tertiary)"
                        : "transparent",
                    borderLeft:
                      i === selectedIndex
                        ? "2px solid var(--text-accent)"
                        : "2px solid transparent",
                    color: "var(--text-primary)",
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                  onClick={() => {
                    cmd.callback();
                    closeCommandPalette();
                  }}
                >
                  <CommandIcon size={14} color="var(--text-secondary)" />
                  {cmd.name}
                </div>
              ))}
              {filteredCommands.length === 0 && (
                <div
                  style={{
                    padding: "16px",
                    color: "var(--text-secondary)",
                    textAlign: "center",
                  }}
                >
                  No commands found.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
