"use client";

import React, { useState, useMemo, useCallback } from "react";
import { TEAMS } from "@/lib/data/teams";
import {
  getTeamGroupAndPosition,
  getGroupMatchesForPosition,
  getFullBracketPath,
  computeTravelStats,
  getThirdPlaceCollapsedInfo,
  enrichPathWithProbabilities,
  type BracketPathNode,
} from "@/lib/engine/path-logic";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { resolvePath } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PathMap } from "./path/PathMap";
import { BracketMiniView } from "./path/BracketMiniView";
import { StopPopover } from "./path/StopPopover";
import { TravelStatsBar } from "./path/TravelStatsBar";
import { PathLegend } from "./path/PathLegend";
import { PATH_COLORS } from "./path/PathLegend";

export function TeamPathMap() {
  const [selectedTeamId, setSelectedTeamId] = useState<string>("USA");
  const [highlightedPosition, setHighlightedPosition] = useState<1 | 2 | 3 | null>(null);
  const [selectedStop, setSelectedStop] = useState<string | null>(null);
  const [selectedStopPosition, setSelectedStopPosition] = useState<1 | 2 | 3 | "group">("group");
  const [expandedThirdPlaceMatchId, setExpandedThirdPlaceMatchId] = useState<string | null>(null);
  const [hoveredBracketMatch, setHoveredBracketMatch] = useState<string | null>(null);
  const [showThirdPlaceOptions, setShowThirdPlaceOptions] = useState(false);
  const [showGroupStage, setShowGroupStage] = useState(true);

  // Derive group and position from selected team
  const teamInfo = useMemo(() => getTeamGroupAndPosition(selectedTeamId), [selectedTeamId]);
  const selectedGroup = teamInfo?.group ?? "A";
  const selectedPos = teamInfo?.position ?? 1;

  // Build knockout paths, enriched with Elo-based opponent probabilities
  const firstPath = useMemo(
    () => enrichPathWithProbabilities(selectedTeamId, getFullBracketPath(selectedGroup, 1)),
    [selectedGroup, selectedTeamId]
  );
  const secondPath = useMemo(
    () => enrichPathWithProbabilities(selectedTeamId, getFullBracketPath(selectedGroup, 2)),
    [selectedGroup, selectedTeamId]
  );
  const thirdPlaceInfo = useMemo(
    () => getThirdPlaceCollapsedInfo(selectedGroup),
    [selectedGroup]
  );
  const thirdPath = useMemo(
    () =>
      expandedThirdPlaceMatchId
        ? enrichPathWithProbabilities(selectedTeamId, getFullBracketPath(selectedGroup, 3, expandedThirdPlaceMatchId))
        : [],
    [selectedGroup, selectedTeamId, expandedThirdPlaceMatchId]
  );

  // Travel stats — group matches + knockout path
  const groupMatchIds = useMemo(
    () => getGroupMatchesForPosition(selectedGroup, selectedPos),
    [selectedGroup, selectedPos]
  );

  const firstStats = useMemo(
    () => computeTravelStats([...groupMatchIds, ...firstPath.map((n) => n.matchId)]),
    [groupMatchIds, firstPath]
  );
  const secondStats = useMemo(
    () => computeTravelStats([...groupMatchIds, ...secondPath.map((n) => n.matchId)]),
    [groupMatchIds, secondPath]
  );
  const thirdStats = useMemo(
    () =>
      thirdPath.length > 0
        ? computeTravelStats([...groupMatchIds, ...thirdPath.map((n) => n.matchId)])
        : null,
    [groupMatchIds, thirdPath]
  );

  // Reset state on team change using derived state pattern
  const [prevTeamId, setPrevTeamId] = useState(selectedTeamId);
  if (prevTeamId !== selectedTeamId) {
    setPrevTeamId(selectedTeamId);
    setHighlightedPosition(null);
    setSelectedStop(null);
    setExpandedThirdPlaceMatchId(null);
    setShowThirdPlaceOptions(false);
  }

  const handlePositionToggle = useCallback((pos: 1 | 2 | 3) => {
    setHighlightedPosition((prev) => {
      if (prev === pos) {
        // Toggling off
        if (pos === 3) {
          setExpandedThirdPlaceMatchId(null);
          setShowThirdPlaceOptions(false);
        }
        return null;
      }
      // Toggling on
      if (pos === 3) {
        setShowThirdPlaceOptions(true);
      }
      return pos;
    });
    setSelectedStop(null);
  }, []);

  const handleStopClick = useCallback(
    (matchId: string, position: 1 | 2 | 3 | "group") => {
      if (selectedStop === matchId) {
        setSelectedStop(null);
      } else {
        setSelectedStop(matchId);
        setSelectedStopPosition(position);
      }
    },
    [selectedStop]
  );

  const handleBracketMatchClick = useCallback(
    (matchId: string, position: 1 | 2 | 3) => {
      setSelectedStop(matchId);
      setSelectedStopPosition(position);
    },
    []
  );

  const handleExpandThirdPlace = useCallback((matchId: string) => {
    setExpandedThirdPlaceMatchId(matchId);
    setShowThirdPlaceOptions(false);
    setHighlightedPosition(3);
  }, []);

  // Find the actual stop node for the popover
  let popoverNode: { node: BracketPathNode; position: 1 | 2 | 3 } | null = null;
  if (selectedStop && selectedStopPosition !== "group") {
    const firstMatch = firstPath.find((n) => n.matchId === selectedStop);
    const secondMatch = secondPath.find((n) => n.matchId === selectedStop);
    const thirdMatch = thirdPath.find((n) => n.matchId === selectedStop);
    if (firstMatch) popoverNode = { node: firstMatch, position: 1 };
    else if (secondMatch) popoverNode = { node: secondMatch, position: 2 };
    else if (thirdMatch) popoverNode = { node: thirdMatch, position: 3 };
  }

  const positionButtons: Array<{ pos: 1 | 2 | 3; label: string; color: string }> = [
    { pos: 1, label: "1st Place", color: PATH_COLORS.first },
    { pos: 2, label: "2nd Place", color: PATH_COLORS.second },
    { pos: 3, label: "3rd Place", color: PATH_COLORS.third },
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Team Path Visualizer</CardTitle>
        <p className="text-sm text-muted-foreground">
          Select a team to visualize their World Cup path.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Team selector + position toggles */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-[220px]">
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Select Team" />
              </SelectTrigger>
              <SelectContent>
                {TEAMS.sort((a, b) => a.name.localeCompare(b.name)).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex items-center gap-2">
                      <img src={resolvePath(t.flagUrl)} alt={t.id} className="w-5 h-3 object-cover border" />
                      <span>{t.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={showGroupStage ? "default" : "outline"}
              size="sm"
              onClick={() => setShowGroupStage(prev => !prev)}
              style={
                showGroupStage
                  ? { backgroundColor: PATH_COLORS.group, borderColor: PATH_COLORS.group }
                  : { borderColor: `${PATH_COLORS.group}60`, color: PATH_COLORS.group }
              }
              className="gap-1.5"
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: PATH_COLORS.group }}
              />
              Group Stage
            </Button>
            {positionButtons.map(({ pos, label, color }) => (
              <Button
                key={pos}
                variant={highlightedPosition === pos ? "default" : "outline"}
                size="sm"
                onClick={() => handlePositionToggle(pos)}
                style={
                  highlightedPosition === pos
                    ? { backgroundColor: color, borderColor: color }
                    : { borderColor: `${color}60`, color }
                }
                className="gap-1.5"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {label}
              </Button>
            ))}
          </div>
          {/* 3rd place entry point selector */}
          {highlightedPosition === 3 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Entry:
              </span>
              {thirdPlaceInfo.possibleMatchIds.map((mid, i) => (
                <Button
                  key={mid}
                  variant={expandedThirdPlaceMatchId === mid ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7"
                  style={
                    expandedThirdPlaceMatchId === mid
                      ? { backgroundColor: PATH_COLORS.third, borderColor: PATH_COLORS.third }
                      : { borderColor: `${PATH_COLORS.third}60`, color: PATH_COLORS.third }
                  }
                  onClick={() => handleExpandThirdPlace(mid)}
                >
                  {mid} — {thirdPlaceInfo.possibleVenues[i]}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Map + Bracket side by side */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Map */}
          <div className="flex-[3] min-w-0">
            <div className="relative h-[500px] border rounded-lg bg-blue-50 overflow-hidden">
              <PathMap
                selectedTeamId={selectedTeamId}
                selectedGroup={selectedGroup}
                selectedPos={selectedPos}
                firstPath={firstPath}
                secondPath={secondPath}
                thirdPath={thirdPath}
                expandedThirdPlaceMatchId={expandedThirdPlaceMatchId}
                highlightedPosition={highlightedPosition}
                showGroupStage={showGroupStage}
                selectedStop={selectedStop}
                hoveredBracketMatch={hoveredBracketMatch}
                onStopClick={handleStopClick}
              />

              {/* Legend overlay */}
              <div className="absolute bottom-3 right-3">
                <PathLegend />
              </div>

              {/* Stop popover overlay */}
              {popoverNode && (
                <div className="absolute top-3 right-3 z-10">
                  <StopPopover
                    node={popoverNode.node}
                    position={popoverNode.position}
                    onClose={() => setSelectedStop(null)}
                  />
                </div>
              )}

            </div>
          </div>

          {/* Bracket */}
          <div className="flex-[2] min-w-0">
            <div className="border rounded-lg overflow-hidden bg-card p-2 lg:h-[500px]">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-2">
                Knockout Bracket — Group {selectedGroup}
              </h3>
              <BracketMiniView
                firstPath={firstPath}
                secondPath={secondPath}
                thirdPath={thirdPath}
                thirdPlaceInfo={thirdPlaceInfo}
                expandedThirdPlaceMatchId={expandedThirdPlaceMatchId}
                highlightedPosition={highlightedPosition}
                hoveredBracketMatch={hoveredBracketMatch}
                selectedStop={selectedStop}
                onMatchHover={setHoveredBracketMatch}
                onMatchClick={handleBracketMatchClick}
                onExpandThirdPlace={handleExpandThirdPlace}
              />
            </div>
          </div>
        </div>

        {/* Travel stats */}
        <TravelStatsBar
          firstStats={firstStats}
          secondStats={secondStats}
          thirdStats={thirdStats}
          highlightedPosition={highlightedPosition}
        />
      </CardContent>
    </Card>
  );
}
