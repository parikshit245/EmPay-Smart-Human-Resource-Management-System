"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import { Camera, Loader2, X, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FaceCameraProps {
  mode: "enroll" | "verify";
  onSuccess: (descriptor: Float32Array) => void;
  onClose: () => void;
}

type CameraStatus =
  | "loading-models"
  | "starting-camera"
  | "detecting"
  | "too-many"
  | "ready"
  | "capturing"
  | "success"
  | "error";

const MODEL_URL = "/models";

let modelsLoaded = false;

async function ensureModels() {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

export function FaceCamera({ mode, onSuccess, onClose }: FaceCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [status, setStatus] = useState<CameraStatus>("loading-models");
  const [message, setMessage] = useState("Loading face detection models…");
  const [confidence, setConfidence] = useState(0);

  const stopEverything = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startDetectionLoop = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    intervalRef.current = setInterval(async () => {
      if (!video || video.paused || video.ended) return;

      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      const resized = faceapi.resizeResults(detections, displaySize);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resized);
        faceapi.draw.drawFaceLandmarks(canvas, resized);
      }

      if (detections.length === 0) {
        setStatus("detecting");
        setMessage("Position your face in the frame…");
        setConfidence(0);
      } else if (detections.length > 1) {
        setStatus("too-many");
        setMessage("Only one face allowed. Please ensure you are alone.");
        setConfidence(0);
      } else {
        const score = Math.min(100, Math.round(detections[0].detection.score * 100));
        setConfidence(score);
        setStatus("ready");
        setMessage(
          mode === "enroll"
            ? "Face detected! Click Capture to enroll."
            : "Face detected! Click Verify to authenticate."
        );
      }
    }, 200);
  }, [mode]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setStatus("loading-models");
        setMessage("Loading face detection models…");
        await ensureModels();

        if (cancelled) return;

        setStatus("starting-camera");
        setMessage("Starting camera…");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setStatus("detecting");
        setMessage("Position your face in the frame…");
        startDetectionLoop();
      } catch (err) {
        console.error(err);
        setStatus("error");
        setMessage("Could not access camera. Please allow camera permissions and try again.");
      }
    }

    init();

    return () => {
      cancelled = true;
      stopEverything();
    };
  }, [startDetectionLoop, stopEverything]);

  const handleCapture = useCallback(async () => {
    if (status !== "ready" || !videoRef.current) return;

    setStatus("capturing");
    setMessage("Analyzing face…");

    try {
      const detections = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detections) {
        setStatus("ready");
        setMessage("No face detected. Try again.");
        return;
      }

      setStatus("success");
      setMessage("Face captured successfully!");
      stopEverything();
      onSuccess(detections.descriptor);
    } catch (err) {
      console.error(err);
      setStatus("ready");
      setMessage("Capture failed. Please try again.");
    }
  }, [status, onSuccess, stopEverything]);

  const handleClose = useCallback(() => {
    stopEverything();
    onClose();
  }, [onClose, stopEverything]);

  const isLoading = status === "loading-models" || status === "starting-camera" || status === "capturing";
  const canCapture = status === "ready";
  const isSuccess = status === "success";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-700/60 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 border border-indigo-500/30">
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                {mode === "enroll" ? "Face Enrollment" : "Face Verification"}
              </h2>
              <p className="text-xs text-slate-400">
                {mode === "enroll"
                  ? "Register your face for future authentication"
                  : "Authenticate your identity to continue"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Camera area */}
        <div className="relative mx-auto mt-5 mb-4 w-[340px] h-[255px] rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
          {/* Corner guides */}
          {["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"].map((pos, i) => (
            <div
              key={i}
              className={cn(
                "absolute h-6 w-6 border-indigo-500/60 z-10",
                pos.includes("top") && pos.includes("left") && "border-t-2 border-l-2 rounded-tl-md",
                pos.includes("top") && pos.includes("right") && "border-t-2 border-r-2 rounded-tr-md",
                pos.includes("bottom") && pos.includes("left") && "border-b-2 border-l-2 rounded-bl-md",
                pos.includes("bottom") && pos.includes("right") && "border-b-2 border-r-2 rounded-br-md",
                pos
              )}
            />
          ))}

          <video
            ref={videoRef}
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover [transform:scaleX(-1)]"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full [transform:scaleX(-1)]"
          />

          {/* Overlay states */}
          {isLoading && !isSuccess && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 gap-3 z-20">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              <p className="text-xs text-slate-400 text-center px-4">{message}</p>
            </div>
          )}

          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 gap-3 z-20 p-4">
              <AlertTriangle className="h-8 w-8 text-red-400" />
              <p className="text-xs text-red-300 text-center">{message}</p>
            </div>
          )}

          {isSuccess && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/80 gap-3 z-20">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-300">{message}</p>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="mx-5 mb-4 rounded-lg border border-slate-800/70 bg-slate-900/60 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  status === "ready" && "bg-emerald-400 animate-pulse",
                  status === "detecting" && "bg-amber-400 animate-pulse",
                  status === "too-many" && "bg-red-400 animate-pulse",
                  isLoading && "bg-indigo-400 animate-pulse",
                  isSuccess && "bg-emerald-400",
                  status === "error" && "bg-red-400"
                )}
              />
              <p className="text-xs text-slate-300">{message}</p>
            </div>
            {confidence > 0 && status === "ready" && (
              <span className="text-xs font-mono text-emerald-400">{confidence}%</span>
            )}
          </div>

          {/* Confidence bar */}
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                confidence >= 80 ? "bg-emerald-500" : confidence >= 60 ? "bg-amber-500" : "bg-slate-600"
              )}
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-slate-800/70 px-5 py-4">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/70 hover:text-slate-100"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCapture}
            disabled={!canCapture}
            className={cn(
              "flex-1 font-semibold transition-all",
              mode === "enroll"
                ? "bg-indigo-600 hover:bg-indigo-500 text-white disabled:bg-slate-800 disabled:text-slate-500"
                : "bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-slate-800 disabled:text-slate-500"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Camera className="h-4 w-4 mr-1.5" />
                {mode === "enroll" ? "Capture Face" : "Verify Me"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
