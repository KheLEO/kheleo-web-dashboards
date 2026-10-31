"use client";
import { useEffect, useRef, useState } from "react";
import { HeartPulse, Thermometer, Droplets } from "lucide-react";
import { useSession } from "@/features/auth/session-provider";
import { MetricCard } from "@/components/shared/metric-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/shared/async-state";
import { VitalsChart } from "@/features/safety/vitals-chart";
import { telemetryResultSchema, type TelemetryResponse, classifyVitals } from "@/contracts/safety";
import { asApiError } from "@/lib/api/errors";
import { sendSimulatedTelemetry } from "@/features/safety/api";
import { useWearable } from "./use-wearable";
import { BluetoothSource } from "./bluetooth-source.client";
import { SimulatorSource } from "./simulator-source.client";
import { SimulatorControls } from "./simulator-controls";
import { TelemetryDispatcher } from "./telemetry-dispatcher";
export function WearablePanel() {
  const wearable = useWearable();
  const session = useSession();
  const [virtualDevice, setVirtualDevice] = useState<string | null>(null);
  const [ingestion, setIngestion] = useState<TelemetryResponse | null>(null);
  const [ingest, setIngest] = useState(false);
  const [failure, setFailure] = useState<Error | null>(null);
  const dispatcher = useRef<TelemetryDispatcher | null>(null);
  useEffect(() => {
    if (!ingest || !session.capabilities.simulatorIngestion) return;
    const next = new TelemetryDispatcher(
      async (operation) => {
        const result = telemetryResultSchema.parse(await sendSimulatedTelemetry(operation));
        setIngestion(result);
        return result;
      },
      (error) => setFailure(asApiError(error)),
    );
    dispatcher.current = next;
    return () => {
      next.stop();
      dispatcher.current = null;
    };
  }, [ingest, session.capabilities.simulatorIngestion]);
  const reading = wearable.latest;
  useEffect(() => {
    if (
      !ingest ||
      !dispatcher.current ||
      !reading ||
      reading.source !== "simulator" ||
      reading.spo2 === null ||
      reading.skinTemperature === null
    )
      return;
    dispatcher.current.push({
      athlete_id: session.user.id,
      heart_rate: reading.heartRate,
      spo2: reading.spo2,
      skin_temperature: reading.skinTemperature,
      timestamp: reading.timestamp,
    });
  }, [reading, ingest, session.user.id]);
  const severity =
    reading && reading.spo2 !== null && reading.skinTemperature !== null
      ? classifyVitals({
          heart_rate: reading.heartRate,
          spo2: reading.spo2,
          skin_temperature: reading.skinTemperature,
        })
      : null;
  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Connect a heart-rate monitor</h2>
          <Badge className="border-border bg-secondary text-muted-foreground">
            {wearable.status}
          </Badge>
        </div>
        <p className="mb-5 max-w-2xl text-sm leading-6 text-muted-foreground">
          Use a compatible Bluetooth heart-rate device. The standard heart-rate service supplies no
          SpO₂ or skin temperature. Those values remain unavailable and real ingestion stays
          disabled.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={wearable.status === "connecting"}
            onClick={() => {
              setVirtualDevice(null);
              setIngest(false);
              setIngestion(null);
              void wearable.connect(new BluetoothSource());
            }}
          >
            Connect Bluetooth device
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              wearable.stop();
              setIngest(false);
              setVirtualDevice(null);
              setIngestion(null);
            }}
          >
            Disconnect / stop
          </Button>
        </div>
        {wearable.error && (
          <div className="mt-4">
            <ErrorState error={wearable.error} />
          </div>
        )}
      </Card>
      <div className="grid gap-5 sm:grid-cols-3">
        <MetricCard
          icon={HeartPulse}
          label="Heart rate"
          value={reading ? `${reading.heartRate} bpm` : "Unavailable"}
          detail={
            reading
              ? `${reading.source === "simulator" ? "Simulated" : "Hardware"} reading`
              : "Connect a source to begin"
          }
        />
        <MetricCard
          icon={Droplets}
          label="SpO₂"
          value={reading?.spo2 != null ? `${reading.spo2}%` : "Unavailable"}
          detail={
            reading?.source === "simulator"
              ? "Simulated oxygen saturation"
              : "Additional hardware service required"
          }
        />
        <MetricCard
          icon={Thermometer}
          label="Skin temperature"
          value={reading?.skinTemperature != null ? `${reading.skinTemperature}°C` : "Unavailable"}
          detail={
            reading?.source === "simulator"
              ? "Simulated skin temperature"
              : "Additional hardware service required"
          }
        />
      </div>
      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <h2 className="font-semibold">Biometric simulator</h2>
          <Badge>Simulated data</Badge>
          {severity && (
            <Badge
              className={
                severity === "CRITICAL"
                  ? "border-destructive bg-destructive/10 text-foreground"
                  : ""
              }
            >
              {severity}
            </Badge>
          )}
        </div>
        <p className="mb-5 text-sm leading-6 text-muted-foreground">
          Local preview only unless an isolated staging deployment explicitly enables ingestion.
          Simulation cannot pause a real match.
        </p>
        <div className="mb-5 flex flex-wrap gap-3">
          {["Galaxy Watch", "Fitness Band"].map((device) => (
            <Button
              variant="secondary"
              key={device}
              onClick={() => {
                wearable.stop();
                setIngest(false);
                setIngestion(null);
                setVirtualDevice(device);
              }}
            >
              Pair virtual {device}
            </Button>
          ))}
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          {virtualDevice
            ? `Virtual ${virtualDevice} paired locally · simulated data only`
            : "Pair a virtual device to enable simulator controls."}
        </p>
        <SimulatorControls
          disabled={!virtualDevice || wearable.status === "connecting"}
          start={(scenario) => {
            void wearable.connect(new SimulatorSource(scenario));
          }}
        />
        {session.capabilities.simulatorIngestion && (
          <label className="mt-5 flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={ingest}
              onChange={(event) => {
                setFailure(null);
                setIngest(event.target.checked);
              }}
            />
            Send simulated readings to isolated staging
          </label>
        )}
        <VitalsChart readings={wearable.readings} />
        <p role="status" className="mt-4 text-xs">
          {ingestion
            ? `Backend ingestion status: ${ingestion.status}${ingestion.status === "MATCH_PAUSED" ? " — directive only; no match context supplied" : ""}`
            : "No backend ingestion confirmed. Local severity labels are previews."}
        </p>
        {failure && (
          <div className="mt-4">
            <ErrorState
              error={failure}
              retry={() => {
                setFailure(null);
                dispatcher.current?.retry();
              }}
            />
          </div>
        )}
        {wearable.status === "idle" && (
          <p className="mt-3 text-xs text-muted-foreground">
            Source stopped. Any displayed readings are historical, not live.
          </p>
        )}
      </Card>
      {severity === "CRITICAL" && reading?.source === "simulator" && (
        <Alert danger>
          SIMULATED CRITICAL READING — mandatory rest directive preview. No production match has
          been paused.
        </Alert>
      )}
    </div>
  );
}
