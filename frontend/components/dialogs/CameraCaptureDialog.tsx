"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { cn } from "@/lib/cn";

type Facing = "user" | "environment";

interface CameraCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
}

/** Live camera preview -> snap -> confirm, then hands a File back to the
 * caller to go through the same upload pipeline a picked photo does. */
export function CameraCaptureDialog({ open, onOpenChange, onCapture }: CameraCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Kept across opens, so the camera you last used is the one that opens.
  const [facing, setFacing] = useState<Facing>("user");
  const [canFlip, setCanFlip] = useState(false);
  // Selfies are mirrored so they match what you saw; the back camera isn't.
  const mirror = facing === "user";

  useEffect(() => {
    if (!open) return;
    // Reset-then-connect on open or camera switch, same shape as
    // useMessages' reset-then-fetch on id change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCapturedUrl(null);
    setError(null);
    let cancelled = false;

    navigator.mediaDevices
      // "ideal", not exact: a laptop with one webcam has no back camera, and
      // an exact constraint would fail instead of falling back to it.
      ?.getUserMedia({ video: { facingMode: { ideal: facing } }, audio: false })
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        // Only meaningful after permission is granted: before that, browsers
        // report at most one camera regardless of how many there are.
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) setCanFlip(devices.filter((d) => d.kind === "videoinput").length > 1);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : "";
        const message =
          name === "NotAllowedError"
            ? "Camera access is blocked for this site — click the camera icon in your address bar, allow it, then reload the page."
            : name === "NotFoundError"
              ? "No camera was found on this device."
              : name === "NotReadableError"
                ? "Your camera is in use by another app (another tab, Zoom, Teams, etc.) — close it and try again."
                : "Couldn't access your camera — check your browser's camera permission.";
        setError(message);
      });

    // Runs before the next camera opens too — many phones can't have both
    // cameras open at once, so the old stream must stop first.
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, facing]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (mirror) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    setCapturedUrl(canvas.toDataURL("image/jpeg", 0.9));
  };

  const usePhoto = async () => {
    if (!capturedUrl) return;
    const res = await fetch(capturedUrl);
    const blob = await res.blob();
    onCapture(new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={480}>
        <DialogTitle className="mb-3">Take a photo</DialogTitle>

        {/* Portrait on phones (whose cameras stream portrait), landscape on
            laptops — a fixed 16:9 box made phone previews tiny. */}
        <div className="relative flex aspect-3/4 items-center justify-center overflow-hidden rounded-lg bg-black sm:aspect-video">
          {error ? (
            <p className="px-6 text-center text-[13.5px] text-secondary">{error}</p>
          ) : (
            <>
              {/* Stays mounted under the captured photo: unmounting it lost
                  the stream, so Retake came back to a black screen. */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn("h-full w-full object-contain", mirror && "-scale-x-100")}
              />
              {capturedUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- client-only captured frame, not an optimizable asset
                <img
                  src={capturedUrl}
                  alt="Captured"
                  className="absolute inset-0 h-full w-full bg-black object-contain"
                />
              )}
              {canFlip && !capturedUrl && (
                <button
                  type="button"
                  aria-label={facing === "user" ? "Switch to back camera" : "Switch to front camera"}
                  onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
                  className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm active:scale-95"
                >
                  <SwitchCamera size={20} />
                </button>
              )}
            </>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          {capturedUrl ? (
            <>
              <Button variant="secondary" onClick={() => setCapturedUrl(null)}>
                <RotateCcw size={15} />
                Retake
              </Button>
              <Button variant="primary" onClick={usePhoto}>
                Use photo
              </Button>
            </>
          ) : (
            <Button variant="primary" disabled={!!error} onClick={capture}>
              <Camera size={15} />
              Capture
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
