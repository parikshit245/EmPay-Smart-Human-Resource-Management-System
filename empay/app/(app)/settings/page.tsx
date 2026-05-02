"use client";

import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-400" />
          Settings
        </h1>
        <p className="text-slate-400 text-sm mt-1">Manage organization configuration</p>
      </div>
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-700/40 flex items-center justify-center">
          <Settings className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-slate-100 font-semibold text-lg">Coming Soon</h2>
        <p className="text-slate-400 text-sm text-center max-w-sm">
          Organization settings will be available in the next update.
        </p>
      </div>
    </div>
  );
}
