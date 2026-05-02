"use client";

import Link from "next/link";
import Image from "next/image";
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
  X,
  Scan,
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
  { label: "Face Setup", href: "/face-setup", icon: Scan, roles: ["ADMIN", "EMPLOYEE", "HR_OFFICER", "PAYROLL_OFFICER"] },
  { label: "Payroll", href: "/payroll", icon: CreditCard, roles: ["ADMIN", "PAYROLL_OFFICER"] },
  { label: "Reports", href: "/reports", icon: BarChart3, roles: ["ADMIN", "PAYROLL_OFFICER"] },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["ADMIN"] },
];

const roleColors: Record<string, string> = {
  ADMIN: "bg-destructive/10 text-destructive border-destructive/30",
  HR_OFFICER: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  PAYROLL_OFFICER: "bg-green-500/10 text-green-500 border-green-500/30",
  EMPLOYEE: "bg-primary/10 text-primary border-primary/30",
};

const roleLabels: Record<string, string> = {
  ADMIN: "Admin",
  HR_OFFICER: "HR Officer",
  PAYROLL_OFFICER: "Payroll",
  EMPLOYEE: "Employee",
};

export default function Sidebar({
  open = false,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
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
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-sidebar-border px-6 py-5">
        <Image 
          src="/models/logo-final.png" 
          alt="EmPay Logo" 
          width={36} 
          height={36} 
          className="object-contain shrink-0" 
          unoptimized
        />
        <span className="text-xl font-bold text-primary">
          EmPay
        </span>
        <button
          onClick={onClose}
          className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
              onClick={onClose}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "w-4.5 h-4.5 shrink-0 transition-colors",
                  isActive ? "text-sidebar-accent-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 text-sidebar-accent-foreground" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      {user && (
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
              {user.profilePhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.profilePhoto} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
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
