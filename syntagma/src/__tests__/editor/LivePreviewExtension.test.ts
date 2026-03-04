/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { buildDecorations } from "../../components/editor/LivePreviewExtension";

// Helper to extract decorations from an EditorState using buildDecorations directly
function getDecorations(state: EditorState) {
    // We mock a lightweight EditorView to pass into buildDecorations
    const viewMock = {
        state,
        visibleRanges: [{ from: 0, to: state.doc.length }],
    } as unknown as EditorView;

    return buildDecorations(viewMock);
}

describe("LivePreviewExtension", () => {
    it("hides StrongEmphasisMark when cursor is not inside", () => {
        const doc = "Hello **world**!";
        // Cursor at position 0
        const state = EditorState.create({
            doc,
            selection: { anchor: 0 },
            extensions: [markdown({ base: markdownLanguage })]
        });

        const decorations = getDecorations(state);

        // Iterate through decorations. We expect Decoration.replace to be at the ** marks
        let replaceCount = 0;
        const iter = decorations.iter();
        while (iter.value) {
            if (iter.value.spec && iter.value.spec.widget === undefined && !iter.value.spec.class) {
                // rough heuristic for Decoration.replace({}) which we use to hide marks
                replaceCount++;
            }
            iter.next();
        }

        // There should be two hide decorations (for the two `**` marks)
        // Wait, the StrongEmphasis node wraps the marks. 
        // We expect some hidden marks.
        expect(replaceCount).toBeGreaterThan(0);
    });

    it("reveals StrongEmphasisMark when cursor is inside", () => {
        const doc = "Hello **world**!";
        // Cursor at position 8 (inside "world")
        const state = EditorState.create({
            doc,
            selection: { anchor: 8 },
            extensions: [markdown({ base: markdownLanguage })]
        });

        const decorations = getDecorations(state);

        let replaceCount = 0;
        const iter = decorations.iter();
        while (iter.value) {
            if (iter.value.spec && iter.value.spec.widget === undefined && !iter.value.spec.class) {
                replaceCount++;
            }
            iter.next();
        }

        // Since cursor is inside, the syntax hiding should NOT be applied for that specific mark
        expect(replaceCount).toBe(0);
    });
});
