import type { AttributeResponseData } from "@kshetra/types";
import type { ReactElement } from "react";

import {
  buildRadarPoints,
  isRecentlyChanged,
  labelPoint,
  polygonPath,
  shortLabel,
  toRadarData,
} from "./radar-utils";

interface RadarChartProps {
  attributes: AttributeResponseData[];
  size: "compact" | "full";
  pulseRecentChanges?: boolean;
}

const RECENT_CHANGE_WINDOW_MS = 1000 * 60 * 60 * 24;

export function RadarChart({
  attributes,
  size,
  pulseRecentChanges = false,
}: RadarChartProps): ReactElement | null {
  if (!attributes.length) {
    return null;
  }

  const data = toRadarData(attributes);
  const chartSize = size === "compact" ? 260 : 360;
  const center = chartSize / 2;
  const radius = size === "compact" ? 78 : 118;
  const gridSteps = 4;
  const currentPoints = buildRadarPoints(
    data.map((entry) => entry.normalized),
    radius,
    center,
  );
  const fullCapPoints = buildRadarPoints(
    new Array(data.length).fill(1),
    radius,
    center,
  );

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${chartSize} ${chartSize}`}
        className={size === "compact" ? "w-full max-w-[260px]" : "w-full max-w-[360px]"}
        role="img"
        aria-label="Current attribute radar"
      >
        <defs>
          <linearGradient id={`radar-fill-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(212, 168, 79, 0.45)" />
            <stop offset="100%" stopColor="rgba(76, 165, 255, 0.16)" />
          </linearGradient>
        </defs>

        {Array.from({ length: gridSteps }, (_, step) => {
          const scale = (step + 1) / gridSteps;
          const ringPoints = buildRadarPoints(
            new Array(data.length).fill(scale),
            radius,
            center,
          );

          return (
            <path
              key={scale}
              d={polygonPath(ringPoints)}
              fill="none"
              stroke={step === gridSteps - 1 ? "rgba(212, 168, 79, 0.45)" : "rgba(142, 161, 181, 0.18)"}
              strokeWidth={step === gridSteps - 1 ? 1.6 : 1}
            />
          );
        })}

        {data.map((entry, index) => {
          const point = fullCapPoints[index];

          if (!point) {
            return null;
          }

          return (
          <line
            key={entry.code}
            x1={center}
            y1={center}
            x2={point.x}
            y2={point.y}
            stroke="rgba(142, 161, 181, 0.22)"
            strokeWidth="1"
          />
          );
        })}

        <path
          d={polygonPath(currentPoints)}
          fill={`url(#radar-fill-${size})`}
          stroke="rgba(212, 168, 79, 0.95)"
          strokeWidth="2.2"
        />

        {data.map((entry, index) => {
          const point = currentPoints[index];

          if (!point) {
            return null;
          }

          const recent = pulseRecentChanges && isRecentlyChanged(
            entry.lastUpdatedAt,
            RECENT_CHANGE_WINDOW_MS,
          );

          return (
            <g key={entry.code}>
              {recent ? (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={size === "compact" ? 7 : 9}
                  className="radar-pulse"
                />
              ) : null}
              <circle
                cx={point.x}
                cy={point.y}
                r={size === "compact" ? 3.4 : 4.4}
                fill="#d4a84f"
                stroke="rgba(7, 11, 17, 0.95)"
                strokeWidth="1.5"
              />
            </g>
          );
        })}

        {data.map((entry, index) => {
          const point = labelPoint(
            index,
            data.length,
            radius,
            center,
            size === "compact" ? 24 : 32,
          );
          const { textAnchor, dominantBaseline, dx, dy } = labelPosition(index);

          return (
            <text
              key={`${entry.code}-label`}
              x={point.x + dx}
              y={point.y + dy}
              fill="#edf2f7"
              fontSize={size === "compact" ? "11" : "12"}
              textAnchor={textAnchor}
              dominantBaseline={dominantBaseline}
            >
              {size === "compact" ? shortLabel(entry.code) : entry.label}
            </text>
          );
        })}
      </svg>

      {size === "compact" ? (
        <div className="mt-4 grid w-full grid-cols-2 gap-2 text-xs text-muted">
          {data.map((entry) => (
            <div
              key={`${entry.code}-legend`}
              className="rounded-xl border border-line bg-canvas/35 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-text">{entry.label}</span>
                <span>{entry.value.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function labelPosition(index: number): {
  textAnchor: "start" | "middle" | "end";
  dominantBaseline: "middle" | "hanging" | "alphabetic";
  dx: number;
  dy: number;
} {
  switch (index) {
    case 0:
      return { textAnchor: "middle", dominantBaseline: "alphabetic", dx: 0, dy: -4 };
    case 1:
      return { textAnchor: "start", dominantBaseline: "middle", dx: 8, dy: -1 };
    case 2:
      return { textAnchor: "start", dominantBaseline: "hanging", dx: 8, dy: 6 };
    case 3:
      return { textAnchor: "middle", dominantBaseline: "hanging", dx: 0, dy: 8 };
    case 4:
      return { textAnchor: "end", dominantBaseline: "hanging", dx: -8, dy: 6 };
    default:
      return { textAnchor: "end", dominantBaseline: "middle", dx: -8, dy: -1 };
  }
}
