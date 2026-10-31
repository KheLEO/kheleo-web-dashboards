"use client";
import Webcam from "react-webcam";
import { Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { useBrowserCapabilities } from "@/hooks/use-browser-capabilities";
import { useDrillSession } from "./use-drill-session";
import { LandmarkOverlay } from "./landmark-overlay";
import { DrillSummary } from "./drill-summary";
import { scoringPolicy } from "./scoring-policy";
export function DrillCamera() {
  const {
    state,
    webcam: webcamRef,
    canvas: canvasRef,
    cameraEnabled,
    start,
    stop,
    onStream,
    onCameraError,
  } = useDrillSession();
  const capabilities = useBrowserCapabilities();
  return (
    <div className="space-y-6">
      <Alert>{scoringPolicy.reason}</Alert>
      <Card>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-semibold">Private movement tracking</h2>
          <div className="flex gap-2">
            <Button
              onClick={start}
              disabled={!capabilities.camera || !capabilities.worker || cameraEnabled}
            >
              <Camera size={16} />
              Start camera
            </Button>
            <Button onClick={stop} variant="secondary" disabled={!cameraEnabled}>
              <CameraOff size={16} />
              Stop
            </Button>
          </div>
        </div>
        <div className="relative mx-auto aspect-[4/3] w-full max-w-3xl overflow-hidden rounded-lg border bg-background">
          {cameraEnabled ? (
            <>
              <Webcam
                ref={webcamRef}
                audio={false}
                mirrored={false}
                videoConstraints={{ width: 640, height: 480, facingMode: "user", frameRate: 15 }}
                onUserMedia={onStream}
                onUserMediaError={onCameraError}
                className="h-full w-full object-contain"
              />
              <LandmarkOverlay canvasRef={canvasRef} />
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-muted-foreground">
              <Camera size={34} />
              <p className="text-sm">Camera is off. Video stays on your device.</p>
            </div>
          )}
        </div>
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          {state.feedback}
        </p>
        {(!capabilities.camera || !capabilities.worker) && (
          <p className="mt-3 text-xs text-muted-foreground">
            Camera and worker support require a compatible browser and a secure context.
          </p>
        )}
        {state.error && (
          <div className="mt-4">
            <Alert danger>{state.error}</Alert>
          </div>
        )}
      </Card>
      <DrillSummary state={state} />
      <Card>
        <h2 className="font-semibold">GTI submission</h2>
        <p className="my-3 text-sm leading-6 text-muted-foreground">
          Pose tracking and joint angles are available. Calibrated sport-specific scoring is
          required before results can be submitted to your permanent record.
        </p>
        <Button disabled>Awaiting scoring calibration</Button>
      </Card>
    </div>
  );
}
