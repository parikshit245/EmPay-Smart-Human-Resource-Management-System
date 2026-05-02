"use client";

import { Calendar } from "lucide-react";

export default function TimeOffPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-indigo-400" />
          Time Off
        </h1>
        <p className="text-slate-400 text-sm mt-1">Manage leave requests and approvals</p>
      </div>
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/15 flex items-center justify-center">
          <Calendar className="w-8 h-8 text-blue-400" />
        </div>
        <h2 className="text-slate-100 font-semibold text-lg">Coming Soon</h2>
        <p className="text-slate-400 text-sm text-center max-w-sm">
          Time-off request and approval flow will be available in the next update.
        </p>
      </div>
    </div>
  );
}
