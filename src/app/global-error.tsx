"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body style={{ fontFamily: "Arial, sans-serif", background: "#F8F6F1", color: "#1F1F1F", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <main style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ color: "#0F2D4F", fontFamily: "Georgia, serif", fontWeight: 500 }}>Something went wrong</h1>
          <p>Please try again in a moment.</p>
          <button type="button" onClick={reset} style={{ background: "#0F2D4F", color: "#fff", border: 0, padding: "12px 24px", borderRadius: 4, cursor: "pointer" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
