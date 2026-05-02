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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-4 py-10">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md relative z-10 bg-slate-900/80 backdrop-blur-xl border-slate-700/50 shadow-2xl">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div className="text-center">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                EmPay
              </CardTitle>
              <CardDescription className="text-slate-400 mt-1">
                Smart Human Resource Management
              </CardDescription>
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-slate-100">Create Admin Account</h2>
            <p className="text-sm text-slate-400">Set up your organization on EmPay</p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {serverError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="companyName" className="text-slate-300">
                <Building2 className="inline w-3.5 h-3.5 mr-1" />
                Company Name
              </Label>
              <Input
                id="companyName"
                placeholder="Acme Corp"
                className="bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500"
                {...register("companyName")}
              />
              {errors.companyName && <p className="text-red-400 text-xs">{errors.companyName.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-slate-300">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                className="bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500"
                {...register("name")}
              />
              {errors.name && <p className="text-red-400 text-xs">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-300">Work Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@company.com"
                className="bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500"
                {...register("email")}
              />
              {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-slate-300">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                className="bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500"
                {...register("phone")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  className="bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 pr-10"
                  {...register("password")}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-slate-300">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat password"
                  className="bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 pr-10"
                  {...register("confirmPassword")}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-400 text-xs">{errors.confirmPassword.message}</p>}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-lg shadow-indigo-500/25 transition-all duration-200 mt-2"
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
          <p className="text-sm text-slate-400">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
