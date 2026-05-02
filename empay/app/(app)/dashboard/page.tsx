import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import {
  Users,
  Clock,
  Calendar,
  TrendingUp,
  UserCheck,
  UserX,
  Plane,
} from "lucide-react";

async function getDashboardData() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalEmployees,
    presentToday,
    onLeaveToday,
    pendingLeaves,
    newThisMonth,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.attendance.count({
      where: {
        date: { gte: startOfDay, lt: endOfDay },
        checkIn: { not: null },
      },
    }),
    prisma.timeOffRequest.count({
      where: {
        status: "APPROVED",
        startDate: { lte: endOfDay },
        endDate: { gte: startOfDay },
      },
    }),
    prisma.timeOffRequest.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
  ]);

  const absentToday = totalEmployees - presentToday - onLeaveToday;

  return {
    totalEmployees,
    presentToday,
    onLeaveToday,
    absentToday: Math.max(0, absentToday),
    pendingLeaves,
    newThisMonth,
  };
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("empay_token")?.value;
  if (!token) redirect("/sign-in");

  const payload = verifyToken(token);
  if (!payload) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { name: true, role: true },
  });

  if (!user) redirect("/sign-in");

  const stats = await getDashboardData();

  const statCards = [
    {
      label: "Total Employees",
      value: stats.totalEmployees,
      icon: Users,
      color: "from-indigo-500 to-violet-600",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
      textColor: "text-indigo-400",
    },
    {
      label: "Present Today",
      value: stats.presentToday,
      icon: UserCheck,
      color: "from-emerald-500 to-teal-600",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      textColor: "text-emerald-400",
    },
    {
      label: "Absent Today",
      value: stats.absentToday,
      icon: UserX,
      color: "from-amber-500 to-orange-600",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      textColor: "text-amber-400",
    },
    {
      label: "On Leave",
      value: stats.onLeaveToday,
      icon: Plane,
      color: "from-blue-500 to-cyan-600",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      textColor: "text-blue-400",
    },
    {
      label: "Pending Leaves",
      value: stats.pendingLeaves,
      icon: Calendar,
      color: "from-purple-500 to-pink-600",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      textColor: "text-purple-400",
    },
    {
      label: "New This Month",
      value: stats.newThisMonth,
      icon: TrendingUp,
      color: "from-rose-500 to-red-600",
      bg: "bg-rose-500/10",
      border: "border-rose-500/20",
      textColor: "text-rose-400",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold text-slate-100">
          Good {getGreeting()},{" "}
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            {user.name.split(" ")[0]}
          </span>{" "}
          👋
        </h1>
        <p className="text-slate-400 mt-1">
          Here&apos;s what&apos;s happening with your team today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`${stat.bg} border ${stat.border} rounded-2xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform duration-200`}
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg shrink-0`}
              >
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">{stat.label}</p>
                <p className={`text-3xl font-bold ${stat.textColor}`}>
                  {stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Attendance breakdown bar */}
      <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6">
        <h2 className="text-slate-100 font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-400" />
          Today&apos;s Attendance Overview
        </h2>
        <div className="space-y-3">
          {[
            { label: "Present", value: stats.presentToday, total: stats.totalEmployees, color: "bg-emerald-500" },
            { label: "Absent", value: stats.absentToday, total: stats.totalEmployees, color: "bg-amber-500" },
            { label: "On Leave", value: stats.onLeaveToday, total: stats.totalEmployees, color: "bg-blue-500" },
          ].map((row) => {
            const pct = stats.totalEmployees > 0 ? (row.value / stats.totalEmployees) * 100 : 0;
            return (
              <div key={row.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{row.label}</span>
                  <span className="text-slate-300 font-medium">
                    {row.value} / {row.total}
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${row.color} rounded-full transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick actions placeholder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border border-indigo-500/30 rounded-2xl p-6">
          <h3 className="text-slate-100 font-semibold mb-2">Quick Actions</h3>
          <p className="text-slate-400 text-sm">
            More features coming soon — Attendance tracking, Payroll generation, and Reporting modules.
          </p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6">
          <h3 className="text-slate-100 font-semibold mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            Pending Approvals
          </h3>
          <p className="text-4xl font-bold text-purple-400">{stats.pendingLeaves}</p>
          <p className="text-slate-400 text-sm mt-1">leave requests awaiting review</p>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
