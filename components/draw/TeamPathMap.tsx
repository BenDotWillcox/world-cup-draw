"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup, Line } from "react-simple-maps";
import { HOST_CITIES } from "@/lib/data/venues";
import { TEAMS } from "@/lib/data/teams";
import { MATCH_SCHEDULE } from "@/lib/data/matches";
import { KNOCKOUT_SCHEDULE } from "@/lib/data/knockout-schedule";
import {
    getWeightedPathEntryPoints,
    getGroupMatchesForPosition,
    getKnockoutFlow,
    getTeamGroupAndPosition,
    resolveMatchOpponents,
    type EnhancedMatchInfo
} from "@/lib/engine/path-logic";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Calendar, Clock, MapPin, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface PathSegment {
    id: string;
    start: [number, number];
    end: [number, number];
    weight: number;
    startTime: number; // Start of travel
    endTime: number;   // End of travel
    roundName: string;
    targetMatchId: string;
}

interface Stop {
    matchId: string;
    coords: [number, number];
    startTime: number; // Start of pause (arrival)
    endTime: number;   // End of pause (departure)
    roundName: string;
    weight: number;
    label: string;
}

const TRAVEL_DURATION = 1.0; 
const PAUSE_DURATION = 2.5;
const LINE_LENGTH_REF = 5000;

export function TeamPathMap() {
    const [selectedTeamId, setSelectedTeamId] = useState<string>("USA");
    const [selectedGroup, setSelectedGroup] = useState<string>("D");
    const [selectedPos, setSelectedPos] = useState<string>("1");

    // Animation State
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const requestRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | undefined>(undefined);

    // Opponent cycling state: tracks selected opponent index per match
    const [opponentSelections, setOpponentSelections] = useState<Record<string, number>>({});

    // Memoized Lookups
    const matchLocationMap = useMemo(() => {
        const map: Record<string, [number, number]> = {};
        [...MATCH_SCHEDULE, ...KNOCKOUT_SCHEDULE].forEach(m => {
            if (HOST_CITIES[m.stadium]) {
                map[m.id] = HOST_CITIES[m.stadium];
            } else if (m.stadium === "New York/NJ") {
                 map[m.id] = HOST_CITIES["New York"];
            }
        });
        return map;
    }, []);

    const knockoutFlow = useMemo(() => getKnockoutFlow(), []);

    const teamFlag = useMemo(() => TEAMS.find(t => t.id === selectedTeamId)?.flagUrl || "/file.svg", [selectedTeamId]);

    // Calculate Path Segments and Stops
    const { segments, stops } = useMemo(() => {
        const segs: PathSegment[] = [];
        const stopsList: Stop[] = [];
        let timeCursor = 0;
        
        // Helper to add stop
        const addStop = (matchId: string, coords: [number, number], round: string, weight: number, label: string) => {
            stopsList.push({
                matchId,
                coords,
                startTime: timeCursor,
                endTime: timeCursor + PAUSE_DURATION,
                roundName: round,
                weight,
                label
            });
            timeCursor += PAUSE_DURATION;
        };

        // 1. Group Matches
        const groupMatches = getGroupMatchesForPosition(selectedGroup, parseInt(selectedPos));
        
        // Initial Stop (First Match)
        if (groupMatches.length > 0) {
            const firstMatchId = groupMatches[0];
            const startCoords = matchLocationMap[firstMatchId];
            if (startCoords) {
                addStop(firstMatchId, startCoords, "Group Stage", 1.0, "GS Match 1");
            }
        }

        for (let i = 0; i < groupMatches.length - 1; i++) {
            const start = matchLocationMap[groupMatches[i]];
            const end = matchLocationMap[groupMatches[i+1]];
            const nextMatchId = groupMatches[i+1];
            
            if (start && end) {
                segs.push({
                    id: `g-${i}`,
                    start,
                    end,
                    weight: 1.0,
                    startTime: timeCursor,
                    endTime: timeCursor + TRAVEL_DURATION,
                    roundName: "Group Stage",
                    targetMatchId: nextMatchId
                });
                timeCursor += TRAVEL_DURATION;
                
                // Add Stop at destination
                addStop(nextMatchId, end, "Group Stage", 1.0, `GS Match ${i + 2}`);
            }
        }

        // 2. Transition to Knockout
        const lastGroupMatch = groupMatches[groupMatches.length - 1];
        const lastGroupCoords = matchLocationMap[lastGroupMatch];
        
        if (!lastGroupCoords) return { segments: segs, stops: stopsList };

        const entryPoints = getWeightedPathEntryPoints(selectedGroup);

        entryPoints.forEach((entry, idx) => {
            const start = lastGroupCoords;
            const end = matchLocationMap[entry.matchId];
            
            // Branch logic needs to synchronize time, so we need a local time cursor for the branch
            // BUT, all branches start at the same time (after last group match stop)
            // So we reset to the global timeCursor (which is at the end of the last group match pause)
            let branchTime = timeCursor;
            
            if (start && end) {
                segs.push({
                    id: `ko-entry-${idx}`,
                    start,
                    end,
                    weight: entry.weight,
                    startTime: branchTime,
                    endTime: branchTime + TRAVEL_DURATION,
                    roundName: "Round of 32",
                    targetMatchId: entry.matchId
                });
                
                branchTime += TRAVEL_DURATION;
                
                // Add Stop (Round of 32)
                stopsList.push({
                    matchId: entry.matchId,
                    coords: end,
                    startTime: branchTime,
                    endTime: branchTime + PAUSE_DURATION,
                    roundName: "Round of 32",
                    weight: entry.weight,
                    label: entry.label.includes("3rd") ? entry.label : `R 32 ${entry.label}`
                });
                branchTime += PAUSE_DURATION;

                // Trace recursively
                let currentMatchId = entry.matchId;
                
                let depth = 0;
                while (depth < 6) { 
                    const nextMatchId = knockoutFlow[currentMatchId];
                    if (!nextMatchId) break;

                    const s = matchLocationMap[currentMatchId];
                    const e = matchLocationMap[nextMatchId];
                    
                    const roundNames = ["Round of 16", "Quarterfinals", "Semifinals", "Final", "Champion"];
                    const rName = roundNames[depth] || "Knockout";

                    if (s && e) {
                         segs.push({
                            id: `ko-trace-${idx}-${depth}`,
                            start: s,
                            end: e,
                            weight: entry.weight, 
                            startTime: branchTime,
                            endTime: branchTime + TRAVEL_DURATION,
                            roundName: rName,
                            targetMatchId: nextMatchId
                        });
                        branchTime += TRAVEL_DURATION;
                        
                        stopsList.push({
                            matchId: nextMatchId,
                            coords: e,
                            startTime: branchTime,
                            endTime: branchTime + PAUSE_DURATION,
                            roundName: rName,
                            weight: entry.weight,
                            label: rName
                        });
                        branchTime += PAUSE_DURATION;
                    }
                    
                    currentMatchId = nextMatchId;
                    depth++;
                }
            }
        });

        return { segments: segs, stops: stopsList };

    }, [selectedGroup, selectedPos, matchLocationMap, knockoutFlow]);

    const maxTime = useMemo(() => {
        const segMax = Math.max(...segments.map(s => s.endTime), 0);
        const stopMax = Math.max(...stops.map(s => s.endTime), 0);
        return Math.max(segMax, stopMax);
    }, [segments, stops]);

    // Enhanced match info cache - pre-compute for all stops
    const enhancedMatchInfoCache = useMemo(() => {
        const cache: Record<string, EnhancedMatchInfo> = {};
        const groupPosCode = `${selectedGroup}${selectedPos}`;

        stops.forEach(stop => {
            cache[stop.matchId] = resolveMatchOpponents(
                stop.matchId,
                selectedTeamId,
                groupPosCode
            );
        });

        return cache;
    }, [selectedGroup, selectedPos, selectedTeamId, stops]);

    // Handler to cycle through opponents
    const handleOpponentCycle = (matchId: string, totalOpponents: number) => {
        if (totalOpponents <= 1) return;

        setOpponentSelections(prev => ({
            ...prev,
            [matchId]: ((prev[matchId] || 0) + 1) % totalOpponents
        }));
    };

    // Animation Loop
    const animate = (time: number) => {
        if (startTimeRef.current === undefined) {
            // Adjust start time to account for already elapsed time (resume)
            // Use the currentTime from the closure (state at moment of Play click)
            startTimeRef.current = time - (currentTime * 1000);
        }
        const start = startTimeRef.current;
        const elapsed = (time - start) / 1000;
        
        if (elapsed < maxTime + 0.5) { 
            setCurrentTime(elapsed);
            requestRef.current = requestAnimationFrame(animate);
        } else {
            setCurrentTime(maxTime + 0.5); // Ensure we finish
            setIsPlaying(false);
            startTimeRef.current = undefined;
        }
    };

    const handlePlay = () => {
        if (currentTime >= maxTime) {
            setCurrentTime(0);
        }
        setIsPlaying(true);
        startTimeRef.current = undefined;
        requestRef.current = requestAnimationFrame(animate);
    };

    const handlePause = () => {
        setIsPlaying(false);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        startTimeRef.current = undefined;
    };

    const handleReset = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };

    useEffect(() => {
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    useEffect(() => {
        const info = getTeamGroupAndPosition(selectedTeamId);
        if (info) {
            setSelectedGroup(info.group);
            setSelectedPos(info.position.toString());
        }
        setOpponentSelections({}); // Reset opponent selections for new team
        handleReset();
    }, [selectedTeamId]);

    const getCurrentRound = () => {
        // Check stops first
        const activeStop = stops.find(s => currentTime >= s.startTime && currentTime < s.endTime);
        if (activeStop) return activeStop.roundName;
        
        // Check segments
        const activeSeg = segments.find(s => currentTime >= s.startTime && currentTime < s.endTime);
        if (activeSeg) return activeSeg.roundName;

        if (currentTime >= maxTime) return "Final";
        return "Ready";
    };

    const currentRound = getCurrentRound();

    // Calculate Flag Positions
    const activeFlags = useMemo(() => {
        const flags: { id: string, coords: [number, number], weight: number, label?: string }[] = [];
        
        // 1. Are we in a stop?
        const activeStops = stops.filter(s => currentTime >= s.startTime && currentTime <= s.endTime);
        if (activeStops.length > 0) {
            activeStops.forEach(s => {
                flags.push({ id: s.matchId, coords: s.coords, weight: s.weight, label: s.label });
            });
            return flags;
        }

        // 2. Are we travelling?
        const activeSegs = segments.filter(s => currentTime >= s.startTime && currentTime <= s.endTime);
        activeSegs.forEach(seg => {
            const p = Math.max(0, Math.min(1, (currentTime - seg.startTime) / (seg.endTime - seg.startTime)));
            const lng = seg.start[0] + (seg.end[0] - seg.start[0]) * p;
            const lat = seg.start[1] + (seg.end[1] - seg.start[1]) * p;
            flags.push({ id: seg.id, coords: [lng, lat], weight: seg.weight });
        });

        // 3. Start or End Fallbacks
        if (flags.length === 0) {
             if (currentTime === 0 && stops.length > 0) {
                  // Usually captured by first stop logic, but just in case
                  flags.push({ id: 'start', coords: stops[0].coords, weight: 1, label: stops[0].label });
             } else if (currentTime >= maxTime) {
                  // Show all final stops
                  const finalStops = stops.filter(s => Math.abs(s.endTime - maxTime) < 0.1 || s.endTime === maxTime);
                  // If no exact match, just take the very last ones
                  if (finalStops.length > 0) {
                      finalStops.forEach(s => flags.push({ id: s.matchId, coords: s.coords, weight: s.weight, label: s.label }));
                  } else {
                      // Fallback to last segments end
                      segments.filter(s => s.endTime === maxTime).forEach(s => {
                           flags.push({ id: s.id, coords: s.end, weight: s.weight });
                      });
                  }
             }
        }
        
        return flags;
    }, [currentTime, segments, stops, maxTime]);

    // Current Match Card Info - uses enhanced cache
    const activeMatchData = useMemo(() => {
        // Find the active stop with highest weight if multiple
        const activeStops = stops.filter(s => currentTime >= s.startTime && currentTime < s.endTime);
        if (activeStops.length === 0) return null;

        const activeStop = activeStops.reduce((best, curr) =>
            curr.weight > best.weight ? curr : best
        );

        const matchInfo = enhancedMatchInfoCache[activeStop.matchId];
        if (!matchInfo) return null;

        return {
            matchId: activeStop.matchId,
            matchInfo,
            weight: activeStop.weight
        };
    }, [currentTime, stops, enhancedMatchInfoCache]);

    // Opponent highlight - shows opponent's location on map when cycling
    const opponentHighlight = useMemo(() => {
        if (!activeMatchData || activeMatchData.matchInfo.matchType !== 'probabilistic') return null;
        if (activeMatchData.matchInfo.opponents.length === 0) return null;

        const selectedIdx = opponentSelections[activeMatchData.matchId] || 0;
        const selectedOpponent = activeMatchData.matchInfo.opponents[selectedIdx];
        if (!selectedOpponent) return null;

        // Find opponent's group position and first match location
        const opponentInfo = getTeamGroupAndPosition(selectedOpponent.teamId);
        if (!opponentInfo) return null;

        const opponentMatches = getGroupMatchesForPosition(opponentInfo.group, opponentInfo.position);
        if (opponentMatches.length === 0) return null;

        const firstMatchCoords = matchLocationMap[opponentMatches[0]];
        if (!firstMatchCoords) return null;

        return {
            coords: firstMatchCoords,
            teamName: selectedOpponent.teamName,
            flagUrl: selectedOpponent.flagUrl
        };
    }, [activeMatchData, opponentSelections, matchLocationMap]);


    return (
        <Card className="w-full relative">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Team Path Visualizer</CardTitle>
                    <div className="text-xl font-bold text-blue-600 bg-blue-50 px-4 py-1 rounded">
                        {currentRound}
                    </div>
                </div>
                <div className="flex gap-4 flex-wrap items-center">
                     <div className="w-[200px]">
                        <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Team" />
                            </SelectTrigger>
                            <SelectContent>
                                {TEAMS.sort((a,b) => a.name.localeCompare(b.name)).map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                     </div>
                     <div className="flex gap-2">
                        {!isPlaying ? (
                            <Button onClick={handlePlay} size="sm" className="gap-2">
                                <Play className="h-4 w-4" /> {currentTime > 0 && currentTime < maxTime ? "Resume" : "Play Animation"}
                            </Button>
                        ) : (
                            <Button onClick={handlePause} size="sm" variant="secondary" className="gap-2">
                                <Pause className="h-4 w-4" /> Pause
                            </Button>
                        )}
                        <Button onClick={handleReset} variant="outline" size="sm" className="gap-2">
                            <RotateCcw className="h-4 w-4" /> Reset
                        </Button>
                     </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="w-full h-[600px] border rounded-lg bg-blue-50 overflow-hidden relative">
                    <ComposableMap
                        projection="geoAlbers"
                        projectionConfig={{
                            center: [0, 40],
                            rotate: [96, 0, 0],
                            scale: 1000,
                        }}
                        className="w-full h-full"
                    >
                        <ZoomableGroup center={[-96, 40]} zoom={1} minZoom={0.5} maxZoom={4}>
                            <defs>
                                <marker id="arrow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto" markerUnits="strokeWidth">
                                    <path d="M0,0 L0,6 L6,3 z" fill="#2563EB" opacity="0.7" />
                                </marker>
                                <marker id="arrow-purple" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto" markerUnits="strokeWidth">
                                    <path d="M0,0 L0,6 L6,3 z" fill="#7C3AED" opacity="0.7" />
                                </marker>
                            </defs>
                            
                            <Geographies geography={geoUrl}>
                                {({ geographies }) =>
                                    geographies
                                        .filter(geo => ["United States of America", "Canada", "Mexico"].includes(geo.properties.name))
                                        .map((geo) => (
                                            <Geography
                                                key={geo.rsmKey}
                                                geography={geo}
                                                fill="#EAEAEC"
                                                stroke="#D6D6DA"
                                                style={{
                                                    default: { outline: "none" },
                                                    hover: { outline: "none", fill: "#D6D6DA" },
                                                    pressed: { outline: "none" },
                                                }}
                                            />
                                        ))
                                }
                            </Geographies>

                            {/* Lines - solid for group stage, dashed for knockout */}
                            {segments.map(seg => {
                                let offset = LINE_LENGTH_REF;
                                if (currentTime >= seg.endTime) {
                                    offset = 0;
                                } else if (currentTime > seg.startTime) {
                                    const p = (currentTime - seg.startTime) / (seg.endTime - seg.startTime);
                                    offset = LINE_LENGTH_REF * (1 - p);
                                } else {
                                    offset = LINE_LENGTH_REF;
                                }

                                const opacity = currentTime > seg.startTime ? 0.7 : 0;
                                const isGroupStage = seg.roundName === "Group Stage";

                                // Different colors: blue for confirmed, purple for probabilistic
                                const strokeColor = isGroupStage ? "#2563EB" : "#7C3AED";

                                return (
                                    <Line
                                        key={seg.id}
                                        from={seg.start}
                                        to={seg.end}
                                        stroke={strokeColor}
                                        strokeWidth={Math.max(1.5, seg.weight * 6)}
                                        strokeOpacity={opacity}
                                        strokeLinecap="round"
                                        markerEnd={offset < 50 ? (isGroupStage ? "url(#arrow)" : "url(#arrow-purple)") : undefined}
                                        style={{
                                            // For knockout (probabilistic), use dashed pattern
                                            strokeDasharray: isGroupStage ? LINE_LENGTH_REF : `8,4`,
                                            strokeDashoffset: isGroupStage ? offset : 0,
                                            transition: isPlaying ? 'none' : 'stroke-dashoffset 0.1s linear'
                                        }}
                                    />
                                );
                            })}

                            {/* City Markers */}
                            {Object.entries(HOST_CITIES).map(([name, coords]) => (
                                <Marker key={name} coordinates={coords}>
                                    <circle r={3} fill="#EF4444" stroke="#fff" strokeWidth={1} />
                                    <text
                                        textAnchor="middle"
                                        y={10}
                                        style={{
                                            fontFamily: "system-ui",
                                            fill: "#555",
                                            fontSize: "8px",
                                            fontWeight: 600,
                                        }}
                                    >
                                        {name}
                                    </text>
                                </Marker>
                            ))}
                            
                            {/* Animated Flags */}
                            {activeFlags.map((flag, i) => (
                                <Marker key={`flag-${flag.id}-${i}`} coordinates={flag.coords}>
                                    <g transform={`translate(-12, -24)`}>
                                        <image
                                            href={teamFlag}
                                            width={24 * (0.5 + 0.5 * flag.weight)} // Scale by weight
                                            height={16 * (0.5 + 0.5 * flag.weight)}
                                            preserveAspectRatio="none"
                                            style={{
                                                opacity: 0.9,
                                                filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,0.3))'
                                            }}
                                        />
                                        {/* Pole */}
                                        <line x1="0" y1="0" x2="0" y2={24} stroke="#333" strokeWidth="1" />
                                        {/* Label */}
                                        {flag.label && (
                                            <text
                                                textAnchor="middle"
                                                x="0"
                                                y="32"
                                                style={{
                                                    fontFamily: "system-ui",
                                                    fill: "#1e3a8a",
                                                    fontSize: "8px",
                                                    fontWeight: 700,
                                                    textShadow: "0px 0px 4px white"
                                                }}
                                            >
                                                {flag.label}
                                            </text>
                                        )}
                                    </g>
                                </Marker>
                            ))}

                            {/* Opponent Highlight - shows potential opponent's location */}
                            {opponentHighlight && (
                                <Marker coordinates={opponentHighlight.coords}>
                                    <g transform="translate(-12, -32)">
                                        {/* Glow effect */}
                                        <circle cx="12" cy="24" r="20" fill="#7C3AED" opacity="0.15" />
                                        <circle cx="12" cy="24" r="14" fill="#7C3AED" opacity="0.25" />
                                        {/* Flag */}
                                        {opponentHighlight.flagUrl && (
                                            <image
                                                href={opponentHighlight.flagUrl}
                                                width={24}
                                                height={16}
                                                preserveAspectRatio="none"
                                                style={{
                                                    filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.4))'
                                                }}
                                            />
                                        )}
                                        {/* Pole */}
                                        <line x1="0" y1="0" x2="0" y2={24} stroke="#7C3AED" strokeWidth="2" />
                                        {/* Label */}
                                        <text
                                            textAnchor="middle"
                                            x="12"
                                            y="42"
                                            style={{
                                                fontFamily: "system-ui",
                                                fill: "#7C3AED",
                                                fontSize: "9px",
                                                fontWeight: 700,
                                                textShadow: "0px 0px 4px white, 0px 0px 4px white"
                                            }}
                                        >
                                            {opponentHighlight.teamName}
                                        </text>
                                    </g>
                                </Marker>
                            )}

                        </ZoomableGroup>
                    </ComposableMap>
                    
                    {/* Match Info Card Overlay */}
                    {activeMatchData && (
                        <Card className="absolute top-4 right-4 w-72 shadow-lg animate-in fade-in zoom-in duration-300">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between gap-2">
                                    <CardTitle className="text-lg">{activeMatchData.matchInfo.round}</CardTitle>
                                    <Badge variant={activeMatchData.matchInfo.matchType === 'scheduled' ? 'default' : 'secondary'}>
                                        {activeMatchData.matchInfo.matchType === 'scheduled' ? 'Scheduled' : 'Most Likely'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {/* Date/Time row */}
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="h-4 w-4" />
                                        <span>{activeMatchData.matchInfo.date}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="h-4 w-4" />
                                        <span>{activeMatchData.matchInfo.time}</span>
                                    </div>
                                </div>

                                {/* Opponents display */}
                                {activeMatchData.matchInfo.opponents.length > 0 && (() => {
                                    const selectedIdx = opponentSelections[activeMatchData.matchId] || 0;
                                    const selectedOpponent = activeMatchData.matchInfo.opponents[selectedIdx];
                                    const hasMultiple = activeMatchData.matchInfo.opponents.length > 1;

                                    return (
                                        <div
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-lg border bg-muted/50",
                                                hasMultiple && "cursor-pointer hover:bg-muted transition-colors"
                                            )}
                                            onClick={hasMultiple ? () => handleOpponentCycle(activeMatchData.matchId, activeMatchData.matchInfo.opponents.length) : undefined}
                                        >
                                            {selectedOpponent.flagUrl && (
                                                <img
                                                    src={selectedOpponent.flagUrl}
                                                    alt={selectedOpponent.teamName}
                                                    className="w-10 h-6 object-cover rounded border shadow-sm"
                                                />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold truncate">{selectedOpponent.teamName}</div>
                                                {activeMatchData.matchInfo.matchType === 'probabilistic' && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {selectedOpponent.probability.toFixed(1)}% probability
                                                    </div>
                                                )}
                                            </div>
                                            {hasMultiple && (
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <span>{selectedIdx + 1}/{activeMatchData.matchInfo.opponents.length}</span>
                                                    <ChevronRight className="h-3 w-3" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Top 3 opponents list for probabilistic matches */}
                                {activeMatchData.matchInfo.matchType === 'probabilistic' && activeMatchData.matchInfo.opponents.length > 1 && (
                                    <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                                        <div className="font-medium text-foreground">Top opponents:</div>
                                        {activeMatchData.matchInfo.opponents.map((opp, idx) => (
                                            <div
                                                key={opp.teamId}
                                                className={cn(
                                                    "flex justify-between",
                                                    idx === (opponentSelections[activeMatchData.matchId] || 0) && "font-medium text-foreground"
                                                )}
                                            >
                                                <span>{opp.teamName}</span>
                                                <span>{opp.probability.toFixed(1)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Stadium */}
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t">
                                    <MapPin className="h-3 w-3" />
                                    <span>{activeMatchData.matchInfo.stadium}</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Legend */}
                    <Card className="absolute bottom-4 left-4 w-52 shadow-md">
                        <CardContent className="p-3 space-y-2">
                            <h4 className="font-semibold text-sm text-foreground">Path Legend</h4>
                            <div className="space-y-2 text-xs">
                                {/* Group stage - solid blue */}
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-1.5 bg-blue-600 rounded" />
                                    <span className="text-foreground">Group Stage (100%)</span>
                                </div>
                                {/* Knockout - dashed purple */}
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-8 h-1.5 rounded"
                                        style={{
                                            background: 'repeating-linear-gradient(90deg, #7C3AED 0, #7C3AED 4px, transparent 4px, transparent 8px)'
                                        }}
                                    />
                                    <span className="text-foreground">Knockout (Probabilistic)</span>
                                </div>
                                {/* Weight explanation */}
                                <div className="flex items-center gap-2 pt-1 border-t">
                                    <div className="w-8 h-0.5 bg-purple-600/60 rounded" />
                                    <span className="text-muted-foreground">Thinner = Lower probability</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
    );
}
