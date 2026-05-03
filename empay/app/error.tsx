"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f5f7] p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#fdecea]">
          <AlertTriangle className="h-7 w-7 text-[#dc3545]" />
        </div>
        <h1 className="mt-5 text-3xl font-bold text-[#1a1c24]">Something went wrong</h1>
        <p className="mt-2 text-sm text-[#6c757d]">
          The app hit an unexpected error. You can retry the page.
        </p>
        <Button onClick={reset} className="mt-5 bg-primary text-white hover:bg-[#5a3a52]">
          Try Again
        </Button>
      </div>
    </div>
  );
}
