"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Clock,
  Calendar,
  CreditCard,
  BarChart3,
  Settings,
  Shield,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/UserContext";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: BarChart3, roles: ["ADMIN", "EMPLOYEE", "HR_OFFICER", "PAYROLL_OFFICER"] },
  { label: "Employees", href: "/employees", icon: Users, roles: ["ADMIN", "EMPLOYEE", "HR_OFFICER", "PAYROLL_OFFICER"] },
  { label: "Attendance", href: "/attendance", icon: Clock, roles: ["ADMIN", "EMPLOYEE", "HR_OFFICER", "PAYROLL_OFFICER"] },
  { label: "Time Off", href: "/time-off", icon: Calendar, roles: ["ADMIN", "EMPLOYEE", "HR_OFFICER", "PAYROLL_OFFICER"] },
  { label: "Payroll", href: "/payroll", icon: CreditCard, roles: ["ADMIN", "PAYROLL_OFFICER"] },
  { label: "Reports", href: "/reports", icon: BarChart3, roles: ["ADMIN", "PAYROLL_OFFICER"] },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["ADMIN"] },
];

const roleColors: Record<string, string> = {
  ADMIN: "bg-red-500/20 text-red-400 border-red-500/30",
  HR_OFFICER: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  PAYROLL_OFFICER: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  EMPLOYEE: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const roleLabels: Record<string, string> = {
  ADMIN: "Admin",
  HR_OFFICER: "HR Officer",
  PAYROLL_OFFICER: "Payroll",
  EMPLOYEE: "Employee",
};

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  const filteredNav = navItems.filter(
    (item) => !user?.role || item.roles.includes(user.role)
  );

  const initials = user?.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-slate-950 border-r border-slate-800/60">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800/60">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
          EmPay
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="px-3 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Navigation
        </p>
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-indigo-500/15 text-indigo-300 shadow-sm"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
              )}
            >
              <Icon
                className={cn(
                  "w-4.5 h-4.5 shrink-0 transition-colors",
                  isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
                )}
              />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      {user && (
        <div className="p-4 border-t border-slate-800/60">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800/40">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user.profilePhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.profilePhoto} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-100 truncate">{user.name}</p>
              <span className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
                roleColors[user.role] || roleColors.EMPLOYEE
              )}>
                {roleLabels[user.role] || user.role}
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
