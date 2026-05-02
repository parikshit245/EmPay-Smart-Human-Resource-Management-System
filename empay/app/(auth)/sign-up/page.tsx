"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Shield, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const signUpSchema = z
  .object({
    companyName: z.string().min(1, "Company name is required"),
    name: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignUpFormData = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpFormData) => {
    setServerError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(
          typeof json.error === "string"
            ? json.error
            : "Registration failed. Please try again."
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setServerError("Network error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f4f5f7] via-[#faf8ff] to-[#f4f5f7] px-4 py-10">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#faf8ff] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#faf8ff] rounded-full blur-3xl pointer-events-none" />

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
            <h2 className="text-xl font-semibold text-[#1a1c24]">Create Admin Account</h2>
            <p className="text-sm text-[#6c757d]">Set up your organization on EmPay</p>
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
              <Label htmlFor="companyName" className="text-[#374151]">
                <Building2 className="inline w-3.5 h-3.5 mr-1" />
                Company Name
              </Label>
              <Input
                id="companyName"
                placeholder="Acme Corp"
                className="bg-[#faf8ff] border-[#e5e7eb] text-[#1a1c24] placeholder:text-[#6c757d] focus:border-[#714b67]"
                {...register("companyName")}
              />
              {errors.companyName && <p className="text-[#dc3545] text-xs">{errors.companyName.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[#374151]">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                className="bg-[#faf8ff] border-[#e5e7eb] text-[#1a1c24] placeholder:text-[#6c757d] focus:border-[#714b67]"
                {...register("name")}
              />
              {errors.name && <p className="text-[#dc3545] text-xs">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[#374151]">Work Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@company.com"
                className="bg-[#faf8ff] border-[#e5e7eb] text-[#1a1c24] placeholder:text-[#6c757d] focus:border-[#714b67]"
                {...register("email")}
              />
              {errors.email && <p className="text-[#dc3545] text-xs">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-[#374151]">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                className="bg-[#faf8ff] border-[#e5e7eb] text-[#1a1c24] placeholder:text-[#6c757d] focus:border-[#714b67]"
                {...register("phone")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[#374151]">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  className="bg-[#faf8ff] border-[#e5e7eb] text-[#1a1c24] placeholder:text-[#6c757d] focus:border-[#714b67] pr-10"
                  {...register("password")}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6c757d] hover:text-[#374151]">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-[#dc3545] text-xs">{errors.password.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-[#374151]">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat password"
                  className="bg-[#faf8ff] border-[#e5e7eb] text-[#1a1c24] placeholder:text-[#6c757d] focus:border-[#714b67] pr-10"
                  {...register("confirmPassword")}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6c757d] hover:text-[#374151]">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-[#dc3545] text-xs">{errors.confirmPassword.message}</p>}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#714b67] hover:bg-[#5a3a52] text-white font-semibold shadow-[0_1px_4px_rgba(113,75,103,0.10)]  transition-all duration-200 mt-2"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating Account...</>
              ) : (
                "Create Admin Account"
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center pt-0">
          <p className="text-sm text-[#6c757d]">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-[#714b67] hover:text-[#714b67] font-medium transition-colors">
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
