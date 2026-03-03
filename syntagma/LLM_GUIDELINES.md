# Syntagma - AI Agent Guidelines

Welcome, fellow agent! This repository follows a strict architectural pattern and prioritizes high-quality, tested code. When working on Syntagma, please adhere to the following rules:

### 1. Architecture & State Management
- **Zustand for State**: Core application state lives in `src/store`. Do NOT use React Context for global state.
- **Plugin Store Isolation Constraint**: Any state specific to a single plugin (like `bookmarksStore` or a future `gitStore`) **MUST** live exclusively inside the plugin's isolated folder (`src/plugins/<type>/<name>/`), and should NEVER pollute the global `src/store` folder.
- **Plugin-First**: Core features should be built as plugins extending `src/plugins/Plugin.ts`.
- **Electron IPC Bridge**: The frontend NEVER accesses Node.js APIs directly. Use the proxy methods in `src/utils/fs.ts`, which safely call `ipcRenderer.invoke`.

### 2. Testing Constraints (MANDATORY)
- **Test-Driven Modifications**: Every new feature or mutated function **must** be accompanied by an updated or new Vitest unit test.
- **Directory Structure**: All tests MUST live inside the `src/__tests__/` directory. Mirror the exact folder structure of `src` (e.g., tests for `src/store/themeStore.ts` go in `src/__tests__/store/themeStore.test.ts`).
- **Mocking**: When testing UI components or state that relies on the filesystem, you MUST mock `../../utils/fs` using Vitest's `vi.mock()`.

### 3. UI/UX Rules
- **Obsidian Aesthetics**: Match the design style of Obsidian—use `var(--bg-primary)`, `var(--text-secondary)`, etc., defined in `base.css` and `themeStore.ts`.
- **No Tailwind**: Use standard CSS/inline styles. Do NOT introduce external UI component libraries like Tailwind or Material UI without explicit user consent.

### 4. Git Hooks
- **Formatter & Linter**: Code must pass `npm run format` (Prettier) and ESLint.
- **Pre-commit**: There is a pre-commit hook enforcing tests to pass. Breaking the test suite breaks the build. Ensure tests pass before concluding your workflow!
