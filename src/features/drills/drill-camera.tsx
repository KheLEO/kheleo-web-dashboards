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
import type { DrillPreset } from "./drill-catalog";
import { PracticeSubmission } from "./practice-submission";
export function DrillCamera({ preset }: { preset?: DrillPreset }) {
  const {
    state,
    practice,
    summary,
    webcam: webcamRef,
    canvas: canvasRef,
    cameraEnabled,
    start,
    stop,
    onStream,
    onCameraError,
  } = useDrillSession(preset);
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
      {preset && (
        <Card>
          <h2 className="font-semibold">{preset.name} · form and cadence feedback</h2>
          <p className="my-3 text-sm text-muted-foreground">
            Practice range: {preset.minimum}–{preset.maximum}° at the {preset.joint}. Scoring policy
            1.0.0 requires visible joints and repeated movements within the preset cadence.
          </p>
          <div className="flex flex-wrap gap-2">
            {practice?.flags.map((flag) => (
              <span className="rounded border px-3 py-2 text-xs" key={flag}>
                {flag}
              </span>
            ))}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            {Object.entries(practice?.angles ?? {}).map(([name, value]) => (
              <div key={name}>
                <dt>{name.replaceAll("_", " ")}</dt>
                <dd className="mt-1 text-primary">{value.toFixed(1)}°</dd>
              </div>
            ))}
          </dl>
          <PracticeSubmission key={summary?.timestamp ?? "pending"} summary={summary} />
        </Card>
      )}
      {!preset && <Alert>Select a sport drill to record a scored session.</Alert>}
    </div>
  );
}
