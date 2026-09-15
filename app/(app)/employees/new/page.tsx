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

interface CreatedCredentials {
  loginId: string;
  temporaryPassword: string;
}

export default function NewEmployeePage() {
  const router = useRouter();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [credentials, setCredentials] = useState<CreatedCredentials | null>(null);

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

      setCredentials(json.data.credentials);
      setSuccess(true);
    } catch {
      setServerError("Network error. Please try again.");
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#edf7ef]">
          <CheckCircle2 className="w-8 h-8 text-[#28a745]" />
        </div>
        <h2 className="text-xl font-semibold text-[#1a1c24]">Employee Created!</h2>
        <p className="text-[#6c757d] text-sm">Share these login credentials with the employee.</p>
        {credentials && (
          <div className="w-full max-w-sm rounded-lg border border-[#e5e7eb] bg-[#faf8ff] p-4 text-sm text-[#1a1c24]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#6c757d]">Login ID</span>
              <span className="font-medium">{credentials.loginId}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-[#6c757d]">Temporary Password</span>
              <span className="font-medium">{credentials.temporaryPassword}</span>
            </div>
          </div>
        )}
        <Button onClick={() => router.push("/employees")} className="bg-primary hover:bg-[#5a3a52] text-white">
          Go to Employees
        </Button>
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
          className="text-[#6c757d] hover:text-[#1a1c24] hover:bg-[#faf8ff] p-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[#1a1c24] flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-primary" />
            Add New Employee
          </h1>
          <p className="text-[#6c757d] text-sm mt-0.5">
            Login credentials will be shown after the employee is created
          </p>
        </div>
      </div>

      <Card className="bg-[#ffffff] shadow-[0_1px_4px_rgba(113,75,103,0.10)] border-[#ede7f6]">
        <CardHeader className="pb-4">
          <CardTitle className="text-[#1a1c24] text-lg">Employee Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {serverError && (
              <div className="p-3 rounded-lg bg-[#fdecea] border border-[#dc3545]/30 text-[#dc3545] text-sm">
                {serverError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name" className="text-[#374151]">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  className="bg-[#faf8ff] border-[#e5e7eb] text-[#1a1c24] placeholder:text-[#6c757d] focus:border-primary"
                  {...register("name")}
                />
                {errors.name && <p className="text-[#dc3545] text-xs">{errors.name.message}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[#374151]">Work Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@company.com"
                  className="bg-[#faf8ff] border-[#e5e7eb] text-[#1a1c24] placeholder:text-[#6c757d] focus:border-primary"
                  {...register("email")}
                />
                {errors.email && <p className="text-[#dc3545] text-xs">{errors.email.message}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-[#374151]">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  className="bg-[#faf8ff] border-[#e5e7eb] text-[#1a1c24] placeholder:text-[#6c757d] focus:border-primary"
                  {...register("phone")}
                />
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <Label htmlFor="department" className="text-[#374151]">Department</Label>
                <Input
                  id="department"
                  placeholder="Engineering, Sales, HR..."
                  className="bg-[#faf8ff] border-[#e5e7eb] text-[#1a1c24] placeholder:text-[#6c757d] focus:border-primary"
                  {...register("department")}
                />
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <Label htmlFor="role" className="text-[#374151]">Role *</Label>
                <Select
                  defaultValue="EMPLOYEE"
                  onValueChange={(val) =>
                    setValue("role", val as CreateEmployeeData["role"])
                  }
                >
                  <SelectTrigger
                    id="role"
                    className="bg-[#faf8ff] border-[#e5e7eb] text-[#1a1c24] focus:border-primary"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#ffffff] border-[#e5e7eb] text-[#374151]">
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="HR_OFFICER">HR Officer</SelectItem>
                    <SelectItem value="PAYROLL_OFFICER">Payroll Officer</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && <p className="text-[#dc3545] text-xs">{errors.role.message}</p>}
              </div>

              {/* Manager */}
              <div className="space-y-1.5">
                <Label htmlFor="manager" className="text-[#374151]">Reporting Manager</Label>
                <Select
                  onValueChange={(val) => setValue("managerId", val === "none" ? undefined : val)}
                >
                  <SelectTrigger
                    id="manager"
                    className="bg-[#faf8ff] border-[#e5e7eb] text-[#1a1c24] focus:border-primary"
                  >
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#ffffff] border-[#e5e7eb] text-[#374151]">
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
                <Label htmlFor="dateOfJoining" className="text-[#374151]">Date of Joining</Label>
                <Input
                  id="dateOfJoining"
                  type="date"
                  className="bg-[#faf8ff] border-[#e5e7eb] text-[#1a1c24] focus:border-primary [color-scheme:light]"
                  {...register("dateOfJoining")}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                className="text-[#6c757d] hover:text-[#1a1c24] hover:bg-[#faf8ff]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-[#5a3a52] text-white shadow-[0_1px_4px_rgba(113,75,103,0.10)]  gap-2"
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
