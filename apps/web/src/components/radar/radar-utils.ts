import type { AttributeResponseData } from "@kshetra/types";

export interface RadarPoint {
  x: number;
  y: number;
}

export interface RadarDatum {
  code: AttributeResponseData["code"];
  label: string;
  value: number;
  cap: number;
  normalized: number;
  lastUpdatedAt: string;
}

const SHORT_LABELS: Record<AttributeResponseData["code"], string> = {
  strength: "Str",
  wisdom: "Wis",
  focus: "Foc",
  mastery: "Mas",
  wealth: "Wea",
  bond: "Bon",
};

export function toRadarData(
  attributes: AttributeResponseData[],
): RadarDatum[] {
  return attributes.map((attribute) => ({
    code: attribute.code,
    label: attribute.display_name,
    value: attribute.value,
    cap: attribute.cap,
    normalized:
      attribute.cap > 0 ? clamp(attribute.value / attribute.cap, 0, 1) : 0,
    lastUpdatedAt: attribute.last_updated_at,
  }));
}

export function buildRadarPoints(
  values: number[],
  radius: number,
  center: number,
): RadarPoint[] {
  return values.map((value, index) => {
    const angle = angleForIndex(index, values.length);
    const scaled = radius * clamp(value, 0, 1);

    return {
      x: center + Math.cos(angle) * scaled,
      y: center + Math.sin(angle) * scaled,
    };
  });
}

export function polygonPath(points: RadarPoint[]): string {
  if (!points.length) {
    return "";
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ")
    .concat(" Z");
}

export function labelPoint(
  index: number,
  total: number,
  radius: number,
  center: number,
  distanceFromEdge: number,
): RadarPoint {
  const angle = angleForIndex(index, total);
  const scaled = radius + distanceFromEdge;

  return {
    x: center + Math.cos(angle) * scaled,
    y: center + Math.sin(angle) * scaled,
  };
}

export function shortLabel(code: AttributeResponseData["code"]): string {
  return SHORT_LABELS[code];
}

export function isRecentlyChanged(lastUpdatedAt: string, windowMs: number): boolean {
  const updatedAt = Date.parse(lastUpdatedAt);

  if (Number.isNaN(updatedAt)) {
    return false;
  }

  return Date.now() - updatedAt <= windowMs;
}

function angleForIndex(index: number, total: number): number {
  return (-Math.PI / 2) + (Math.PI * 2 * index) / total;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
