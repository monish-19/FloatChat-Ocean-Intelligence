import { Router, type IRouter } from "express";

type FloatPoint = {
  timestamp: string;
  lat: number;
  lon: number;
  depth: number;
  temperature: number;
  salinity: number;
};

type FloatTrajectory = {
  id: string;
  platformType: "ARGO" | "BGC-ARGO";
  color: string;
  points: FloatPoint[];
};

const timestamps = [
  "2026-08-29T00:00:00Z",
  "2026-08-30T00:00:00Z",
  "2026-08-31T00:00:00Z",
  "2026-09-01T00:00:00Z",
  "2026-09-02T00:00:00Z",
  "2026-09-03T00:00:00Z",
  "2026-09-04T00:00:00Z",
  "2026-09-05T00:00:00Z",
];

const createPoints = (
  values: Array<[number, number, number, number, number]>,
): FloatPoint[] =>
  values.map(([lat, lon, depth, temperature, salinity], index) => ({
    timestamp: timestamps[index],
    lat,
    lon,
    depth,
    temperature,
    salinity,
  }));

const floats: FloatTrajectory[] = [
  {
    id: "WMO 2902746",
    platformType: "BGC-ARGO",
    color: "#70e7d9",
    points: createPoints([
      [-14.22, 68.9, 30, 26.4, 35.21],
      [-14.08, 68.72, 180, 25.9, 35.18],
      [-13.82, 68.54, 420, 22.8, 35.08],
      [-13.44, 68.34, 680, 18.9, 34.98],
      [-13.16, 68.1, 930, 12.2, 34.75],
      [-12.82, 67.94, 540, 20.6, 34.91],
      [-12.52, 67.78, 260, 24.8, 35.07],
      [-12.28, 67.61, 45, 28.1, 35.2],
    ]),
  },
  {
    id: "WMO 2902751",
    platformType: "ARGO",
    color: "#f5a074",
    points: createPoints([
      [-4.88, 77.3, 40, 27.1, 35.04],
      [-4.64, 77.48, 210, 27.3, 35.02],
      [-4.41, 77.7, 390, 27.5, 34.96],
      [-4.18, 77.96, 610, 27.2, 34.88],
      [-3.92, 78.19, 820, 14.2, 34.75],
      [-3.67, 78.4, 470, 21.1, 34.9],
      [-3.44, 78.64, 190, 25.1, 35.01],
      [-3.18, 78.86, 35, 28.4, 35.08],
    ]),
  },
  {
    id: "WMO 2902838",
    platformType: "BGC-ARGO",
    color: "#b7a7ff",
    points: createPoints([
      [-8.62, 84.18, 25, 26.8, 34.88],
      [-8.43, 84.02, 160, 25.7, 34.9],
      [-8.18, 83.86, 350, 22.6, 34.92],
      [-7.92, 83.68, 580, 17.9, 34.84],
      [-7.63, 83.5, 760, 13.1, 34.72],
      [-7.36, 83.3, 420, 21.5, 34.86],
      [-7.1, 83.08, 170, 25.4, 34.91],
      [-6.84, 82.9, 20, 27.6, 34.96],
    ]),
  },
  {
    id: "WMO 2902914",
    platformType: "ARGO",
    color: "#8ce9ff",
    points: createPoints([
      [-18.04, 73.81, 50, 24.9, 35.48],
      [-17.82, 73.62, 240, 23.2, 35.41],
      [-17.56, 73.42, 470, 19.5, 35.28],
      [-17.24, 73.2, 700, 15.7, 35.12],
      [-16.88, 72.98, 980, 10.6, 34.94],
      [-16.54, 72.76, 510, 18.7, 35.2],
      [-16.22, 72.55, 210, 22.4, 35.39],
      [-15.91, 72.34, 42, 25.5, 35.51],
    ]),
  },
];

const oceanRouter: IRouter = Router();

oceanRouter.get("/floats", (_req, res) => {
  res.json({
    source: "demo-argo-observations",
    updatedAt: timestamps.at(-1),
    timeWindow: {
      start: timestamps[0],
      end: timestamps.at(-1),
    },
    floats,
  });
});

oceanRouter.get("/transect", (req, res) => {
  const float = floats.find((candidate) => candidate.id === req.query.floatId) ?? floats[0];
  const surface = float.points.at(-1)!;
  const profile = Array.from({ length: 11 }, (_, index) => {
    const depth = index * 100;
    return {
      depth,
      temperature: Number((surface.temperature - depth * 0.014 + Math.sin(index * 0.7) * 0.24).toFixed(2)),
      salinity: Number((surface.salinity - 0.00018 * depth + Math.cos(index * 0.45) * 0.018).toFixed(3)),
    };
  });

  res.json({
    floatId: float.id,
    region: "Indian Ocean",
    profile,
  });
});

oceanRouter.get("/anomalies", (_req, res) => {
  const records = floats.flatMap((float) => {
    const regionalBaseline = 25;
    const baselineDeviation = 1.5;
    const threshold = 1.05;
    const windows: Array<{
      start: string;
      end: string;
      durationHours: number;
      peakZScore: number;
      peakTemperature: number;
    }> = [];
    let active: FloatPoint[] = [];

    const flush = () => {
      if (active.length >= 3) {
        const peak = active.reduce((highest, point) =>
          Math.abs((point.temperature - regionalBaseline) / baselineDeviation) >
          Math.abs((highest.temperature - regionalBaseline) / baselineDeviation)
            ? point
            : highest,
        );
        windows.push({
          start: active[0].timestamp,
          end: active.at(-1)!.timestamp,
          durationHours: active.length * 24,
          peakZScore: Number(((peak.temperature - regionalBaseline) / baselineDeviation).toFixed(2)),
          peakTemperature: peak.temperature,
        });
      }
      active = [];
    };

    for (const point of float.points) {
      const zScore = (point.temperature - regionalBaseline) / baselineDeviation;
      if (zScore >= threshold) active.push(point);
      else flush();
    }
    flush();

    return windows.map((window) => ({
      floatId: float.id,
      type: "sustained-warm anomaly",
      region: "Indian Ocean",
      ...window,
    }));
  });

  res.json({
    source: "duration-aggregation-over-profile-zscores",
    threshold: "regional z-score >= 1.05 for 3+ consecutive readings",
    anomalies: records,
  });
});

export default oceanRouter;