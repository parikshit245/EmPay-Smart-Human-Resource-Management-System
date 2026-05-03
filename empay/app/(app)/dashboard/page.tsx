"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Calendar, CreditCard, Loader2, LogIn, LogOut, Scan, TriangleAlert } from "lucide-react";
import { FaceCamera } from "@/components/face/FaceCamera";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Backlight } from "@/components/ui/backlight";
import { TypingAnimation } from "@/components/ui/typing-animation";
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
    <Backlight className="w-full h-full">
      <div className="rounded-2xl border border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1">
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
    </Backlight>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [now, setNow] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [faceEnrolled, setFaceEnrolled] = useState<boolean | null>(null);
  const [showFaceCamera, setShowFaceCamera] = useState(false);
  const [pendingAction, setPendingAction] = useState<"checkin" | "checkout" | null>(null);

  const firstName = user?.name.split(" ")[0] || "there";

  useEffect(() => {
    loadDashboard();
    fetch("/api/face/status")
      .then((r) => r.json())
      .then((j) => setFaceEnrolled(j.enrolled ?? false))
      .catch(() => setFaceEnrolled(false));
  }, []);

  // Live clock — ticks every 30s for elapsed display
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
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

  // Open face camera for the given action
  function requestAction(action: "checkin" | "checkout") {
    if (faceEnrolled === false) {
      setError("Face not enrolled. Go to Face Recognition Setup to enroll first.");
      return;
    }
    setError(null);
    setPendingAction(action);
    setShowFaceCamera(true);
  }

  // Called after FaceCamera captures a descriptor
  const handleFaceVerified = useCallback(async (descriptor: Float32Array) => {
    setShowFaceCamera(false);
    if (!pendingAction) return;

    setActionLoading(true);
    setError(null);
    try {
      // Step 1: verify face identity
      const verifyRes = await fetch("/api/face/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptor: Array.from(descriptor) }),
      });
      const verifyJson = await verifyRes.json();

      if (verifyJson.code === "NO_FACE_ENROLLED") {
        setFaceEnrolled(false);
        throw new Error("No face enrolled. Please enroll in Face Recognition Setup.");
      }
      if (!verifyRes.ok || !verifyJson.verified) {
        throw new Error(
          `Face verification failed (distance: ${verifyJson.distance ?? "?"}).  Please try again.`
        );
      }

      // Step 2: mark attendance
      const action = pendingAction;
      setPendingAction(null);
      const attRes = await fetch(`/api/attendance/${action}`, { method: "POST" });
      const attJson = await attRes.json();
      if (!attRes.ok) throw new Error(attJson.error || "Attendance update failed.");

      // Step 3: refresh dashboard data
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }, [pendingAction]); // eslint-disable-line react-hooks/exhaustive-deps

  // true = clocked in (checkIn set, no checkOut yet)
  const checkedIn = Boolean(
    data?.attendance?.checkIn && !data?.attendance?.checkOut
  );

  // Elapsed time since check-in
  const elapsed = useMemo(() => {
    if (!data?.attendance?.checkIn || data?.attendance?.checkOut) return null;
    const diff = now.getTime() - new Date(data.attendance.checkIn).getTime();
    const hours = Math.floor(diff / 3_600_000);
    const mins = Math.floor((diff % 3_600_000) / 60_000);
    return `${hours}h ${mins}m`;
  }, [now, data?.attendance]);

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
              className="rounded-2xl border border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:border-primary/30 group"
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
            color="var(--primary)"
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
      <div className="rounded-2xl border border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-8 min-h-[120px] transition-all duration-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{formatDate(data?.today || new Date())}</p>
        <TypingAnimation
          as="h1"
          delay={400}
          className="mt-2 text-3xl font-bold tracking-tight text-primary"
        >
          {`Welcome back, ${firstName}`}
        </TypingAnimation>
      </div>

      {/* Face Camera overlay */}
      {showFaceCamera && (
        <FaceCamera
          mode="verify"
          onSuccess={handleFaceVerified}
          onClose={() => {
            setShowFaceCamera(false);
            setPendingAction(null);
          }}
        />
      )}

      <div className="rounded-2xl border border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Today&apos;s attendance status</p>
            <Badge variant="outline" className={cn("px-3 py-1 font-medium", statusStyles[attendanceStatus])}>
              {attendanceStatus.replace("_", " ")}
            </Badge>
            {checkedIn && elapsed && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Clocked in · <span className="font-medium text-foreground">{elapsed} elapsed</span>
              </p>
            )}
            {faceEnrolled && (
              <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Scan className="h-3 w-3" /> Face recognition required
              </p>
            )}
          </div>

          {attendanceStatus !== "ON_LEAVE" && (
            checkedIn ? (
              <Button
                onClick={() => requestAction("checkout")}
                disabled={actionLoading}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-sm px-6 h-11"
              >
                {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                Check OUT
              </Button>
            ) : (
              <Button
                onClick={() => requestAction("checkin")}
                disabled={actionLoading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm px-6 h-11"
              >
                {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                Check IN
              </Button>
            )
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1">
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

        <div className="rounded-2xl border border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1">
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
