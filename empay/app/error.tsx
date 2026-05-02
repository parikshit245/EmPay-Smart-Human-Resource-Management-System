"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-red-500/15">
          <AlertTriangle className="h-7 w-7 text-red-300" />
        </div>
        <h1 className="mt-5 text-3xl font-bold text-slate-100">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-400">
          The app hit an unexpected error. You can retry the page.
        </p>
        <Button onClick={reset} className="mt-5 bg-indigo-600 text-white hover:bg-indigo-500">
          Try Again
        </Button>
      </div>
    </div>
  );
}
