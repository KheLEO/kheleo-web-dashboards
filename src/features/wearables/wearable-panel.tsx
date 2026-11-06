"use client";
import { useQueryClient } from "@tanstack/react-query";
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
import { telemetrySchema } from "@/contracts/safety";
import { sendHardwareTelemetry, sendSimulatedTelemetry } from "@/features/safety/api";
import { useWearable } from "./use-wearable";
import { BluetoothSource } from "./bluetooth-source.client";
import { SimulatorSource } from "./simulator-source.client";
import { SimulatorControls } from "./simulator-controls";
import { TelemetryDispatcher } from "./telemetry-dispatcher";
export function WearablePanel() {
  const wearable = useWearable();
  const queryClient = useQueryClient();
  const [context, setContext] = useState({ tournament_id: "", bracket_id: "", match_id: "" });
  const readingSource = wearable.latest?.source;
  const session = useSession();
  const [virtualDevice, setVirtualDevice] = useState<string | null>(null);
  const [ingestion, setIngestion] = useState<TelemetryResponse | null>(null);
  const [ingest, setIngest] = useState(false);
  const [failure, setFailure] = useState<Error | null>(null);
  const dispatcher = useRef<TelemetryDispatcher | null>(null);
  useEffect(() => {
    if (!ingest || !session.capabilities.simulatorIngestion || wearable.status !== "connected")
      return;
    let active = true;
    const next = new TelemetryDispatcher(
      async (operation) => {
        const result = telemetryResultSchema.parse(
          await (readingSource === "simulator"
            ? sendSimulatedTelemetry(operation)
            : sendHardwareTelemetry(operation)),
        );
        void queryClient.invalidateQueries({ queryKey: ["passport", session.user.id] });
        if (active) setIngestion(result);
        return result;
      },
      (error) => setFailure(asApiError(error)),
    );
    dispatcher.current = next;
    return () => {
      active = false;
      next.stop();
      dispatcher.current = null;
    };
  }, [
    ingest,
    session.capabilities.simulatorIngestion,
    readingSource,
    wearable.status,
    queryClient,
    session.user.id,
  ]);
  const reading = wearable.latest;
  useEffect(() => {
    if (
      !ingest ||
      !dispatcher.current ||
      !reading ||
      reading.spo2 === null ||
      reading.skinTemperature === null
    )
      return;
    const packet = telemetrySchema.safeParse({
      athlete_id: session.user.id,
      heart_rate: reading.heartRate,
      spo2: reading.spo2,
      skin_temperature: reading.skinTemperature,
      timestamp: reading.timestamp,
      source: reading.source === "simulator" ? "SIMULATOR" : "BLE",
      ...(reading.source === "bluetooth" ? { baseline_fields: reading.baselineFields ?? [] } : {}),
      ...Object.fromEntries(
        Object.entries(context)
          .filter(([, value]) => value.trim())
          .map(([key, value]) => [key, value.trim()]),
      ),
    });
    if (!packet.success) {
      return;
    }
    dispatcher.current.push(packet.data);
  }, [reading, ingest, session.user.id, context]);
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
          Connect a Bluetooth heart-rate device with optional pulse oximeter and thermometer
          services. A heart-rate-only strap uses labeled baselines of 98% SpO₂ and 36.8°C; those
          values are not measured.
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
          value={reading ? `${reading.heartRate} bpm` : "Awaiting reading"}
          detail={
            reading
              ? `${reading.source === "simulator" ? "Simulated" : "Hardware"} reading`
              : "Connect a source to begin"
          }
        />
        <MetricCard
          icon={Droplets}
          label="SpO₂"
          value={reading?.spo2 != null ? `${reading.spo2}%` : "Awaiting reading"}
          detail={
            reading?.source === "simulator"
              ? "Simulated oxygen saturation"
              : reading?.baselineFields?.includes("spo2")
                ? "Baseline default · not measured"
                : reading
                  ? "Oximeter measurement"
                  : "Connect an oximeter or a labeled baseline source"
          }
        />
        <MetricCard
          icon={Thermometer}
          label="Skin temperature"
          value={
            reading?.skinTemperature != null ? `${reading.skinTemperature}°C` : "Awaiting reading"
          }
          detail={
            reading?.source === "simulator"
              ? "Simulated skin temperature"
              : reading?.baselineFields?.includes("skin_temperature")
                ? "Baseline default · not measured"
                : reading
                  ? "Thermometer measurement"
                  : "Connect a thermometer or a labeled baseline source"
          }
        />
      </div>
      {session.capabilities.simulatorIngestion && (
        <Card>
          <h2 className="font-semibold">Telemetry context</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {(["tournament_id", "bracket_id", "match_id"] as const).map((field) => (
              <label key={field} className="field">
                Optional {field.replace("_id", " ID")}
                <input
                  className="control"
                  value={context[field]}
                  aria-invalid={Boolean(
                    context[field] &&
                    !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(
                      context[field],
                    ),
                  )}
                  onChange={(event) => {
                    setContext((current) => ({ ...current, [field]: event.target.value }));
                    setFailure(
                      event.target.value &&
                        !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(
                          event.target.value,
                        )
                        ? new Error("Competition IDs must be valid UUIDs.")
                        : null,
                    );
                  }}
                />
              </label>
            ))}
          </div>
          <label className="mt-5 flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={ingest}
              onChange={(event) => {
                setFailure(null);
                setIngest(event.target.checked);
              }}
            />
            Stream readings to my athlete record
          </label>
        </Card>
      )}
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
          Simulator readings are labeled stress-test data. Enable streaming to test backend alerts
          and wearable consistency updates. Competition context requires your registered
          participation.
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
        <VitalsChart readings={wearable.readings} />
        <p role="status" className="mt-4 text-xs">
          {ingestion
            ? `Backend ingestion status: ${ingestion.status}${reading?.source === "simulator" ? " · simulator stress test" : ""}`
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
          SIMULATED CRITICAL READING — stress-test data. Check backend ingestion status for any
          safety action.
        </Alert>
      )}
    </div>
  );
}
