"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Calendar, CreditCard, Loader2, LogIn, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/lib/UserContext";
import { cn } from "@/lib/utils";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const statusStyles = {
  PENDING: "border-yellow-500/30 bg-yellow-50 text-yellow-700",
  APPROVED: "border-green-500/30 bg-green-50 text-green-700",
  REJECTED: "border-red-500/30 bg-red-50 text-red-700",
  PRESENT: "border-green-500/30 bg-green-50 text-green-700",
  ABSENT: "border-yellow-500/30 bg-yellow-50 text-yellow-700",
  ON_LEAVE: "border-blue-500/30 bg-blue-50 text-blue-700",
};

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

interface DashboardData {
  role: string;
  warnings?: { withoutBankAccount: number; withoutManager: number };
  lastPayruns?: Array<{ id: string; month: number; year: number; _count: { payslips: number } }>;
  employerCost?: Array<{ month: string; total: number }>;
  employeeCount?: Array<{ month: string; count: number }>;
  today?: string;
  attendance?: { id: string; checkIn: string | null; checkOut: string | null; status: keyof typeof statusStyles } | null;
  recentTimeOff?: Array<{ id: string; leaveType: string; startDate: string; endDate: string; status: keyof typeof statusStyles }>;
  recentPayslips?: Array<{ id: string; netPay: number; grossPay: number; payrun: { month: number; year: number } }>;
}

function ChartCard({
  title,
  data,
  dataKey,
  color,
  formatter,
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  dataKey: string;
  color: string;
  formatter?: (value: number) => string;
}) {
  const [view, setView] = useState<"annual" | "monthly">("annual");
  const visibleData = view === "annual" ? data : data.slice(0, new Date().getMonth() + 1);

  return (
    <div className="rounded-xl border border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-card-foreground text-lg">{title}</h2>
        <div className="rounded-lg border border-border bg-muted/50 p-1">
          {(["annual", "monthly"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setView(option)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                view === option ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option === "annual" ? "Annually" : "Monthly"}
            </button>
          ))}
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={visibleData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dx={-10} tickFormatter={(value) => formatter?.(Number(value)) || String(value)} />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))" }}
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
              formatter={(value) => formatter?.(Number(value)) || value}
            />
            <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstName = user?.name.split(" ")[0] || "there";

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load dashboard");
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function checkIn() {
    setCheckingIn(true);
    try {
      await fetch("/api/attendance/checkin", { method: "POST" });
      await loadDashboard();
    } finally {
      setCheckingIn(false);
    }
  }

  const attendanceStatus = useMemo(() => {
    if (!data?.attendance) return "ABSENT";
    if (data.attendance.status === "ON_LEAVE") return "ON_LEAVE";
    return data.attendance.checkIn ? "PRESENT" : "ABSENT";
  }, [data?.attendance]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive shadow-sm"><TriangleAlert className="inline-block mr-2 w-5 h-5"/>{error}</div>;
  }

  if (user?.role === "ADMIN" && data) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Payroll, employee health, and cost overview.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/employees?filter=missingBank"
            className="group rounded-xl border border-destructive/20 bg-destructive/5 p-6 transition-all hover:bg-destructive/10 hover:border-destructive/30"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                <TriangleAlert className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-destructive/80">Missing Bank A/c</p>
            </div>
            <p className="text-3xl font-bold text-destructive">{data.warnings?.withoutBankAccount || 0}</p>
          </Link>
          <Link
            href="/employees?filter=missingManager"
            className="group rounded-xl border border-destructive/20 bg-destructive/5 p-6 transition-all hover:bg-destructive/10 hover:border-destructive/30"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                <TriangleAlert className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-destructive/80">Missing Manager</p>
            </div>
            <p className="text-3xl font-bold text-destructive">{data.warnings?.withoutManager || 0}</p>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {(data.lastPayruns || []).map((payrun) => (
            <Link
              key={payrun.id}
              href={`/payroll/${payrun.id}`}
              className="rounded-xl border border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:border-primary/30 group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Payrun for</p>
                  <p className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                    {months[payrun.month - 1]} {payrun.year}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <CreditCard className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <p className="text-sm text-muted-foreground font-medium">{payrun._count.payslips} Payslips Generated</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <ChartCard
            title="Employer Cost"
            data={data.employerCost || []}
            dataKey="total"
            color="#6B46C1"
            formatter={money}
          />
          <ChartCard
            title="Employee Count"
            data={data.employeeCount || []}
            dataKey="count"
            color="#9CA3AF"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-8">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{formatDate(data?.today || new Date())}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Welcome back, {firstName}</h1>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Today&apos;s attendance status</p>
            <Badge variant="outline" className={cn("px-3 py-1 font-medium", statusStyles[attendanceStatus])}>
              {attendanceStatus.replace("_", " ")}
            </Badge>
          </div>
          {attendanceStatus === "ABSENT" && (
            <Button onClick={checkIn} disabled={checkingIn} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm px-6 h-11">
              {checkingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
              Check IN
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          <h2 className="mb-6 flex items-center gap-2 font-semibold text-card-foreground text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Recent Time Off
          </h2>
          <div className="space-y-3">
            {(data?.recentTimeOff || []).length === 0 ? (
              <div className="py-8 text-center rounded-lg border border-dashed border-border bg-muted/30">
                <p className="text-sm text-muted-foreground">No recent requests.</p>
              </div>
            ) : (
              data?.recentTimeOff?.map((request) => (
                <div key={request.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-background p-4 hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{request.leaveType}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(request.startDate)} - {formatDate(request.endDate)}</p>
                  </div>
                  <Badge variant="outline" className={cn("font-medium", statusStyles[request.status])}>{request.status}</Badge>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          <h2 className="mb-6 flex items-center gap-2 font-semibold text-card-foreground text-lg">
            <CreditCard className="h-5 w-5 text-primary" />
            Recent Payslips
          </h2>
          <div className="space-y-3">
            {(data?.recentPayslips || []).length === 0 ? (
              <div className="py-8 text-center rounded-lg border border-dashed border-border bg-muted/30">
                <p className="text-sm text-muted-foreground">No payslips yet.</p>
              </div>
            ) : (
              data?.recentPayslips?.map((payslip) => (
                <div key={payslip.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-background p-4 hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {months[payslip.payrun.month - 1]} {payslip.payrun.year}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Gross {money(payslip.grossPay)}</p>
                  </div>
                  <p className="font-semibold text-foreground">{money(payslip.netPay)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
