"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export const PATH_COLORS = {
  group: "#2563EB",
  first: "#10B981",
  second: "#F59E0B",
  third: "#7C3AED",
} as const;

export function PathLegend() {
  return (
    <Card className="shadow-md">
      <CardContent className="p-3 space-y-2">
        <h4 className="font-semibold text-sm text-foreground">Path Legend</h4>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-1.5 rounded" style={{ background: PATH_COLORS.group }} />
            <span className="text-foreground">Group Stage</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-1.5 rounded" style={{ background: PATH_COLORS.first }} />
            <span className="text-foreground">Finish 1st</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-1.5 rounded" style={{ background: PATH_COLORS.second }} />
            <span className="text-foreground">Finish 2nd</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-1.5 rounded"
              style={{
                background: `repeating-linear-gradient(90deg, ${PATH_COLORS.third} 0, ${PATH_COLORS.third} 3px, transparent 3px, transparent 6px)`,
              }}
            />
            <span className="text-foreground">Finish 3rd</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
