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
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Scan className="h-6 w-6 text-primary" />
            Face Recognition Setup
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Enroll your face to enable biometric check-in and check-out authentication.
          </p>
        </div>

        {/* Status card */}
        <Card className="rounded-2xl border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1">
          <CardHeader className="border-b border-border p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-card-foreground text-base font-semibold">Biometric Status</CardTitle>
              {isEnrolled === null ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : isEnrolled ? (
                <Badge className="border-green-500/30 bg-green-50 text-green-700 shadow-none hover:bg-green-50">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Enrolled
                </Badge>
              ) : (
                <Badge variant="outline" className="border-yellow-500/30 bg-yellow-50 text-yellow-700 shadow-none">
                  Not Enrolled
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-4 rounded-xl border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50">
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border",
                  isEnrolled
                    ? "border-green-500/30 bg-green-50"
                    : "border-border bg-muted/50"
                )}
              >
                {isEnrolled ? (
                  <ShieldCheck className="h-6 w-6 text-green-600" />
                ) : (
                  <ShieldOff className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {user?.name ?? "Your Account"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isEnrolled
                    ? "Your face is enrolled. You can now use face recognition for attendance."
                    : "No face enrolled yet. Use the button below to register your face."}
                </p>
                {isEnrolled && (
                  <p className="text-xs text-green-600/80 mt-1 font-medium">
                    128-dimensional face descriptor stored securely in the database.
                  </p>
                )}
              </div>
            </div>

            {/* Feedback */}
            {feedback && (
              <div
                className={cn(
                  "rounded-lg border p-3 text-sm font-medium shadow-sm",
                  feedback.type === "success"
                    ? "border-green-500/30 bg-green-50 text-green-700"
                    : "border-red-500/30 bg-red-50 text-red-700"
                )}
              >
                {feedback.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-2">
              <Button
                onClick={() => setShowCamera(true)}
                disabled={loading || removing}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all duration-200 h-10"
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
                  className="border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 transition-all duration-200 h-10 shadow-sm"
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
              color: "text-primary",
              bg: "bg-primary/10 border-primary/20",
            },
            {
              title: "Role-Based Access",
              description: "All roles (Admin, HR, Payroll, Employee) must verify their face for attendance.",
              icon: Scan,
              color: "text-green-600",
              bg: "bg-green-50 border-green-200",
            },
            {
              title: "Privacy First",
              description: "Face data never leaves your server. No third-party AI services are used.",
              icon: ShieldOff,
              color: "text-yellow-600",
              bg: "bg-yellow-50 border-yellow-200",
            },
          ].map((info) => (
            <div
              key={info.title}
              className="rounded-2xl border border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 space-y-3 h-full flex flex-col transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1"
            >
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border shadow-sm", info.bg)}>
                <info.icon className={cn("h-5 w-5", info.color)} />
              </div>
              <div>
                <p className="text-sm font-semibold text-card-foreground">{info.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{info.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
