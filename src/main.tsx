import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { runSupabaseDiagnostics } from "./utils/supabaseDiagnostics.ts";

// Environment Alignment Check
console.log("%c[AdminLess] Environment Alignment Active", "color: #2563eb; font-weight: bold; font-size: 12px;");
runSupabaseDiagnostics();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);