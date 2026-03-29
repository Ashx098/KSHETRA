"use client";

import type { AttributeResponseData } from "@kshetra/types";
import type { ReactElement } from "react";
import { useState } from "react";

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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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
  const hoveredDatum = hoveredIndex !== null ? data[hoveredIndex] ?? null : null;
  const hoveredPoint = hoveredIndex !== null ? currentPoints[hoveredIndex] ?? null : null;
  const hoveredAxisEnd = hoveredIndex !== null ? fullCapPoints[hoveredIndex] ?? null : null;

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${chartSize} ${chartSize}`}
        className={size === "compact" ? "w-full max-w-[260px]" : "w-full max-w-[360px]"}
        role="img"
        aria-label="Current attribute radar"
        onMouseLeave={() => setHoveredIndex(null)}
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
              stroke={
                step === gridSteps - 1
                  ? "rgba(212, 168, 79, 0.45)"
                  : "rgba(142, 161, 181, 0.18)"
              }
              strokeWidth={step === gridSteps - 1 ? 1.6 : 1}
            />
          );
        })}

        {data.map((entry, index) => {
          const point = fullCapPoints[index];

          if (!point) {
            return null;
          }

          const active = hoveredIndex === index;

          return (
            <line
              key={entry.code}
              x1={center}
              y1={center}
              x2={point.x}
              y2={point.y}
              stroke={active ? "rgba(212, 168, 79, 0.72)" : "rgba(142, 161, 181, 0.22)"}
              strokeWidth={active ? 1.8 : 1}
            />
          );
        })}

        <path
          d={polygonPath(currentPoints)}
          fill={`url(#radar-fill-${size})`}
          stroke="rgba(212, 168, 79, 0.95)"
          strokeWidth={hoveredIndex !== null ? "2.6" : "2.2"}
        />

        {hoveredPoint && hoveredAxisEnd ? (
          <g className="pointer-events-none">
            <line
              x1={hoveredPoint.x}
              y1={hoveredPoint.y}
              x2={hoveredAxisEnd.x}
              y2={hoveredAxisEnd.y}
              stroke="rgba(212, 168, 79, 0.55)"
              strokeDasharray="4 4"
              strokeWidth="1.4"
            />
          </g>
        ) : null}

        {data.map((entry, index) => {
          const point = currentPoints[index];

          if (!point) {
            return null;
          }

          const recent =
            pulseRecentChanges &&
            isRecentlyChanged(entry.lastUpdatedAt, RECENT_CHANGE_WINDOW_MS);
          const active = hoveredIndex === index;

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
                r={size === "compact" ? 10 : 12}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(index)}
                onFocus={() => setHoveredIndex(index)}
                onBlur={() => setHoveredIndex(null)}
                tabIndex={0}
              />
              <circle
                cx={point.x}
                cy={point.y}
                r={active ? (size === "compact" ? 5.5 : 6.5) : size === "compact" ? 3.4 : 4.4}
                fill="#d4a84f"
                stroke={active ? "rgba(250, 251, 252, 0.95)" : "rgba(7, 11, 17, 0.95)"}
                strokeWidth={active ? "2" : "1.5"}
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
          const active = hoveredIndex === index;

          return (
            <text
              key={`${entry.code}-label`}
              x={point.x + dx}
              y={point.y + dy}
              fill={active ? "#f8e2a9" : "#edf2f7"}
              fontSize={size === "compact" ? "11" : "12"}
              fontWeight={active ? "600" : "500"}
              textAnchor={textAnchor}
              dominantBaseline={dominantBaseline}
              className="cursor-pointer select-none"
              onMouseEnter={() => setHoveredIndex(index)}
              onFocus={() => setHoveredIndex(index)}
              onBlur={() => setHoveredIndex(null)}
              tabIndex={0}
            >
              {size === "compact" ? shortLabel(entry.code) : entry.label}
            </text>
          );
        })}

        {hoveredDatum && hoveredPoint ? (
          <RadarTooltip
            chartSize={chartSize}
            point={hoveredPoint}
            label={hoveredDatum.label}
            value={hoveredDatum.value}
            cap={hoveredDatum.cap}
          />
        ) : null}
      </svg>

      {size === "compact" ? (
        <div className="mt-4 grid w-full grid-cols-2 gap-2 text-xs text-muted">
          {data.map((entry, index) => (
            <div
              key={`${entry.code}-legend`}
              className={`rounded-xl border px-3 py-2 transition ${
                hoveredIndex === index
                  ? "border-accent/35 bg-accent/10"
                  : "border-line bg-canvas/35"
              }`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
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

function RadarTooltip({
  chartSize,
  point,
  label,
  value,
  cap,
}: {
  chartSize: number;
  point: { x: number; y: number };
  label: string;
  value: number;
  cap: number;
}) {
  const width = 110;
  const height = 42;
  const x = clamp(point.x - width / 2, 10, chartSize - width - 10);
  const y = clamp(point.y - height - 16, 10, chartSize - height - 10);

  return (
    <g className="pointer-events-none">
      <rect
        x={x}
        y={y}
        rx="12"
        ry="12"
        width={width}
        height={height}
        fill="rgba(7, 11, 17, 0.94)"
        stroke="rgba(212, 168, 79, 0.4)"
      />
      <text x={x + 12} y={y + 16} fill="#f8e2a9" fontSize="11" fontWeight="600">
        {label}
      </text>
      <text x={x + 12} y={y + 31} fill="#edf2f7" fontSize="12">
        {value.toFixed(1)} / {cap.toFixed(1)}
      </text>
    </g>
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
