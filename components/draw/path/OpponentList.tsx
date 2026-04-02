"use client";

import React, { useState } from "react";
import { type BracketOpponent } from "@/lib/engine/path-logic";
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
      {visible.map((opp) => (
        <div key={opp.teamId} className="flex items-center gap-2">
          {opp.flagUrl && (
            <img
              src={resolvePath(opp.flagUrl)}
              alt={opp.teamName}
              className="w-6 h-4 object-cover rounded border shadow-sm flex-shrink-0"
            />
          )}
          <span className="text-sm font-medium truncate">{opp.teamName}</span>
          {hasProbabilities && opp.probability != null ? (
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 ml-auto shrink-0">
              {opp.probability.toFixed(1)}%
            </span>
          ) : (
            <span className="text-xs text-muted-foreground truncate ml-auto">{opp.entryPath}</span>
          )}
        </div>
      ))}
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
