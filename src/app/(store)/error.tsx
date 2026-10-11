"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { ArchMark } from "@/components/ui/primitives";

/** Service error boundary: never shows internal details to customers. */
export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-bs flex flex-col items-center py-24 text-center" role="alert">
      <ArchMark className="h-20 w-14 text-gold" />
      <h1 className="t-page mt-8">Something went wrong</h1>
      <p className="mt-4 max-w-md text-slate">We couldn&rsquo;t load this page just now. Please try again in a moment.</p>
      {error.digest ? <p className="mt-2 text-[0.75rem] text-slate">Reference: {error.digest}</p> : null}
      <div className="mt-8 flex gap-3">
        <Button type="button" onClick={reset}>
          Try Again
        </Button>
        <LinkButton href="/" variant="secondary">
          Return Home
        </LinkButton>
      </div>
    </div>
  );
}
