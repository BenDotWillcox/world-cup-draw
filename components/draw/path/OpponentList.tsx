"use client";

import React, { useState } from "react";
import { type BracketOpponent } from "@/lib/engine/path-logic";
import { formatEstimateTitle, getBinomialEstimate } from "@/lib/statistics/uncertainty";
import { resolvePath } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

interface OpponentListProps {
  opponents: BracketOpponent[];
  maxVisible?: number;
}

export function OpponentList({ opponents, maxVisible = 8 }: OpponentListProps) {
  const [expanded, setExpanded] = useState(false);

  if (opponents.length === 0) {
    return <div className="text-xs text-muted-foreground italic">TBD</div>;
  }

  const hasProbabilities = opponents.some(o => o.probability != null);
  const visible = expanded ? opponents : opponents.slice(0, maxVisible);
  const hasMore = opponents.length > maxVisible;

  return (
    <div className="space-y-1.5">
      {visible.map((opp) => {
        const hasEstimate = opp.probabilityCount != null && opp.probabilityTrials != null;
        const estimate = hasEstimate
          ? getBinomialEstimate(opp.probabilityCount!, opp.probabilityTrials!)
          : null;
        const estimateTitle = hasEstimate
          ? formatEstimateTitle(opp.probabilityCount!, opp.probabilityTrials!)
          : undefined;

        return (
        <div
          key={opp.teamId}
          className="flex items-start gap-2"
          title={estimateTitle}
          aria-label={estimateTitle ? `${opp.teamName}: ${estimateTitle}` : undefined}
          tabIndex={estimateTitle ? 0 : undefined}
        >
          {opp.flagUrl && (
            <img
              src={resolvePath(opp.flagUrl)}
              alt={opp.teamName}
              className="w-6 h-4 object-cover rounded border shadow-sm flex-shrink-0"
            />
          )}
          <span className="text-sm font-medium truncate pt-0.5">{opp.teamName}</span>
          {hasProbabilities && opp.probability != null ? (
            <span className="ml-auto flex shrink-0 flex-col items-end">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {opp.probability.toFixed(1)}%
              </span>
              {estimate && opp.probabilityTrials != null && (
                <span className="text-[10px] leading-tight text-muted-foreground">
                  95% CI {estimate.confidenceInterval95.lowPercentage.toFixed(1)}–{estimate.confidenceInterval95.highPercentage.toFixed(1)}% · n={opp.probabilityTrials.toLocaleString()}
                </span>
              )}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground truncate ml-auto">{opp.entryPath}</span>
          )}
        </div>
        );
      })}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>Show less <ChevronUp className="h-3 w-3" /></>
          ) : (
            <>+{opponents.length - maxVisible} more <ChevronDown className="h-3 w-3" /></>
          )}
        </button>
      )}
    </div>
  );
}
