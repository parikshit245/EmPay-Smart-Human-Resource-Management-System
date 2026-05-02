import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-500/15">
          <ShieldAlert className="h-7 w-7 text-indigo-300" />
        </div>
        <h1 className="mt-5 text-3xl font-bold text-slate-100">Page not found</h1>
        <p className="mt-2 text-sm text-slate-400">
          The EmPay page you are looking for does not exist.
        </p>
        <Button asChild className="mt-5 bg-indigo-600 text-white hover:bg-indigo-500">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
