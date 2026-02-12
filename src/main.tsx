import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

// Environment Alignment Audit
// This verifies that the correct environment variables are loaded on startup
console.group("[Environment Alignment Audit]");
console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);
console.log("Execution Mode:", import.meta.env.MODE);
console.groupEnd();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);