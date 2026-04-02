"use client";

import React, { useState } from "react";
import { type TravelStats } from "@/lib/engine/path-logic";
import { MapPin, Route, Calendar, ChevronDown, ChevronUp, Plane } from "lucide-react";
import { PATH_COLORS } from "./PathLegend";

interface TravelStatsBarProps {
  groupStats: TravelStats | null;
  firstStats: TravelStats | null;
  secondStats: TravelStats | null;
  thirdStats: TravelStats | null;
  highlightedPosition: 1 | 2 | 3 | null;
  showGroupStage: boolean;
}

function StatBlock({ label, stats, color }: { label: string; stats: TravelStats; color: string }) {
  const [showLegs, setShowLegs] = useState(false);

  return (
    <div className="rounded-lg border" style={{ borderColor: `${color}40` }}>
      <div
        className="flex items-center gap-4 px-4 py-2 cursor-pointer select-none"
        onClick={() => stats.legs.length > 0 && setShowLegs(!showLegs)}
      >
        <div className="text-xs font-semibold" style={{ color }}>{label}</div>
        <div className="flex items-center gap-1.5 text-sm">
          <Route className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{stats.totalDistanceKm.toLocaleString()} km</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{stats.uniqueCityCount} cities</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{stats.averageRestDays}d avg rest</span>
        </div>
        {stats.legs.length > 0 && (
          <div className="ml-auto text-muted-foreground">
            {showLegs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        )}
      </div>
      {showLegs && stats.legs.length > 0 && (
        <div className="border-t px-4 py-2 space-y-1" style={{ borderColor: `${color}20` }}>
          {stats.legs.map((leg, i) => (
            <div key={i} className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1 min-w-[140px]">
                <Plane className="h-3 w-3 shrink-0" style={{ color }} />
                <span className="truncate">{leg.from}</span>
                <span className="mx-0.5">→</span>
                <span className="truncate">{leg.to}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Route className="h-3 w-3" />
                <span className="font-medium">{leg.distanceKm.toLocaleString()} km</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Calendar className="h-3 w-3" />
                <span className="font-medium">{leg.restDays}d rest</span>
              </div>
              <span className="text-[10px] font-mono ml-auto shrink-0" style={{ color: `${color}80` }}>
                {leg.round}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TravelStatsBar({ groupStats, firstStats, secondStats, thirdStats, highlightedPosition, showGroupStage }: TravelStatsBarProps) {
  const showGroup = showGroupStage && groupStats && groupStats.legs.length > 0;

  if (highlightedPosition === 1 && firstStats) {
    return (
      <div className="space-y-2">
        {showGroup && <StatBlock label="Group Stage" stats={groupStats} color={PATH_COLORS.group} />}
        <StatBlock label="1st Place Path" stats={firstStats} color={PATH_COLORS.first} />
      </div>
    );
  }
  if (highlightedPosition === 2 && secondStats) {
    return (
      <div className="space-y-2">
        {showGroup && <StatBlock label="Group Stage" stats={groupStats} color={PATH_COLORS.group} />}
        <StatBlock label="2nd Place Path" stats={secondStats} color={PATH_COLORS.second} />
      </div>
    );
  }
  if (highlightedPosition === 3 && thirdStats) {
    return (
      <div className="space-y-2">
        {showGroup && <StatBlock label="Group Stage" stats={groupStats} color={PATH_COLORS.group} />}
        <StatBlock label="3rd Place Path" stats={thirdStats} color={PATH_COLORS.third} />
      </div>
    );
  }

  // No knockout path selected — show group if toggled, plus any knockout stats
  return (
    <div className="space-y-2">
      {showGroup && <StatBlock label="Group Stage" stats={groupStats} color={PATH_COLORS.group} />}
      <div className="flex flex-wrap gap-2">
        {firstStats && <StatBlock label="1st" stats={firstStats} color={PATH_COLORS.first} />}
        {secondStats && <StatBlock label="2nd" stats={secondStats} color={PATH_COLORS.second} />}
        {thirdStats && <StatBlock label="3rd" stats={thirdStats} color={PATH_COLORS.third} />}
      </div>
    </div>
  );
}
