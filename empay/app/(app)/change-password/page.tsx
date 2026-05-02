"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Could not change password.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center">
      <Card className="w-full bg-slate-900/70 border-slate-800/70">
        <CardHeader className="space-y-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15">
            <LockKeyhole className="h-5 w-5 text-indigo-300" />
          </div>
          <CardTitle className="text-xl text-slate-100">Change Password</CardTitle>
          <p className="text-sm text-slate-400">
            Set a new password to finish securing your account.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-slate-300">
                New Password
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="bg-slate-800/50 border-slate-600 text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-slate-300">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="bg-slate-800/50 border-slate-600 text-slate-100"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white hover:bg-indigo-500"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
