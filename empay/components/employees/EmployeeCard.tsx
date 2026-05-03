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
  ADMIN: "bg-[#fdecea] text-[#dc3545] border-[#dc3545]/25 hover:bg-[#fdecea]",
  HR_OFFICER: "bg-[#e8f7ff] text-[#1bb6f9] border-[#1bb6f9]/25 hover:bg-[#e8f7ff]",
  PAYROLL_OFFICER: "bg-[#edf7ef] text-[#28a745] border-[#28a745]/25 hover:bg-[#edf7ef]",
  EMPLOYEE: "bg-[#ede7f6] text-[#6c757d] border-primary/25 hover:bg-[#ede7f6]",
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
      color: "bg-[#28a745]",
      ring: "ring-[#28a745]/30",
    },
    ABSENT: {
      label: "Absent",
      color: "bg-[#fbb130]",
      ring: "ring-[#fbb130]/30",
    },
    ON_LEAVE: {
      label: "On Leave",
      color: "bg-[#1bb6f9]",
      ring: "ring-[#1bb6f9]/30",
    },
  }[employee.todayStatus];

  return (
    <div
      onClick={() => router.push(`/employees/${employee.id}`)}
      className="group relative bg-card shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-border rounded-2xl p-5 cursor-pointer
        hover:bg-muted/30 hover:border-primary/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] 
        transition-all duration-300 hover:-translate-y-1"
    >
      {/* Status indicator */}
      <div className={cn(
        "absolute top-4 right-4 w-2.5 h-2.5 rounded-full ring-4",
        statusConfig.color,
        statusConfig.ring
      )} title={statusConfig.label} />

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white font-bold text-lg shadow-[0_1px_4px_rgba(113,75,103,0.10)]  shrink-0 overflow-hidden">
          {employee.profilePhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={employee.profilePhoto} alt={employee.name} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#1a1c24] truncate group-hover:text-primary transition-colors">
            {employee.name}
          </p>
          <p className="text-xs text-[#6c757d] truncate mt-0.5">{employee.email}</p>
        </div>
      </div>

      {/* Department & Role */}
      <div className="flex items-center gap-2 flex-wrap">
        {employee.department && (
          <span className="text-xs text-[#6c757d] bg-[#faf8ff] px-2 py-0.5 rounded-md border border-[#e5e7eb]">
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
      <div className="mt-3 pt-3 border-t border-[#ede7f6]">
        <div className="flex items-center gap-1.5">
          {employee.todayStatus === "ON_LEAVE" ? (
            <span className="text-base">✈️</span>
          ) : (
            <div className={cn("w-1.5 h-1.5 rounded-full", statusConfig.color)} />
          )}
          <span className={cn(
            "text-xs font-medium",
            employee.todayStatus === "PRESENT" ? "text-[#28a745]" :
            employee.todayStatus === "ON_LEAVE" ? "text-[#1bb6f9]" :
            "text-[#b26f00]"
          )}>
            {statusConfig.label} Today
          </span>
        </div>
      </div>
    </div>
  );
}
