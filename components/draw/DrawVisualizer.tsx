"use client";

import React, { useMemo } from 'react';
import { useDrawSimulation } from '@/hooks/use-draw-simulation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Team } from '@/types/draw';
import { TEAMS } from '@/lib/data/teams';

export function DrawVisualizer() {
  const { 
    groups, 
    startDraw, 
    nextStep, 
    reset, 
    currentTeam, 
    isRunning,
    currentPot,
    scanningGroupIndex,
    scanningStatus
  } = useDrawSimulation();

  // We start with all TEAMS.
  // Filter out hosts (they are pre-placed).
  // Filter out teams that are in the `groups` state? 
  // Actually, useDrawSimulation now manages `availableTeams` internally, 
  // but for the Pot display, we want to show teams that are NOT yet in a group.
  const drawnTeamIds = useMemo(() => {
    const ids = new Set<string>();
    groups.forEach(g => {
        g.teams.forEach(t => {
            if (t) ids.add(t.id);
        });
    });
    // Also include the currently processing team so it disappears from the pot list
    if (currentTeam) ids.add(currentTeam.id);
    
    return ids;
  }, [groups, currentTeam]);

  // Determine if team is a placeholder
  const isPlaceholder = (team: Team) => !team.flagUrl;
  const isFifaPlayoff = (team: Team) => team.id.startsWith('PO_FIFA');
  const isUefaPlayoff = (team: Team) => team.id.startsWith('PO_UEFA');

  const renderFlag = (team: Team) => {
    if (team.flagUrl) {
        return (
            <img src={team.flagUrl} alt={team.name} className="w-6 h-4 object-cover rounded-sm shadow-sm" />
        );
    }
    
    if (isUefaPlayoff(team)) {
        return <div className="w-3 h-3 bg-white rounded-full mx-1.5"></div>;
    }

    if (isFifaPlayoff(team)) {
         return <div className="w-3 h-3 bg-blue-500 rounded-full mx-1.5"></div>;
    }
    
    return <div className="w-3 h-3 bg-gray-500 rounded-full mx-1.5"></div>;
  };

  return (
    <div className="space-y-6 w-full">
       {/* Pots Display (4 columns) - Moved Above Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(potNum => {
                const potTeams = TEAMS.filter(t => t.pot === potNum && !drawnTeamIds.has(t.id));
                return (
                    <div key={potNum} className="border rounded-xl p-4 bg-card/50">
                        <div className="text-center mb-3 font-semibold text-muted-foreground">Pot {potNum}</div>
                        <div className="space-y-1.5">
                            {potTeams.length > 0 ? potTeams.map(team => (
                            <div key={team.id} className="flex items-center gap-3 p-2 rounded-md bg-background/50 border border-border/50 text-sm shadow-sm">
                                <div className="flex-shrink-0">
                                    {renderFlag(team)}
                                </div>
                                <span className={`font-medium truncate ${isPlaceholder(team) ? 'text-muted-foreground' : ''}`}>
                                    {team.name}
                                </span>
                            </div>
                            )) : (
                                <div className="text-center py-4 text-xs text-muted-foreground italic opacity-50">
                                    Empty
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card p-4 rounded-lg border shadow-sm min-h-[120px]">
        <div className="space-y-1 w-full md:w-1/3">
            <h2 className="text-2xl font-bold">Draw Simulator</h2>
            <p className="text-muted-foreground text-sm">
              {isRunning 
                ? `Drawing Pot ${currentPot}` 
                : "Ready to Start"}
            </p>
        </div>

        {/* Center: Just Drawn Team */}
        <div className="w-full md:w-1/3 flex justify-center items-center">
            {currentTeam ? (
                <div className="animate-in fade-in zoom-in duration-300 w-full max-w-[240px]">
                     <div className="bg-primary text-primary-foreground rounded-xl p-3 flex items-center justify-center shadow-lg gap-4">
                         <div className="transform scale-125">
                            {renderFlag(currentTeam)}
                         </div>
                         <div className="text-center">
                            <div className="text-lg font-bold leading-tight">{currentTeam.name}</div>
                            <div className="text-xs opacity-80">{currentTeam.confederation}</div>
                         </div>
                     </div>
                </div>
            ) : (
                <div className="text-muted-foreground/20 text-sm font-medium uppercase tracking-widest select-none">
                    Waiting for Draw
                </div>
            )}
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-1/3 justify-end">
          {!isRunning ? (
            <Button onClick={startDraw}>Start Simulation</Button>
          ) : (
            <>
                <Button onClick={nextStep} disabled={!!currentTeam}>
                    {currentPot > 1 && TEAMS.filter(t => t.pot === currentPot && !drawnTeamIds.has(t.id)).length === 0 
                        ? "Advance to Next Pot" 
                        : "Draw Next Ball"}
                </Button>
                <Button variant="destructive" onClick={reset}>Restart</Button>
            </>
          )}
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {groups.map((group, groupIndex) => {
          // Sort teams by Pot for display (1, 2, 3, 4)
          const teamsByPot: (Team | null)[] = [1, 2, 3, 4].map(potNum => 
             group.teams.find(t => t?.pot === potNum) || null
          );

          return (
            <Card key={group.name} className="overflow-hidden">
              <CardHeader className="bg-muted/50 py-0 px-1 border-b min-h-0 h-6 flex items-center justify-center">
                  <span className="w-full text-center block text-xs font-medium text-foreground/80">Group {group.name}</span>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {teamsByPot.map((team, idx) => {
                    let displayTeam = team;
                    let rowClass = "";
                    
                    // Handle scanning visualization
                    if (scanningGroupIndex === groupIndex && currentTeam && scanningStatus) {
                        const potNum = currentTeam.pot || 1;
                        
                        // SIMPLIFIED: Target the row corresponding to the Pot Number.
                        // Since this list is generated by mapping [1,2,3,4], index 0 is Pot 1, index 1 is Pot 2, etc.
                        const targetSlot = potNum - 1;

                        if (idx === targetSlot) {
                            if (scanningStatus === 'rejected') {
                                rowClass = "bg-red-500/20";
                                if (!displayTeam) displayTeam = currentTeam;
                            } else if (scanningStatus === 'found') {
                                rowClass = "bg-green-500/20";
                                displayTeam = currentTeam;
                            }
                        }
                    }

                    return (
                    <div key={idx} className={`flex items-center justify-between p-2 h-10 text-xs transition-colors duration-200 ${rowClass}`}>
                      <span className="text-muted-foreground w-4 font-mono text-[10px]">
                        {/* Display Pot Number as the "slot" indicator if desired, or just rank/index */}
                        {idx + 1}
                      </span>
                      {displayTeam ? (
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          {renderFlag(displayTeam)}
                          <div className="flex flex-col leading-none min-w-0">
                             <span className="font-medium truncate">{displayTeam.name}</span>
                             <span className="text-[9px] text-muted-foreground mt-0.5">{displayTeam.confederation}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/30 italic">
                            {/* Empty Pot Slot */}
                        </span>
                      )}
                    </div>
                  );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
