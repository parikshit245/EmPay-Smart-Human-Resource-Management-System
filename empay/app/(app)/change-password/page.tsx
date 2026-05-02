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
      <Card className="w-full bg-[#ffffff] shadow-[0_1px_4px_rgba(113,75,103,0.10)] border-[#ede7f6]">
        <CardHeader className="space-y-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ede7f6]">
            <LockKeyhole className="h-5 w-5 text-[#714b67]" />
          </div>
          <CardTitle className="text-xl text-[#1a1c24]">Change Password</CardTitle>
          <p className="text-sm text-[#6c757d]">
            Set a new password to finish securing your account.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-[#dc3545]/30 bg-[#fdecea] p-3 text-sm text-[#dc3545]">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-[#374151]">
                New Password
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="bg-[#faf8ff] border-[#e5e7eb] text-[#1a1c24]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-[#374151]">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="bg-[#faf8ff] border-[#e5e7eb] text-[#1a1c24]"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#714b67] text-white hover:bg-[#5a3a52]"
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
