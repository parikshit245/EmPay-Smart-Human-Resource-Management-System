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
  PENDING: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  APPROVED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  REJECTED: "border-red-500/30 bg-red-500/10 text-red-300",
  PRESENT: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  ABSENT: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  ON_LEAVE: "border-blue-500/30 bg-blue-500/10 text-blue-300",
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
    <div className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-100">{title}</h2>
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-1">
          {(["annual", "monthly"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setView(option)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium",
                view === option ? "bg-indigo-500/15 text-indigo-300" : "text-slate-500"
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
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(value) => formatter?.(Number(value)) || String(value)} />
            <Tooltip
              cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
              contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8 }}
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
    return <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">{error}</div>;
  }

  if (user?.role === "ADMIN" && data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">Payroll, employee health, and cost overview.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/employees?filter=missingBank"
            className="rounded-xl border border-red-500/40 bg-red-500/10 p-5 transition hover:bg-red-500/15"
          >
            <TriangleAlert className="h-5 w-5 text-red-300" />
            <p className="mt-3 text-2xl font-bold text-red-200">{data.warnings?.withoutBankAccount || 0}</p>
            <p className="text-sm text-red-200/80">Employees without Bank A/c</p>
          </Link>
          <Link
            href="/employees?filter=missingManager"
            className="rounded-xl border border-red-500/40 bg-red-500/10 p-5 transition hover:bg-red-500/15"
          >
            <TriangleAlert className="h-5 w-5 text-red-300" />
            <p className="mt-3 text-2xl font-bold text-red-200">{data.warnings?.withoutManager || 0}</p>
            <p className="text-sm text-red-200/80">Employees without Manager</p>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {(data.lastPayruns || []).map((payrun) => (
            <Link
              key={payrun.id}
              href={`/payroll/${payrun.id}`}
              className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-5 transition hover:border-indigo-500/50"
            >
              <CreditCard className="h-5 w-5 text-indigo-300" />
              <p className="mt-3 font-semibold text-slate-100">
                Payrun for {months[payrun.month - 1]} {payrun.year}
              </p>
              <p className="text-sm text-slate-400">{payrun._count.payslips} Payslips</p>
            </Link>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ChartCard
            title="Employer Cost"
            data={data.employerCost || []}
            dataKey="total"
            color="#1A2A6C"
            formatter={money}
          />
          <ChartCard
            title="Employee Count"
            data={data.employeeCount || []}
            dataKey="count"
            color="#1E8449"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-6">
        <p className="text-sm text-slate-400">{formatDate(data?.today || new Date())}</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-100">Welcome, {firstName}</h1>
      </div>

      <div className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-400">Today&apos;s attendance</p>
            <Badge variant="outline" className={cn("mt-2", statusStyles[attendanceStatus])}>
              {attendanceStatus.replace("_", " ")}
            </Badge>
          </div>
          {attendanceStatus === "ABSENT" && (
            <Button onClick={checkIn} disabled={checkingIn} className="bg-emerald-600 text-white hover:bg-emerald-500">
              {checkingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Check IN
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-100">
            <Calendar className="h-4 w-4 text-indigo-300" />
            Recent Time Off
          </h2>
          <div className="space-y-3">
            {(data?.recentTimeOff || []).length === 0 ? (
              <p className="text-sm text-slate-400">No recent requests.</p>
            ) : (
              data?.recentTimeOff?.map((request) => (
                <div key={request.id} className="flex items-center justify-between rounded-lg bg-slate-950/50 p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{request.leaveType}</p>
                    <p className="text-xs text-slate-500">{formatDate(request.startDate)} - {formatDate(request.endDate)}</p>
                  </div>
                  <Badge variant="outline" className={statusStyles[request.status]}>{request.status}</Badge>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-100">
            <CreditCard className="h-4 w-4 text-indigo-300" />
            Recent Payslips
          </h2>
          <div className="space-y-3">
            {(data?.recentPayslips || []).length === 0 ? (
              <p className="text-sm text-slate-400">No payslips yet.</p>
            ) : (
              data?.recentPayslips?.map((payslip) => (
                <div key={payslip.id} className="flex items-center justify-between rounded-lg bg-slate-950/50 p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      {months[payslip.payrun.month - 1]} {payslip.payrun.year}
                    </p>
                    <p className="text-xs text-slate-500">Gross {money(payslip.grossPay)}</p>
                  </div>
                  <p className="font-semibold text-emerald-300">{money(payslip.netPay)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
