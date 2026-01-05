"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup, Line } from "react-simple-maps";
import { HOST_CITIES } from "@/lib/data/venues";
import { TEAMS } from "@/lib/data/teams";
import { MATCH_SCHEDULE } from "@/lib/data/matches";
import { KNOCKOUT_SCHEDULE } from "@/lib/data/knockout-schedule";
import { OFFICIAL_GROUPS } from "@/lib/data/official-draw";
import {
    getWeightedPathEntryPoints, 
    getGroupMatchesForPosition, 
    getKnockoutFlow,
    getTeamGroupAndPosition
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
import { Play, Pause, RotateCcw, Calendar, Clock, Trophy } from "lucide-react";

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
    
    const allMatches = useMemo(() => [...MATCH_SCHEDULE, ...KNOCKOUT_SCHEDULE], []);

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

    // Current Match Card Info
    const activeMatchInfo = useMemo(() => {
        const activeStop = stops.find(s => currentTime >= s.startTime && currentTime < s.endTime && s.weight === Math.max(...stops.filter(st => currentTime >= st.startTime && currentTime < st.endTime).map(x => x.weight)));
        
        if (!activeStop) return null;

        const match = allMatches.find(m => m.id === activeStop.matchId);
        if (!match) return null;
        
        // Opponent Logic
        let opponent = "TBD";
        const groupPosCode = `${selectedGroup}${selectedPos}`;
        if (match.t1 === groupPosCode && match.t2 !== '?') opponent = match.t2;
        else if (match.t2 === groupPosCode && match.t1 !== '?') opponent = match.t1;
        else if (match.placeholderT1 && match.placeholderT2) {
             // Basic placeholder logic
             // If we are T1, opponent is T2
             if (match.placeholderT1.includes(groupPosCode)) opponent = match.placeholderT2;
             else if (match.placeholderT2.includes(groupPosCode)) opponent = match.placeholderT1;
             else opponent = match.placeholderT2; // Guess
        }

        // Try to resolve team name if known
        let opponentName = opponent;
        
        // Check if opponent is a valid group position code like "A1", "D2"
        if (/^[A-L][1-4]$/.test(opponent)) {
             const groupName = opponent[0];
             const posIdx = parseInt(opponent[1]) - 1;
             const group = OFFICIAL_GROUPS.find(g => g.name === groupName);
             if (group && group.teams[posIdx]) {
                 opponentName = group.teams[posIdx]!.name;
             }
        } else {
             // Check if it is a team ID directly
             const t = TEAMS.find(team => team.id === opponent);
             if (t) opponentName = t.name;
        }

        return {
            date: match.date,
            time: match.time,
            stadium: match.stadium,
            opponent: opponentName,
            round: activeStop.roundName
        };
    }, [currentTime, stops, allMatches, selectedGroup, selectedPos]);


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
                                    <path d="M0,0 L0,6 L6,3 z" fill="#2563EB" opacity="0.6" />
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

                            {/* Lines */}
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
                                
                                const opacity = currentTime > seg.startTime ? 0.6 : 0;
                                
                                return (
                                    <Line
                                        key={seg.id}
                                        from={seg.start}
                                        to={seg.end}
                                        stroke="#2563EB"
                                        strokeWidth={Math.max(1.5, seg.weight * 6)}
                                        strokeOpacity={opacity}
                                        strokeLinecap="round"
                                        markerEnd={offset < 50 ? "url(#arrow)" : undefined}
                                        style={{
                                            strokeDasharray: LINE_LENGTH_REF,
                                            strokeDashoffset: offset,
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

                        </ZoomableGroup>
                    </ComposableMap>
                    
                    {/* Match Info Card Overlay */}
                    {activeMatchInfo && (
                        <div className="absolute top-4 right-4 bg-white/95 p-4 rounded-lg shadow-lg border border-gray-200 w-64 animate-in fade-in zoom-in duration-300">
                             <h3 className="font-bold text-lg mb-2 text-blue-800 border-b pb-1">{activeMatchInfo.round}</h3>
                             <div className="space-y-2 text-sm">
                                 <div className="flex items-center gap-2">
                                     <Calendar className="w-4 h-4 text-gray-500" />
                                     <span>{activeMatchInfo.date}</span>
                                 </div>
                                 <div className="flex items-center gap-2">
                                     <Clock className="w-4 h-4 text-gray-500" />
                                     <span>{activeMatchInfo.time}</span>
                                 </div>
                                 <div className="flex items-center gap-2">
                                     <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">VS</div>
                                     <span className="font-semibold">{activeMatchInfo.opponent}</span>
                                 </div>
                                 <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
                                     @{activeMatchInfo.stadium}
                                 </div>
                             </div>
                        </div>
                    )}

                     {/* Legend */}
                    <div className="absolute bottom-4 left-4 bg-white/90 p-3 rounded-md shadow text-xs pointer-events-none">
                        <h4 className="font-bold mb-2">Path Probability</h4>
                        <div className="flex flex-col gap-2">
                             <div className="flex items-center gap-2">
                                <div className="h-1 bg-blue-600 opacity-60 w-8 rounded" style={{ height: '6px' }}></div>
                                <span>100% (Confirmed)</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <div className="h-1 bg-blue-600 opacity-60 w-8 rounded" style={{ height: '2px' }}></div>
                                <span>33% (Group Outcome)</span>
                             </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
