import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f5f7] p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#ede7f6]">
          <ShieldAlert className="h-7 w-7 text-primary" />
        </div>
        <h1 className="mt-5 text-3xl font-bold text-[#1a1c24]">Page not found</h1>
        <p className="mt-2 text-sm text-[#6c757d]">
          The EmPay page you are looking for does not exist.
        </p>
        <Button asChild className="mt-5 bg-primary text-white hover:bg-[#5a3a52]">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
