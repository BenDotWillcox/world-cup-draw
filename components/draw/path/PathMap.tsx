"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup, Line } from "react-simple-maps";
import { HOST_CITIES } from "@/lib/data/venues";
import {
  getGroupMatchesForPosition,
  getMatchVenueCoords,
  type BracketPathNode,
} from "@/lib/engine/path-logic";
import { PATH_COLORS } from "./PathLegend";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface PathSegment {
  key: string;
  from: [number, number];
  to: [number, number];
  color: string;
  dashed: boolean;
  position: 1 | 2 | 3 | "group";
  matchId?: string;
}

interface PathStop {
  key: string;
  coords: [number, number];
  matchId: string;
  position: 1 | 2 | 3 | "group";
  color: string;
  label: string;
}

interface PathMapProps {
  selectedTeamId: string;
  selectedGroup: string;
  selectedPos: number;
  firstPath: BracketPathNode[];
  secondPath: BracketPathNode[];
  thirdPath: BracketPathNode[];
  expandedThirdPlaceMatchId: string | null;
  highlightedPosition: 1 | 2 | 3 | null;
  showGroupStage: boolean;
  selectedStop: string | null;
  hoveredBracketMatch: string | null;
  onStopClick: (matchId: string, position: 1 | 2 | 3 | "group") => void;
}

function buildPathSegments(
  path: BracketPathNode[],
  position: 1 | 2 | 3,
  color: string,
  dashed: boolean,
  lastGroupCoords: [number, number] | null
): { segments: PathSegment[]; stops: PathStop[] } {
  const segments: PathSegment[] = [];
  const stops: PathStop[] = [];

  let prevCoords = lastGroupCoords;

  for (let i = 0; i < path.length; i++) {
    const node = path[i];
    const coords = getMatchVenueCoords(node.matchId);
    if (!coords) continue;

    if (prevCoords) {
      segments.push({
        key: `${position}-seg-${i}`,
        from: prevCoords,
        to: coords,
        color,
        dashed,
        position,
        matchId: node.matchId,
      });
    }

    stops.push({
      key: `${position}-stop-${node.matchId}`,
      coords,
      matchId: node.matchId,
      position,
      color,
      label: node.round.replace("Round of ", "R"),
    });

    prevCoords = coords;
  }

  return { segments, stops };
}

export function PathMap({
  selectedTeamId,
  selectedGroup,
  selectedPos,
  firstPath,
  secondPath,
  thirdPath,
  expandedThirdPlaceMatchId,
  highlightedPosition,
  showGroupStage,
  selectedStop,
  hoveredBracketMatch,
  onStopClick,
}: PathMapProps) {
  // Build group stage segments
  const { groupSegments, groupStops, lastGroupCoords } = useMemo(() => {
    const matchIds = getGroupMatchesForPosition(selectedGroup, selectedPos);
    const segs: PathSegment[] = [];
    const stops: PathStop[] = [];
    let prev: [number, number] | null = null;
    let last: [number, number] | null = null;

    for (let i = 0; i < matchIds.length; i++) {
      const coords = getMatchVenueCoords(matchIds[i]);
      if (!coords) continue;

      if (prev) {
        segs.push({
          key: `group-seg-${i}`,
          from: prev,
          to: coords,
          color: PATH_COLORS.group,
          dashed: false,
          position: "group",
          matchId: matchIds[i],
        });
      }

      stops.push({
        key: `group-stop-${matchIds[i]}`,
        coords,
        matchId: matchIds[i],
        position: "group",
        color: PATH_COLORS.group,
        label: `GS ${i + 1}`,
      });

      prev = coords;
      last = coords;
    }

    return { groupSegments: segs, groupStops: stops, lastGroupCoords: last };
  }, [selectedGroup, selectedPos]);

  // Build knockout path segments
  const { firstSegs, firstStops } = useMemo(() => {
    const { segments, stops } = buildPathSegments(firstPath, 1, PATH_COLORS.first, false, lastGroupCoords);
    return { firstSegs: segments, firstStops: stops };
  }, [firstPath, lastGroupCoords]);

  const { secondSegs, secondStops } = useMemo(() => {
    const { segments, stops } = buildPathSegments(secondPath, 2, PATH_COLORS.second, false, lastGroupCoords);
    return { secondSegs: segments, secondStops: stops };
  }, [secondPath, lastGroupCoords]);

  const { thirdSegs, thirdStops } = useMemo(() => {
    if (expandedThirdPlaceMatchId && thirdPath.length > 0) {
      const { segments, stops } = buildPathSegments(thirdPath, 3, PATH_COLORS.third, true, lastGroupCoords);
      return { thirdSegs: segments, thirdStops: stops };
    }

    return { thirdSegs: [], thirdStops: [] };
  }, [thirdPath, expandedThirdPlaceMatchId, lastGroupCoords]);

  const allSegments = [...groupSegments, ...firstSegs, ...secondSegs, ...thirdSegs];
  const allStops = [...groupStops, ...firstStops, ...secondStops, ...thirdStops];

  function getOpacity(pos: 1 | 2 | 3 | "group") {
    if (pos === "group") return showGroupStage ? 0.9 : 0;
    if (!highlightedPosition) return 0;
    return pos === highlightedPosition ? 1 : 0;
  }

  function getStrokeWidth(seg: PathSegment) {
    const base = seg.position === "group" ? 3.5 : 2.5;
    if (seg.position === "group") return base;
    // Make highlighted path thicker
    if (highlightedPosition === seg.position) return base + 2;
    return base + 1;
  }

  function isStopHighlighted(matchId: string) {
    return matchId === selectedStop || matchId === hoveredBracketMatch;
  }

  // Compute label stacking for stops that share the same city
  // Groups visible stops by coordinate key, assigns each a vertical offset index
  const stopLabelOffsets = useMemo(() => {
    const coordGroups: Record<string, string[]> = {}; // coordKey -> matchId[]

    for (const stop of allStops) {
      // Only count visible stops
      const opacity = stop.position === "group"
        ? (showGroupStage ? 0.9 : 0)
        : (highlightedPosition === stop.position ? 1 : 0);
      if (opacity === 0) continue;

      const coordKey = `${stop.coords[0]},${stop.coords[1]}`;
      if (!coordGroups[coordKey]) coordGroups[coordKey] = [];
      coordGroups[coordKey].push(stop.matchId);
    }

    const offsets: Record<string, { index: number; total: number }> = {};
    for (const matchIds of Object.values(coordGroups)) {
      for (let i = 0; i < matchIds.length; i++) {
        offsets[matchIds[i]] = { index: i, total: matchIds.length };
      }
    }
    return offsets;
  }, [allStops, showGroupStage, highlightedPosition]);

  // Zoom-to-city logic
  const DEFAULT_CENTER: [number, number] = [-96, 40];
  const DEFAULT_ZOOM = 1;
  const ZOOMED_ZOOM = 3;

  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const userPannedRef = useRef(false);

  // Find coords for the selected stop
  const selectedStopCoords = useMemo(() => {
    if (!selectedStop) return null;
    const stop = allStops.find(s => s.matchId === selectedStop);
    return stop?.coords ?? null;
  }, [selectedStop, allStops]);

  useEffect(() => {
    if (selectedStopCoords) {
      userPannedRef.current = false;
      setMapCenter(selectedStopCoords);
      setMapZoom(ZOOMED_ZOOM);
    } else {
      if (!userPannedRef.current) {
        setMapCenter(DEFAULT_CENTER);
        setMapZoom(DEFAULT_ZOOM);
      }
    }
  }, [selectedStopCoords]);

  const handleMoveEnd = (position: { coordinates: [number, number]; zoom: number }) => {
    userPannedRef.current = true;
    setMapCenter(position.coordinates);
    setMapZoom(position.zoom);
  };

  return (
    <div className="w-full h-full relative">
      <ComposableMap
        projection="geoAlbers"
        projectionConfig={{
          center: [0, 40],
          rotate: [96, 0, 0],
          scale: 1000,
        }}
        className="w-full h-full"
      >
        <ZoomableGroup
          center={mapCenter}
          zoom={mapZoom}
          minZoom={0.5}
          maxZoom={4}
          onMoveEnd={handleMoveEnd}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies
                .filter((geo) =>
                  ["United States of America", "Canada", "Mexico"].includes(geo.properties.name)
                )
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

          {/* Path glow (behind main lines) */}
          {allSegments
            .filter(seg => seg.position !== "group" && highlightedPosition === seg.position)
            .map((seg) => (
              <Line
                key={`${seg.key}-glow`}
                from={seg.from}
                to={seg.to}
                stroke={seg.color}
                strokeWidth={getStrokeWidth(seg) + 6}
                strokeOpacity={0.2}
                strokeLinecap="round"
              />
            ))}

          {/* Path segments */}
          {allSegments.map((seg) => (
            <Line
              key={seg.key}
              from={seg.from}
              to={seg.to}
              stroke={seg.color}
              strokeWidth={getStrokeWidth(seg)}
              strokeOpacity={getOpacity(seg.position)}
              strokeLinecap="round"
              style={{
                strokeDasharray: seg.dashed ? "8,4" : "none",
              }}
            />
          ))}

          {/* City dots (background) */}
          {Object.entries(HOST_CITIES).map(([name, coords]) => (
            <Marker key={`city-${name}`} coordinates={coords}>
              <circle r={2.5} fill="#94A3B8" stroke="#fff" strokeWidth={0.5} />
            </Marker>
          ))}

          {/* Path stops (clickable) */}
          {allStops.map((stop) => {
            const highlighted = isStopHighlighted(stop.matchId);
            const opacity = getOpacity(stop.position);
            const isActive = stop.position !== "group" && highlightedPosition === stop.position;
            const stopRadius = stop.position === "group" ? 5 : isActive ? 6 : 4;

            return (
              <Marker
                key={stop.key}
                coordinates={stop.coords}
                onClick={() => onStopClick(stop.matchId, stop.position)}
              >
                {/* Glow behind active stops */}
                {isActive && (
                  <circle r={stopRadius + 5} fill={stop.color} opacity={0.15} />
                )}
                {/* Highlight ring */}
                {highlighted && (
                  <circle r={8} fill="none" stroke={stop.color} strokeWidth={2} opacity={0.5}>
                    <animate attributeName="r" values="8;12;8" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0.2;0.5" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle
                  r={stopRadius}
                  fill={stop.position === "group" ? stop.color : isActive ? stop.color : "white"}
                  stroke={isActive ? "white" : stop.color}
                  strokeWidth={isActive ? 2.5 : 2}
                  opacity={opacity}
                />
                {/* Labels rendered in separate layer on top */}
              </Marker>
            );
          })}

          {/* === Text layers rendered last so they sit on top of all paths === */}

          {/* City name labels */}
          {Object.entries(HOST_CITIES).map(([name, coords]) => (
            <Marker key={`city-label-${name}`} coordinates={coords}>
              <text
                textAnchor="middle"
                y={18}
                style={{
                  fontFamily: "system-ui",
                  fill: "#1e293b",
                  fontSize: "8px",
                  fontWeight: 600,
                  paintOrder: "stroke",
                  stroke: "white",
                  strokeWidth: "3px",
                  strokeLinejoin: "round",
                }}
              >
                {name}
              </text>
            </Marker>
          ))}

          {/* Round labels (stacked per city) */}
          {allStops.map((stop) => {
            const opacity = getOpacity(stop.position);
            if (opacity === 0) return null;
            const isActive = stop.position !== "group" && highlightedPosition === stop.position;
            const offsetInfo = stopLabelOffsets[stop.matchId];
            const stackIndex = offsetInfo?.index ?? 0;
            const stackTotal = offsetInfo?.total ?? 1;
            const labelY = -12 - (stackTotal - 1 - stackIndex) * 12;

            return (
              <Marker
                key={`label-${stop.key}`}
                coordinates={stop.coords}
                onClick={() => onStopClick(stop.matchId, stop.position)}
              >
                <text
                  textAnchor="middle"
                  y={labelY}
                  style={{
                    fontFamily: "system-ui",
                    fill: "#0f172a",
                    fontSize: isActive ? "10px" : "9px",
                    fontWeight: 700,
                    opacity,
                    paintOrder: "stroke",
                    stroke: "white",
                    strokeWidth: "3px",
                    strokeLinejoin: "round",
                    cursor: "pointer",
                  }}
                >
                  {stop.label}
                </text>
              </Marker>
            );
          })}

        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
}
