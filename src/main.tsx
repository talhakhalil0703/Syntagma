import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./components/ThemeProvider.tsx";

window.addEventListener("error", (e: any) => {
  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.top = '0';div.style.left = '0';div.style.zIndex = '9999';
  div.style.background = 'red';div.style.color='white';
  div.style.padding = '20px';div.style.fontSize='16px';
  div.style.whiteSpace = 'pre-wrap';
  div.innerText = 'REACT CRASH: ' + String(e.error?.stack || e.message);
  document.body.appendChild(div);
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
