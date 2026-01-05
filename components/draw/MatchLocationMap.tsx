"use client";

import React from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { scaleLinear } from "d3-scale";

const HOST_CITIES = [
  { name: "Vancouver", coordinates: [-123.1207, 49.2827] },
  { name: "Seattle", coordinates: [-122.3321, 47.6062] },
  { name: "San Francisco", coordinates: [-121.9552, 37.3541] },
  { name: "Los Angeles", coordinates: [-118.3531, 33.9583] },
  { name: "Guadalajara", coordinates: [-103.3496, 20.6597] },
  { name: "Mexico City", coordinates: [-99.1332, 19.4326] },
  { name: "Monterrey", coordinates: [-100.3161, 25.6866] },
  { name: "Houston", coordinates: [-95.3698, 29.7604] },
  { name: "Dallas", coordinates: [-97.1081, 32.7357] },
  { name: "Kansas City", coordinates: [-94.5786, 39.0997] },
  { name: "Atlanta", coordinates: [-84.3880, 33.7490] },
  { name: "Miami", coordinates: [-80.2455, 25.9428] },
  { name: "Toronto", coordinates: [-79.3832, 43.6532] },
  { name: "Boston", coordinates: [-71.2478, 42.0654] },
  { name: "Philadelphia", coordinates: [-75.1652, 39.9526] },
  { name: "New York/NJ", coordinates: [-74.0743, 40.8136] },
];

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export function MatchLocationMap() {
  return (
    <div className="w-full h-[600px] border rounded-lg bg-blue-50 overflow-hidden relative">
      <ComposableMap
        projection="geoAlbers"
        projectionConfig={{
          center: [0, 40], // geoAlbers rotates to center, so this is relative
          rotate: [96, 0, 0], // Longitude rotation to center on US
          scale: 1000,
        }}
        className="w-full h-full"
      >
        <ZoomableGroup center={[-96, 40]} zoom={1} minZoom={0.5} maxZoom={4}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies
                .filter(geo => 
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

          {HOST_CITIES.map(({ name, coordinates }) => (
            <Marker key={name} coordinates={coordinates as [number, number]}>
              <circle r={5} fill="#EF4444" stroke="#fff" strokeWidth={2} />
              <text
                textAnchor="middle"
                y={-10}
                style={{ fontFamily: "system-ui", fill: "#5D5A6D", fontSize: "10px", fontWeight: "bold" }}
              >
                {name}
              </text>
            </Marker>
          ))}
        </ZoomableGroup>
      </ComposableMap>
      
      <div className="absolute bottom-4 right-4 bg-white/90 p-3 rounded-md shadow text-xs pointer-events-none">
        <h4 className="font-bold mb-1">Host Cities</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {HOST_CITIES.map(city => (
                <div key={city.name} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span>{city.name}</span>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
