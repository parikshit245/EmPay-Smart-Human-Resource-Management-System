"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, ShieldOff, Scan, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FaceCamera } from "@/components/face/FaceCamera";
import { useUser } from "@/lib/UserContext";
import { cn } from "@/lib/utils";

export default function FaceEnrollmentPage() {
  const { user } = useUser();
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    checkEnrollmentStatus();
  }, []);

  async function checkEnrollmentStatus() {
    try {
      const res = await fetch("/api/face/status");
      if (res.ok) {
        const json = await res.json();
        setIsEnrolled(json.enrolled);
      }
    } catch {
      setIsEnrolled(false);
    }
  }

  async function handleFaceCaptured(descriptor: Float32Array) {
    setShowCamera(false);
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/face/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptor: Array.from(descriptor) }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Enrollment failed");

      setIsEnrolled(true);
      setFeedback({ type: "success", message: "Your face has been enrolled successfully!" });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Enrollment failed. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveFace() {
    setRemoving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/face/enroll", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to remove face data");

      setIsEnrolled(false);
      setFeedback({ type: "success", message: "Face data removed successfully." });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to remove face data.",
      });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      {showCamera && (
        <FaceCamera
          mode="enroll"
          onSuccess={handleFaceCaptured}
          onClose={() => setShowCamera(false)}
        />
      )}

      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Scan className="h-6 w-6 text-indigo-400" />
            Face Recognition Setup
          </h1>
          <p className="mt-1 text-slate-400 text-sm">
            Enroll your face to enable biometric check-in and check-out authentication.
          </p>
        </div>

        {/* Status card */}
        <Card className="border-slate-800/70 bg-slate-900/70">
          <CardHeader className="border-b border-slate-800/70 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-100 text-base">Biometric Status</CardTitle>
              {isEnrolled === null ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : isEnrolled ? (
                <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 border">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Enrolled
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                  Not Enrolled
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-start gap-4 rounded-lg border border-slate-800/60 bg-slate-950/40 p-4">
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border",
                  isEnrolled
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-slate-700 bg-slate-800/50"
                )}
              >
                {isEnrolled ? (
                  <ShieldCheck className="h-6 w-6 text-emerald-400" />
                ) : (
                  <ShieldOff className="h-6 w-6 text-slate-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-200">
                  {user?.name ?? "Your Account"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isEnrolled
                    ? "Your face is enrolled. You can now use face recognition for attendance."
                    : "No face enrolled yet. Use the button below to register your face."}
                </p>
                {isEnrolled && (
                  <p className="text-xs text-emerald-400/80 mt-1">
                    128-dimensional face descriptor stored securely in the database.
                  </p>
                )}
              </div>
            </div>

            {/* Feedback */}
            {feedback && (
              <div
                className={cn(
                  "rounded-lg border p-3 text-sm",
                  feedback.type === "success"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-red-500/30 bg-red-500/10 text-red-300"
                )}
              >
                {feedback.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() => setShowCamera(true)}
                disabled={loading || removing}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Enrolling…</>
                ) : (
                  <><Scan className="h-4 w-4 mr-2" />{isEnrolled ? "Re-enroll Face" : "Enroll My Face"}</>
                )}
              </Button>
              {isEnrolled && (
                <Button
                  variant="outline"
                  onClick={handleRemoveFace}
                  disabled={loading || removing}
                  className="border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200"
                >
                  {removing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <><Trash2 className="h-4 w-4 mr-1.5" />Remove</>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              title: "Secure Storage",
              description: "Your face is stored as an encrypted 128-point mathematical vector, never as a photo.",
              icon: ShieldCheck,
              color: "text-indigo-400",
              bg: "bg-indigo-500/10 border-indigo-500/30",
            },
            {
              title: "Role-Based Access",
              description: "All roles (Admin, HR, Payroll, Employee) must verify their face for attendance.",
              icon: Scan,
              color: "text-emerald-400",
              bg: "bg-emerald-500/10 border-emerald-500/30",
            },
            {
              title: "Privacy First",
              description: "Face data never leaves your server. No third-party AI services are used.",
              icon: ShieldOff,
              color: "text-amber-400",
              bg: "bg-amber-500/10 border-amber-500/30",
            },
          ].map((info) => (
            <div
              key={info.title}
              className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-4 space-y-2"
            >
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", info.bg)}>
                <info.icon className={cn("h-4 w-4", info.color)} />
              </div>
              <p className="text-sm font-semibold text-slate-200">{info.title}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{info.description}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
