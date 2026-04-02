"use client";

import React from "react";
import { type BracketPathNode, type CollapsedThirdPlace } from "@/lib/engine/path-logic";
import { resolvePath } from "@/lib/utils";
import { PATH_COLORS } from "./PathLegend";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BracketMiniViewProps {
  firstPath: BracketPathNode[];
  secondPath: BracketPathNode[];
  thirdPath: BracketPathNode[];
  thirdPlaceInfo: CollapsedThirdPlace;
  expandedThirdPlaceMatchId: string | null;
  highlightedPosition: 1 | 2 | 3 | null;
  hoveredBracketMatch: string | null;
  selectedStop: string | null;
  onMatchHover: (matchId: string | null) => void;
  onMatchClick: (matchId: string, position: 1 | 2 | 3) => void;
  onExpandThirdPlace: (matchId: string) => void;
}

const ROUND_LABELS = ["Round of 32", "Round of 16", "Quarterfinals", "Semifinals", "Final"];

const VENUE_ABBREV: Record<string, string> = {
  "New York": "NYC", "New York/NJ": "NYC", "Los Angeles": "LA",
  "San Francisco": "SF", "Mexico City": "MEX", "Kansas City": "KC",
  Houston: "HOU", Dallas: "DAL", Atlanta: "ATL", Miami: "MIA",
  Toronto: "TOR", Boston: "BOS", Philadelphia: "PHI",
  Vancouver: "VAN", Seattle: "SEA", Monterrey: "MTY",
  Guadalajara: "GDL",
};

function abbrev(venue: string): string {
  return VENUE_ABBREV[venue] || venue.slice(0, 3).toUpperCase();
}

interface MatchNodeProps {
  node: BracketPathNode | null;
  color: string;
  position: 1 | 2 | 3;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (matchId: string | null) => void;
  onClick: (matchId: string, position: 1 | 2 | 3) => void;
}

function MatchNode({ node, color, position, isHovered, isSelected, onHover, onClick }: MatchNodeProps) {
  if (!node) {
    return <div className="h-full" />;
  }

  const active = isHovered || isSelected;
  const topOpponent = node.opponents[0] || null;

  return (
    <div
      className="rounded-md border p-2 cursor-pointer transition-all text-xs h-full"
      style={{
        borderColor: active ? color : `${color}40`,
        backgroundColor: active ? `${color}10` : undefined,
        boxShadow: active ? `0 0 0 1px ${color}` : undefined,
      }}
      onMouseEnter={() => onHover(node.matchId)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(node.matchId, position)}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="font-semibold" style={{ color }}>{node.matchId}</span>
        <span className="text-[10px] text-muted-foreground">{abbrev(node.venue)}</span>
      </div>
      {topOpponent ? (
        <div className="flex items-center gap-1.5">
          {topOpponent.flagUrl && (
            <img
              src={resolvePath(topOpponent.flagUrl)}
              alt={topOpponent.teamName}
              className="w-5 h-3 object-cover rounded border shadow-sm shrink-0"
            />
          )}
          <span className="truncate text-muted-foreground">{topOpponent.teamName}</span>
          {topOpponent.probability != null && (
            <span className="text-[10px] font-medium shrink-0 ml-auto" style={{ color }}>
              {topOpponent.probability.toFixed(0)}%
            </span>
          )}
        </div>
      ) : (
        <span className="text-muted-foreground">TBD</span>
      )}
    </div>
  );
}

export function BracketMiniView({
  firstPath,
  secondPath,
  thirdPath,
  thirdPlaceInfo,
  expandedThirdPlaceMatchId,
  highlightedPosition,
  hoveredBracketMatch,
  selectedStop,
  onMatchHover,
  onMatchClick,
  onExpandThirdPlace,
}: BracketMiniViewProps) {

  const columns: Array<{
    label: string;
    color: string;
    position: 1 | 2 | 3;
    path: BracketPathNode[];
  }> = [
    { label: "1st Place", color: PATH_COLORS.first, position: 1, path: firstPath },
    { label: "2nd Place", color: PATH_COLORS.second, position: 2, path: secondPath },
    { label: "3rd Place", color: PATH_COLORS.third, position: 3, path: thirdPath },
  ];

  // Determine if a column should be visible
  function isColumnVisible(pos: 1 | 2 | 3): boolean {
    if (!highlightedPosition) return false;
    return pos === highlightedPosition;
  }

  // If only one column is visible, give it more room. If none, show placeholder.
  const visibleColumns = columns.filter(c => isColumnVisible(c.position));
  const showPlaceholder = visibleColumns.length === 0;

  return (
    <div className="h-full flex flex-col">
      {showPlaceholder ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground px-4 text-center">
          Select a finishing position to view the knockout bracket path.
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: `repeat(${visibleColumns.length}, 1fr)` }}>
            {visibleColumns.map(col => (
              <div key={col.position} className="text-center">
                <div className="text-xs font-semibold mb-1" style={{ color: col.color }}>
                  {col.label}
                </div>
                {col.position === 3 && (
                  <Select
                    value={expandedThirdPlaceMatchId || ""}
                    onValueChange={onExpandThirdPlace}
                  >
                    <SelectTrigger className="h-6 text-[10px] w-full">
                      <SelectValue placeholder="Select entry" />
                    </SelectTrigger>
                    <SelectContent>
                      {thirdPlaceInfo.possibleMatchIds.map((mid, i) => (
                        <SelectItem key={mid} value={mid} className="text-xs">
                          {mid} — {thirdPlaceInfo.possibleVenues[i]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>

          {/* Round rows */}
          <div className="flex-1 overflow-y-auto space-y-1.5">
            {ROUND_LABELS.map((round, rowIdx) => (
              <div key={round}>
                <div className="text-[10px] font-medium text-muted-foreground mb-1">{round}</div>
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${visibleColumns.length}, 1fr)` }}>
                  {visibleColumns.map(col => {
                    const node = col.path[rowIdx] || null;
                    const isHovered = node ? hoveredBracketMatch === node.matchId : false;
                    const isSelected = node ? selectedStop === node.matchId : false;

                    // If 3rd place not yet selected, show empty for that column
                    if (col.position === 3 && !expandedThirdPlaceMatchId) {
                      return (
                        <div key={col.position} className="rounded-md border border-dashed p-2 text-[10px] text-muted-foreground text-center h-full flex items-center justify-center"
                          style={{ borderColor: `${col.color}40` }}
                        >
                          Select entry
                        </div>
                      );
                    }

                    return (
                      <MatchNode
                        key={col.position}
                        node={node}
                        color={col.color}
                        position={col.position}
                        isHovered={isHovered}
                        isSelected={isSelected}
                        onHover={onMatchHover}
                        onClick={onMatchClick}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
