import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import App from "../App";

describe("App Component", () => {
  beforeAll(() => {
    // Mock localStorage for the initWorkspace call
    const localStorageMock = (function () {
      let store: Record<string, string> = {};
      return {
        getItem: function (key: string) { return store[key] || null; },
        setItem: function (key: string, value: string) { store[key] = value.toString(); },
        clear: function () { store = {}; }
      };
    })();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  });

  it("renders without crashing", () => {
    render(<App />);
    const elements = screen.getAllByText(/Syntagma/i);
    expect(elements.length).toBeGreaterThan(0);
  });
});
