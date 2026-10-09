"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";

interface CameraCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
}

/** Live webcam preview -> snap -> confirm, then hands a File back to the
 * caller to go through the same upload pipeline a picked photo does. */
export function CameraCaptureDialog({ open, onOpenChange, onCapture }: CameraCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // Reset-then-connect on open, same shape as useMessages' reset-then-fetch
    // on id change — these mirror the dialog opening, not something already
    // derivable from props.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCapturedUrl(null);
    setError(null);
    let cancelled = false;

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
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

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Mirrored to match the preview the user just looked at (a selfie that
    // comes out reversed from what you saw reads as broken, not clever).
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
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

        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-black">
          {error ? (
            <p className="px-6 text-center text-[13.5px] text-secondary">{error}</p>
          ) : capturedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- client-only captured frame, not an optimizable asset
            <img src={capturedUrl} alt="Captured" className="h-full w-full object-contain" />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-contain transform-[scaleX(-1)]"
            />
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
