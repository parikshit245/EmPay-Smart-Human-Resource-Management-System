"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, UserPlus, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const createEmployeeSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  department: z.string().optional(),
  role: z.enum(["EMPLOYEE", "HR_OFFICER", "PAYROLL_OFFICER", "ADMIN"]),
  managerId: z.string().optional(),
  dateOfJoining: z.string().optional(),
});

type CreateEmployeeData = z.infer<typeof createEmployeeSchema>;

interface Manager {
  id: string;
  name: string;
  role: string;
}

export default function NewEmployeePage() {
  const router = useRouter();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateEmployeeData>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: { role: "EMPLOYEE" },
  });

  useEffect(() => {
    async function loadManagers() {
      try {
        const res = await fetch("/api/employees");
        if (res.ok) {
          const json = await res.json();
          setManagers(json.data.employees || []);
        }
      } catch {
        // ignore
      }
    }
    loadManagers();
  }, []);

  const onSubmit = async (data: CreateEmployeeData) => {
    setServerError(null);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(
          typeof json.error === "string"
            ? json.error
            : "Failed to create employee"
        );
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/employees"), 2000);
    } catch {
      setServerError("Network error. Please try again.");
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-100">Employee Created!</h2>
        <p className="text-slate-400 text-sm">Credentials have been sent to their email.</p>
        <p className="text-slate-500 text-xs">Redirecting to employees list...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 p-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-indigo-400" />
            Add New Employee
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            An email with login credentials will be sent automatically
          </p>
        </div>
      </div>

      <Card className="bg-slate-900/60 border-slate-800/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-slate-100 text-lg">Employee Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {serverError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {serverError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name" className="text-slate-300">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  className="bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500"
                  {...register("name")}
                />
                {errors.name && <p className="text-red-400 text-xs">{errors.name.message}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-300">Work Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@company.com"
                  className="bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500"
                  {...register("email")}
                />
                {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-slate-300">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  className="bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500"
                  {...register("phone")}
                />
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <Label htmlFor="department" className="text-slate-300">Department</Label>
                <Input
                  id="department"
                  placeholder="Engineering, Sales, HR..."
                  className="bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500"
                  {...register("department")}
                />
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <Label htmlFor="role" className="text-slate-300">Role *</Label>
                <Select
                  defaultValue="EMPLOYEE"
                  onValueChange={(val) =>
                    setValue("role", val as CreateEmployeeData["role"])
                  }
                >
                  <SelectTrigger
                    id="role"
                    className="bg-slate-800/50 border-slate-600 text-slate-100 focus:border-indigo-500"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="HR_OFFICER">HR Officer</SelectItem>
                    <SelectItem value="PAYROLL_OFFICER">Payroll Officer</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && <p className="text-red-400 text-xs">{errors.role.message}</p>}
              </div>

              {/* Manager */}
              <div className="space-y-1.5">
                <Label htmlFor="manager" className="text-slate-300">Reporting Manager</Label>
                <Select
                  onValueChange={(val) => setValue("managerId", val === "none" ? undefined : val)}
                >
                  <SelectTrigger
                    id="manager"
                    className="bg-slate-800/50 border-slate-600 text-slate-100 focus:border-indigo-500"
                  >
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                    <SelectItem value="none">No Manager</SelectItem>
                    {managers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date of Joining */}
              <div className="space-y-1.5">
                <Label htmlFor="dateOfJoining" className="text-slate-300">Date of Joining</Label>
                <Input
                  id="dateOfJoining"
                  type="date"
                  className="bg-slate-800/50 border-slate-600 text-slate-100 focus:border-indigo-500 [color-scheme:dark]"
                  {...register("dateOfJoining")}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                className="text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25 gap-2"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                ) : (
                  <><UserPlus className="w-4 h-4" /> Create Employee</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
