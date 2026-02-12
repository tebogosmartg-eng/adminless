import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

// Environment Alignment Check
// This ensures that when you run on localhost, you can see exactly which DB is connected.
console.log("%c[AdminLess] Environment Alignment Active", "color: #2563eb; font-weight: bold; font-size: 12px;");
console.log("[AdminLess] Connected to Project: whfnuntkisnksxhtepqn");
console.log("[AdminLess] URL: https://whfnuntkisnksxhtepqn.supabase.co");

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);