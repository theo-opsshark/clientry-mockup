"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center max-w-md">
        <div
          className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: "rgba(248,113,113,0.1)" }}
        >
          <AlertCircle size={22} style={{ color: "#f87171" }} />
        </div>
        <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
        <p className="text-sm mb-6" style={{ color: "#64748b" }}>
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
          style={{ backgroundColor: "#1e1e2a", color: "#94a3b8" }}
        >
          <RefreshCw size={14} />
          Try Again
        </button>
      </div>
    </div>
  );
}
