"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const signInSchema = z.object({
  loginId: z.string().min(1, "Login ID or email is required"),
  password: z.string().min(1, "Password is required"),
});

type SignInFormData = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInFormData) => {
    setServerError(null);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error || "Sign in failed");
        return;
      }

      router.push(json.data.user.isFirstLogin ? "/change-password" : "/dashboard");
      router.refresh();
    } catch {
      setServerError("Network error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f4f5f7] via-[#faf8ff] to-[#f4f5f7] px-4">
      {/* Background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#faf8ff] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#faf8ff] rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md relative z-10 bg-[#ffffff]/80 backdrop-blur-xl border-[#e5e7eb] shadow-[0_8px_32px_rgba(26,28,36,0.14)]">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[#714b67] shadow-[0_1px_4px_rgba(113,75,103,0.10)] ">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div className="text-center">
              <CardTitle className="text-3xl font-bold text-[#714b67]">
                EmPay
              </CardTitle>
              <CardDescription className="text-[#6c757d] mt-1">
                Smart Human Resource Management
              </CardDescription>
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-[#1a1c24]">Welcome back</h2>
            <p className="text-sm text-[#6c757d]">Sign in to your account</p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <div className="p-3 rounded-lg bg-[#fdecea] border border-[#dc3545]/30 text-[#dc3545] text-sm">
                {serverError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="loginId" className="text-[#374151]">Login ID or Email</Label>
              <Input
                id="loginId"
                placeholder="OIJODO20250001 or john@company.com"
                className="bg-[#faf8ff] border-[#e5e7eb] text-[#1a1c24] placeholder:text-[#6c757d] focus:border-[#714b67] focus:ring-[#714b67]/20"
                {...register("loginId")}
              />
              {errors.loginId && (
                <p className="text-[#dc3545] text-xs">{errors.loginId.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[#374151]">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="bg-[#faf8ff] border-[#e5e7eb] text-[#1a1c24] placeholder:text-[#6c757d] focus:border-[#714b67] focus:ring-[#714b67]/20 pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6c757d] hover:text-[#374151] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[#dc3545] text-xs">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#714b67] hover:bg-[#5a3a52] text-white font-semibold shadow-[0_1px_4px_rgba(113,75,103,0.10)]  transition-all duration-200 mt-2"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center pt-0">
          <p className="text-sm text-[#6c757d]">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="text-[#714b67] hover:text-[#714b67] font-medium transition-colors">
              Sign Up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
