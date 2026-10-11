"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Re-renders the page from the server periodically while awaiting provider confirmation. */
export function AutoRefresh({ seconds, maxTries }: { seconds: number; maxTries: number }) {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (tries >= maxTries) return;
    const t = setTimeout(() => {
      router.refresh();
      setTries((n) => n + 1);
    }, seconds * 1000);
    return () => clearTimeout(t);
  }, [tries, maxTries, seconds, router]);
  if (tries >= maxTries) {
    return (
      <p className="mt-4 text-sm text-slate">
        Still waiting for confirmation. You&rsquo;ll receive an email as soon as it arrives — there&rsquo;s no need to pay again.{" "}
        <button type="button" className="link" onClick={() => setTries(0)}>
          Check again
        </button>
      </p>
    );
  }
  return null;
}
