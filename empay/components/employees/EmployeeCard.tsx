"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  name: string;
  email: string;
  loginId: string;
  role: string;
  department: string | null;
  profilePhoto: string | null;
  todayStatus: "PRESENT" | "ABSENT" | "ON_LEAVE";
}

const roleLabels: Record<string, string> = {
  ADMIN: "Admin",
  HR_OFFICER: "HR Officer",
  PAYROLL_OFFICER: "Payroll",
  EMPLOYEE: "Employee",
};

const roleColors: Record<string, string> = {
  ADMIN: "bg-red-500/15 text-red-400 border-red-500/25 hover:bg-red-500/20",
  HR_OFFICER: "bg-blue-500/15 text-blue-400 border-blue-500/25 hover:bg-blue-500/20",
  PAYROLL_OFFICER: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20",
  EMPLOYEE: "bg-slate-500/15 text-slate-400 border-slate-500/25 hover:bg-slate-500/20",
};

export default function EmployeeCard({ employee }: { employee: Employee }) {
  const router = useRouter();

  const initials = employee.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const statusConfig = {
    PRESENT: {
      label: "Present",
      color: "bg-emerald-500",
      ring: "ring-emerald-500/30",
    },
    ABSENT: {
      label: "Absent",
      color: "bg-amber-500",
      ring: "ring-amber-500/30",
    },
    ON_LEAVE: {
      label: "On Leave",
      color: "bg-blue-500",
      ring: "ring-blue-500/30",
    },
  }[employee.todayStatus];

  return (
    <div
      onClick={() => router.push(`/employees/${employee.id}`)}
      className="group relative bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5 cursor-pointer
        hover:bg-slate-800/60 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/10
        transition-all duration-300 hover:-translate-y-0.5"
    >
      {/* Status indicator */}
      <div className={cn(
        "absolute top-4 right-4 w-2.5 h-2.5 rounded-full ring-4",
        statusConfig.color,
        statusConfig.ring
      )} title={statusConfig.label} />

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/20 shrink-0 overflow-hidden">
          {employee.profilePhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={employee.profilePhoto} alt={employee.name} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-100 truncate group-hover:text-indigo-300 transition-colors">
            {employee.name}
          </p>
          <p className="text-xs text-slate-500 truncate mt-0.5">{employee.email}</p>
        </div>
      </div>

      {/* Department & Role */}
      <div className="flex items-center gap-2 flex-wrap">
        {employee.department && (
          <span className="text-xs text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50">
            {employee.department}
          </span>
        )}
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] font-medium border transition-colors",
            roleColors[employee.role] || roleColors.EMPLOYEE
          )}
        >
          {roleLabels[employee.role] || employee.role}
        </Badge>
      </div>

      {/* Status text */}
      <div className="mt-3 pt-3 border-t border-slate-800/60">
        <div className="flex items-center gap-1.5">
          {employee.todayStatus === "ON_LEAVE" ? (
            <span className="text-base">✈️</span>
          ) : (
            <div className={cn("w-1.5 h-1.5 rounded-full", statusConfig.color)} />
          )}
          <span className={cn(
            "text-xs font-medium",
            employee.todayStatus === "PRESENT" ? "text-emerald-400" :
            employee.todayStatus === "ON_LEAVE" ? "text-blue-400" :
            "text-amber-400"
          )}>
            {statusConfig.label} Today
          </span>
        </div>
      </div>
    </div>
  );
}
