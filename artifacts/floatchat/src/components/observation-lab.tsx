import { useEffect, useMemo, useState } from "react";
import { Line } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  CartesianGrid,
  LineChart,
  Line as ChartLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Clock3, Database, Layers3, LoaderCircle } from "lucide-react";

export type OceanPoint = {
  timestamp: string;
  lat: number;
  lon: number;
  depth: number;
  temperature: number;
  salinity: number;
};

export type OceanFloat = {
  id: string;
  platformType: "ARGO" | "BGC-ARGO";
  color: string;
  points: OceanPoint[];
};

type FloatsResponse = {
  source: string;
  updatedAt: string;
  floats: OceanFloat[];
};

type TransectResponse = {
  floatId: string;
  region: string;
  profile: Array<{ depth: number; temperature: number; salinity: number }>;
};

type Anomaly = {
  floatId: string;
  type: string;
  region: string;
  start: string;
  end: string;
  durationHours: number;
  peakZScore: number;
  peakTemperature: number;
};

type AnomaliesResponse = {
  source: string;
  threshold: string;
  anomalies: Anomaly[];
};

function interpolatePoint(points: OceanPoint[], timeIndex: number) {
  const lowerIndex = Math.floor(timeIndex);
  const upperIndex = Math.min(points.length - 1, lowerIndex + 1);
  const amount = timeIndex - lowerIndex;
  const lower = points[lowerIndex] ?? points[0];
  const upper = points[upperIndex] ?? lower;

  return {
    ...lower,
    lat: lower.lat + (upper.lat - lower.lat) * amount,
    lon: lower.lon + (upper.lon - lower.lon) * amount,
    depth: lower.depth + (upper.depth - lower.depth) * amount,
    temperature: lower.temperature + (upper.temperature - lower.temperature) * amount,
    salinity: lower.salinity + (upper.salinity - lower.salinity) * amount,
  };
}

function projectPoint(point: OceanPoint): [number, number, number] {
  const x = (point.lon - 75) / 3.6;
  const y = 2.1 - point.depth / 265;
  const z = (point.lat + 10) / 2.7;
  return [x, y, z];
}

function TrajectoryMarker({
  float,
  timeIndex,
  selected,
  onSelect,
}: {
  float: OceanFloat;
  timeIndex: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const point = interpolatePoint(float.points, timeIndex);
  const position = projectPoint(point);
  const scale = selected ? 1.65 : 1;

  return (
    <mesh position={position} scale={scale} onClick={(event) => {
      event.stopPropagation();
      onSelect();
    }}>
      <sphereGeometry args={[0.11, 16, 16]} />
      <meshStandardMaterial
        color={float.color}
        emissive={float.color}
        emissiveIntensity={selected ? 1.6 : 0.85}
        roughness={0.3}
      />
    </mesh>
  );
}

function TrajectoryLayer({
  floats,
  timeIndex,
  selectedId,
  onSelect,
}: {
  floats: OceanFloat[];
  timeIndex: number;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  useFrame(({ camera, clock }) => {
    camera.position.x = Math.sin(clock.elapsedTime * 0.12) * 0.22;
    camera.position.y = 3.1 + Math.cos(clock.elapsedTime * 0.1) * 0.12;
    camera.lookAt(0, 0.4, 0);
  });

  return (
    <>
      <ambientLight intensity={0.7} />
      <pointLight position={[0, 4, 3]} intensity={18} distance={15} color="#9df9ed" />
      <pointLight position={[-4, -1, -4]} intensity={10} distance={13} color="#4477ff" />
      <gridHelper args={[14, 14, "#17434d", "#0a2832"]} rotation={[0, 0, 0]} position={[0, -1.8, 0]} />
      {floats.map((float) => (
        <group key={float.id}>
          <Line
            points={float.points.map(projectPoint)}
            color={float.color}
            transparent
            opacity={selectedId === float.id ? 0.95 : 0.3}
            lineWidth={selectedId === float.id ? 2.2 : 1}
          />
          {float.points.map((point, index) => (
            <mesh key={`${float.id}-${index}`} position={projectPoint(point)} scale={index === Math.round(timeIndex) ? 1.25 : 0.42}>
              <sphereGeometry args={[0.035, 8, 8]} />
              <meshBasicMaterial color={float.color} transparent opacity={index <= timeIndex ? 0.72 : 0.16} />
            </mesh>
          ))}
          <TrajectoryMarker
            float={float}
            timeIndex={timeIndex}
            selected={selectedId === float.id}
            onSelect={() => onSelect(float.id)}
          />
        </group>
      ))}
    </>
  );
}

export function OceanScene({
  floats,
  timeIndex,
  selectedId,
  onSelect,
}: {
  floats: OceanFloat[];
  timeIndex: number;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    let context: WebGLRenderingContext | null = null;
    try {
      context =
        canvas.getContext("webgl", { failIfMajorPerformanceCaveat: false }) ??
        canvas.getContext("experimental-webgl") as WebGLRenderingContext | null;
    } catch {
      context = null;
    }
    setWebglAvailable(Boolean(context));
  }, []);

  if (webglAvailable === null) {
    return <div className="lab-loading"><LoaderCircle size={18} /> initializing observation renderer</div>;
  }

  if (!webglAvailable) {
    return <FallbackTrajectory floats={floats} timeIndex={timeIndex} selectedId={selectedId} onSelect={onSelect} />;
  }

  return (
    <Canvas
      dpr={[1, 1.6]}
      camera={{ position: [0, 3.1, 8.2], fov: 43 }}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={["#03161d"]} />
      <fog attach="fog" args={["#03161d", 7, 17]} />
      <TrajectoryLayer floats={floats} timeIndex={timeIndex} selectedId={selectedId} onSelect={onSelect} />
    </Canvas>
  );
}

function FallbackTrajectory({
  floats,
  timeIndex,
  selectedId,
  onSelect,
}: {
  floats: OceanFloat[];
  timeIndex: number;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const toSvgPoint = (point: OceanPoint) => [
    90 + ((point.lon - 64) / 27) * 620,
    405 - (point.depth / 1000) * 300 - ((point.lat + 20) / 20) * 35,
  ] as const;

  return (
    <svg className="trajectory-fallback" viewBox="0 0 800 500" role="img" aria-label="ARGO trajectories plotted by longitude, latitude, and depth">
      <defs>
        <radialGradient id="fallbackField" cx="50%" cy="48%" r="65%">
          <stop offset="0%" stopColor="#0c5260" stopOpacity=".7" />
          <stop offset="100%" stopColor="#03161d" stopOpacity=".1" />
        </radialGradient>
      </defs>
      <rect width="800" height="500" fill="url(#fallbackField)" />
      <g className="fallback-grid">
        {Array.from({ length: 9 }, (_, index) => <path key={`h-${index}`} d={`M40 ${55 + index * 48} H760`} />)}
        {Array.from({ length: 11 }, (_, index) => <path key={`v-${index}`} d={`M${40 + index * 72} 30 V450`} />)}
      </g>
      {floats.map((float) => {
        const points = float.points.map(toSvgPoint);
        const current = toSvgPoint(interpolatePoint(float.points, timeIndex));
        return (
          <g key={float.id} className={selectedId === float.id ? "fallback-float is-selected" : "fallback-float"} onClick={() => onSelect(float.id)}>
            <polyline points={points.map(([x, y]) => `${x},${y}`).join(" ")} stroke={float.color} />
            {points.map(([x, y], index) => <circle key={`${float.id}-p-${index}`} cx={x} cy={y} r={index <= timeIndex ? 3 : 1.7} fill={float.color} opacity={index <= timeIndex ? 0.75 : 0.22} />)}
            <circle cx={current[0]} cy={current[1]} r="7" fill={float.color} />
            <circle cx={current[0]} cy={current[1]} r="15" fill="none" stroke={float.color} strokeOpacity=".35" />
          </g>
        );
      })}
      <text x="44" y="474">WebGL unavailable / SVG trajectory fallback</text>
    </svg>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", timeZone: "UTC" }).format(new Date(value));
}

export function ObservationLab() {
  const [floats, setFloats] = useState<OceanFloat[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [timeIndex, setTimeIndex] = useState(3);
  const [transect, setTransect] = useState<TransectResponse | null>(null);
  const [anomalies, setAnomalies] = useState<AnomaliesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [floatResponse, anomalyResponse] = await Promise.all([
        fetch("/api/floats"),
        fetch("/api/anomalies"),
      ]);
      const floatData = (await floatResponse.json()) as FloatsResponse;
      const anomalyData = (await anomalyResponse.json()) as AnomaliesResponse;
      setFloats(floatData.floats);
      setSelectedId(floatData.floats[0]?.id ?? "");
      setAnomalies(anomalyData);
      setIsLoading(false);
    };

    load().catch(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/transect?floatId=${encodeURIComponent(selectedId)}`)
      .then((response) => response.json() as Promise<TransectResponse>)
      .then(setTransect)
      .catch(() => setTransect(null));
  }, [selectedId]);

  const selectedFloat = useMemo(
    () => floats.find((float) => float.id === selectedId) ?? floats[0],
    [floats, selectedId],
  );
  const timeline = selectedFloat?.points ?? [];
  const activeDate = timeline[Math.round(timeIndex)]?.timestamp;

  return (
    <section className="flow-section evidence-section" id="observations">
      <div className="section-kicker">03 / 4D observation field</div>
      <div className="evidence-heading">
        <div>
          <h2>
            Follow the instruments
            <span> through space, depth, and time.</span>
          </h2>
          <p>
            The renderer is driven by the same API payload used by the profile and anomaly views.
            Scrub the observation window to watch each float move through its measured depth.
          </p>
        </div>
        <div className="evidence-source"><span className="live-dot" /> API / demo-argo-observations</div>
      </div>

      <div className="trajectory-lab">
        <div className="trajectory-canvas">
          {isLoading ? (
            <div className="lab-loading"><LoaderCircle size={18} /> loading observations</div>
          ) : (
            <OceanScene floats={floats} timeIndex={timeIndex} selectedId={selectedId} onSelect={setSelectedId} />
          )}
          <div className="canvas-label canvas-label-top">LAT / LON / DEPTH VOLUME</div>
          <div className="canvas-label canvas-label-bottom">LIVE POSITION INTERPOLATION</div>
        </div>
        <aside className="trajectory-controls">
          <div className="lab-card-kicker">time scrub / observation window</div>
          <div className="scrub-date">{activeDate ? formatDate(activeDate) : "—"} <span>UTC</span></div>
          <input
            className="time-scrub"
            type="range"
            min="0"
            max={Math.max(0, timeline.length - 1)}
            step="0.01"
            value={Math.min(timeIndex, Math.max(0, timeline.length - 1))}
            onChange={(event) => setTimeIndex(Number(event.target.value))}
            aria-label="Scrub observation time"
          />
          <div className="scrub-range"><span>29 AUG</span><span>05 SEP 2026</span></div>
          <div className="lab-card-kicker instruments-kicker">select instrument</div>
          <div className="instrument-list">
            {floats.map((float) => (
              <button
                type="button"
                key={float.id}
                className={selectedId === float.id ? "instrument-row is-selected" : "instrument-row"}
                onClick={() => setSelectedId(float.id)}
              >
                <i style={{ background: float.color }} />
                <span>{float.id}</span>
                <small>{float.platformType}</small>
              </button>
            ))}
          </div>
          {selectedFloat && (
            <div className="selected-reading">
              <span>current reading</span>
              <strong>{interpolatePoint(selectedFloat.points, timeIndex).depth.toFixed(0)}M</strong>
              <small>{interpolatePoint(selectedFloat.points, timeIndex).temperature.toFixed(1)}°C / {interpolatePoint(selectedFloat.points, timeIndex).salinity.toFixed(2)} PSU</small>
            </div>
          )}
        </aside>
      </div>

      <div className="profile-grid">
        <article className="profile-card">
          <div className="profile-card-head">
            <div>
              <div className="lab-card-kicker"><Layers3 size={12} /> depth profile / thermocline</div>
              <h3>{transect?.floatId ?? "Select a float"}</h3>
            </div>
            <span>0—1000M</span>
          </div>
          <div className="profile-chart">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={transect?.profile ?? []} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="rgba(112,231,217,0.11)" vertical={false} />
                <XAxis dataKey="depth" stroke="#55767c" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="temp" stroke="#f5a074" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="salinity" orientation="right" stroke="#70e7d9" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ background: "#061c24", border: "1px solid rgba(112,231,217,0.3)", fontSize: 11 }} />
                <ChartLine yAxisId="temp" type="monotone" dataKey="temperature" stroke="#f5a074" strokeWidth={2} dot={false} />
                <ChartLine yAxisId="salinity" type="monotone" dataKey="salinity" stroke="#70e7d9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend"><span><i className="legend-dot orange" /> temperature °C</span><span><i className="legend-dot" /> salinity PSU</span><span>depth / meters</span></div>
        </article>

        <article className="anomaly-card">
          <div className="profile-card-head">
            <div>
              <div className="lab-card-kicker"><Activity size={12} /> duration aggregation</div>
              <h3>Persistent signals</h3>
            </div>
            <Clock3 size={16} />
          </div>
          <p className="anomaly-method">{anomalies?.threshold ?? "Consecutive profile readings"}</p>
          <div className="anomaly-list">
            {anomalies?.anomalies.map((anomaly) => (
              <div className="anomaly-row" key={`${anomaly.floatId}-${anomaly.start}`}>
                <div>
                  <strong>{anomaly.floatId}</strong>
                  <span>{formatDate(anomaly.start)}—{formatDate(anomaly.end)} / {anomaly.region}</span>
                </div>
                <b>{anomaly.durationHours}H</b>
                <em>{anomaly.peakTemperature.toFixed(1)}°C</em>
              </div>
            ))}
          </div>
          <div className="anomaly-footer"><Database size={13} /> heatwave = sustained warm signal, not a single spike</div>
        </article>
      </div>
    </section>
  );
}