// © 2025 CyberLage
"use client";

import { useMemo } from "react";

type Props = {
  data: { date: string; value: number }[];
  height?: number;
  width?: number;
  color?: string;
};

export default function TrendSparkline({ data, height = 40, width = 120, color = "#2563eb" }: Props) {
  const path = useMemo(() => {
    if (!data.length) return "";
    const max = Math.max(...data.map(d => d.value), 1);
    const min = Math.min(...data.map(d => d.value), 0);
    const range = max - min || 1;
    return data
      .map((d, i) => {
        const x = (i / Math.max(data.length - 1, 1)) * width;
        const y = height - ((d.value - min) / range) * (height - 4) - 2;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }, [data, height, width]);

  if (!data.length) return null;

  return (
    <svg width={width} height={height} className="inline-block">
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}



