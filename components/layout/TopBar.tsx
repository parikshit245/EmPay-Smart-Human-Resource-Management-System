"use client";

import { useRouter } from "next/navigation";
import { Bell, Search, LogOut, User, ChevronDown, Menu, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useUser } from "@/lib/UserContext";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  onSearch?: (query: string) => void;
  onMenuClick?: () => void;
}

interface EmployeeResult {
  id: string;
  name: string;
  email: string;
  loginId: string;
  department: string | null;
}

export default function TopBar({ onSearch, onMenuClick }: TopBarProps) {
  const router = useRouter();
  const { user } = useUser();
  const [searchValue, setSearchValue] = useState("");
  const [results, setResults] = useState<EmployeeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const initials = user?.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  const handleLogout = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/sign-in");
    router.refresh();
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    onSearch?.(e.target.value);
  };

  useEffect(() => {
    const query = searchValue.trim();
    if (!query) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timeout = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/employees?compact=1&search=${encodeURIComponent(query)}`);
        const json = await res.json();
        setResults(res.ok ? json.data.employees || [] : []);
      } finally {
        setSearching(false);
        setShowResults(true);
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchValue]);

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!searchBoxRef.current?.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header 
      className={cn(
        "fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between px-4 lg:left-64 lg:px-6 transition-all duration-200 bg-sidebar",
        isScrolled ? "shadow-sm border-b border-border" : "border-b border-transparent"
      )}
    >
      {/* Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
      <div ref={searchBoxRef} className="relative mx-3 w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={handleSearch}
          onFocus={() => setShowResults(true)}
          placeholder="Search employees..."
          className="pl-9 bg-muted border-transparent text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 h-9 transition-colors"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {showResults && searchValue.trim() && (
          <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-border bg-popover shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
            {results.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">No employees found.</p>
            ) : (
              results.slice(0, 6).map((employee) => (
                <button
                  key={employee.id}
                  onClick={() => {
                    setShowResults(false);
                    setSearchValue("");
                    router.push(`/employees/${employee.id}`);
                  }}
                  className="block w-full px-4 py-3 text-left hover:bg-muted transition-colors"
                >
                  <p className="text-sm font-medium text-foreground">{employee.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {employee.loginId} · {employee.department || employee.email}
                  </p>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
        </button>

        {/* Avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted transition-all">
              <Avatar className="w-8 h-8">
                {user?.profilePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.profilePhoto} alt={user.name} className="rounded-full object-cover" />
                ) : (
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="text-sm text-foreground font-medium hidden sm:block">
                {user?.name?.split(" ")[0]}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 bg-popover border-border text-popover-foreground"
          >
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              className="cursor-pointer hover:bg-muted focus:bg-muted gap-2"
              onClick={() => router.push(`/employees/${user?.id}`)}
            >
              <User className="w-4 h-4" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              className="cursor-pointer hover:bg-destructive/10 focus:bg-destructive/10 text-destructive gap-2"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
