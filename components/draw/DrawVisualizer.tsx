"use client";

import React, { useMemo, useState, useSyncExternalStore } from 'react';
import { useDrawSimulation } from '@/hooks/use-draw-simulation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { APPENDIX_B_POSITIONS, Team } from '@/types/draw';
import { TEAMS } from '@/lib/data/teams';
import {
  DRAW_INPUT_VERSION,
  OFFICIAL_DRAW_VERSION,
  RULES_VERSION,
  VISUAL_DRAW_ENGINE_VERSION,
} from '@/lib/data/simulation-metadata';
import {
  createDrawExport,
  createDrawShareUrl,
  downloadCsv,
  downloadJson,
  drawToCsv,
} from '@/lib/export-data';
import {
  getDrawCenterPrompt,
  getDrawStatusText,
  getReturnToPotLabel,
  isDrawComplete,
} from '@/lib/draw-ui';
import { resolvePath } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronsRight, Download, Link2, Loader2, Settings2, X } from 'lucide-react';

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
    scanningStatus,
    calculateValidGroups,
    placeTeam,
    removeTeam,
    fastForward,
    isFastForwarding,
    isOfficialDraw,
    loadOfficialDraw,
    seed,
    setSeed,
  } = useDrawSimulation();

  const [draggingTeam, setDraggingTeam] = useState<Team | null>(null);
  const [validTargetIndices, setValidTargetIndices] = useState<number[]>([]);
  const [shareStatus, setShareStatus] = useState('');
  const sharedVersionWarning = useSyncExternalStore(
    subscribeToConfiguration,
    getSharedVersionWarning,
    getServerSharedVersionWarning,
  );

  // We start with all TEAMS.
  // Filter out teams that are in the `groups` state.
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

  const isComplete = useMemo(() => isDrawComplete(groups), [groups]);

  const statusText = getDrawStatusText({
    isOfficialDraw,
    isComplete,
    isRunning,
    currentPot,
  });

  const shareConfiguration = async () => {
    const normalizedSeed = seed.trim();
    if (!isOfficialDraw && !normalizedSeed) {
      setShareStatus('Enter a seed before sharing.');
      return;
    }

    const url = createDrawShareUrl(
      window.location.href,
      normalizedSeed,
      isOfficialDraw ? 'official' : 'seeded',
    );

    window.history.replaceState(null, '', url);
    window.dispatchEvent(new Event('world-cup-configuration-change'));

    try {
      await navigator.clipboard.writeText(url.toString());
      setShareStatus('Configuration link copied.');
    } catch {
      setShareStatus('Could not copy automatically; copy the current page URL.');
    }
  };

  const exportDrawJson = () => {
    const scenario = isOfficialDraw ? 'official-draw' : 'visual-seeded-draw';
    downloadJson('world-cup-2026-draw.json', createDrawExport(groups, seed, scenario));
  };

  const exportDrawCsv = () => {
    const scenario = isOfficialDraw ? 'official-draw' : 'visual-seeded-draw';
    downloadCsv('world-cup-2026-draw.csv', drawToCsv(groups, seed, scenario));
  };

  // Determine if team is a placeholder
  const isPlaceholder = (team: Team) => !team.flagUrl;
  const isFifaPlayoff = (team: Team) => team.id.startsWith('PO_FIFA');
  const isUefaPlayoff = (team: Team) => team.id.startsWith('PO_UEFA');

  const renderFlag = (team: Team) => {
    if (team.flagUrl) {
        return (
            <img src={resolvePath(team.flagUrl)} alt={team.name} className="w-6 h-4 object-cover rounded-sm shadow-sm" />
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

  const handleDragStart = (e: React.DragEvent, team: Team) => {
    if (!isRunning) {
        e.preventDefault();
        return;
    }
    // Only allow dragging from current pot
    if (team.pot !== currentPot) {
        e.preventDefault();
        return;
    }

    setDraggingTeam(team);
    const valid = calculateValidGroups(team);
    setValidTargetIndices(valid);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggingTeam(null);
    setValidTargetIndices([]);
  };

  const handleDragOver = (e: React.DragEvent, groupIndex: number) => {
    e.preventDefault();
    if (draggingTeam && validTargetIndices.includes(groupIndex)) {
        e.dataTransfer.dropEffect = "move";
    } else {
        e.dataTransfer.dropEffect = "none";
    }
  };

  const handleDrop = (e: React.DragEvent, groupIndex: number) => {
    e.preventDefault();
    if (draggingTeam && validTargetIndices.includes(groupIndex)) {
        placeTeam(draggingTeam, groupIndex);
        // Immediately clear drag state to remove highlighting
        setDraggingTeam(null);
        setValidTargetIndices([]);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1800px] mx-auto pb-12">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="space-y-1 w-full md:w-1/3">
            <h2 className="text-2xl font-bold">Draw Simulator</h2>
            <p className="text-muted-foreground text-sm">
              {statusText}
            </p>
        </div>

        {/* Center: Just Drawn Team (Auto-draw visualization) */}
        <div className="w-full md:w-1/3 flex justify-center items-center h-16">
            {currentTeam ? (
                <div className="animate-in fade-in zoom-in duration-300 w-full max-w-[240px]">
                     <div className="bg-primary text-primary-foreground rounded-xl p-2 flex items-center justify-center shadow-lg gap-3">
                         <div className="transform scale-110">
                            {renderFlag(currentTeam)}
                         </div>
                         <div className="text-center">
                            <div className="text-base font-bold leading-tight">{currentTeam.name}</div>
                            <div className="text-[10px] opacity-80">{currentTeam.confederation}</div>
                         </div>
                     </div>
                </div>
            ) : (
                <div className="text-muted-foreground/20 text-xs font-medium uppercase tracking-widest select-none">
                    {getDrawCenterPrompt(draggingTeam, isComplete)}
                </div>
            )}
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-1/3 justify-end">
          
          {/* Official Draw Checkbox */}
          {!isRunning && (
            <div className="flex items-center space-x-2 mr-4">
                <Checkbox 
                    id="official-draw" 
                    checked={isOfficialDraw}
                    onCheckedChange={(checked) => {
                        if (checked) loadOfficialDraw();
                        else reset();
                    }}
                />
                <Label 
                    htmlFor="official-draw" 
                    className="text-sm font-medium leading-none cursor-pointer"
                >
                    Use official draw
                </Label>
            </div>
          )}

          {isOfficialDraw ? (
             <Button variant="outline" onClick={reset}>Reset</Button>
          ) : isComplete ? (
             <Button variant="destructive" onClick={reset}>Restart</Button>
          ) : !isRunning ? (
            <Button onClick={startDraw}>Start Simulation</Button>
          ) : (
            <>
                {/* Only show Draw/Advance buttons while the draw is incomplete. */}
                {(currentPot < 4 || TEAMS.filter(t => t.pot === currentPot && !drawnTeamIds.has(t.id)).length > 0) && (
                    <>
                        <Button onClick={nextStep} disabled={!!currentTeam || !!draggingTeam}>
                            {currentPot > 1 && TEAMS.filter(t => t.pot === currentPot && !drawnTeamIds.has(t.id)).length === 0 
                                ? "Advance to Next Pot" 
                                : "Draw Next Ball"}
                        </Button>
                        <Button 
                            variant="secondary" 
                            onClick={fastForward} 
                            disabled={!!currentTeam || !!draggingTeam || isFastForwarding}
                            title="Instantly complete the rest of the draw"
                        >
                            {isFastForwarding ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <ChevronsRight className="w-4 h-4 mr-2" />
                            )}
                            {isFastForwarding ? "Simulating..." : "Fast Forward"}
                        </Button>
                    </>
                )}

                <Button variant="destructive" onClick={reset}>Restart</Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start" data-testid="draw-board">
        
        {/* LEFT SIDEBAR: Active Pot */}
        {!isComplete && !isOfficialDraw ? (
            <div className="w-full lg:w-72 xl:w-80 flex-shrink-0 sticky top-4 z-20">
                {isRunning ? (
                    <div className="border rounded-xl p-4 bg-card shadow-md ring-2 ring-primary/10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg">Pot {currentPot}</h3>
                            <Badge variant="secondary">Active</Badge>
                        </div>
                        
                        <div className="space-y-2 max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
                             {TEAMS.filter(t => t.pot === currentPot && !drawnTeamIds.has(t.id)).length > 0 ? (
                                 TEAMS.filter(t => t.pot === currentPot && !drawnTeamIds.has(t.id)).map(team => (
                                    <div 
                                        key={team.id} 
                                        draggable={true}
                                        onDragStart={(e) => handleDragStart(e, team)}
                                        onDragEnd={handleDragEnd}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg bg-background border hover:border-primary/50 cursor-grab active:cursor-grabbing transition-all shadow-sm",
                                            draggingTeam?.id === team.id && "opacity-40 scale-95"
                                        )}
                                    >
                                        <div className="flex-shrink-0 transform scale-125">
                                            {renderFlag(team)}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className={`font-bold text-sm truncate ${isPlaceholder(team) ? 'text-muted-foreground' : ''}`}>
                                                {team.name}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">{team.confederation}</span>
                                        </div>
                                    </div>
                                 ))
                             ) : (
                                 <div className="text-center py-8 text-sm text-muted-foreground italic bg-muted/30 rounded-lg">
                                     Pot Empty
                                 </div>
                             )}
                        </div>
                    </div>
                ) : (
                    // Show condensed view of all pots when not running
                    <div className="space-y-4 opacity-60">
                         {[1, 2, 3, 4].map(potNum => (
                            <div key={potNum} className="border rounded-lg p-3 bg-card/50">
                                <div className="text-sm font-medium text-muted-foreground">Pot {potNum}</div>
                                <div className="text-xs text-muted-foreground/50 mt-1">
                                    {TEAMS.filter(t => t.pot === potNum).length} teams
                                </div>
                            </div>
                         ))}
                    </div>
                )}
            </div>
        ) : null}

        {/* RIGHT CONTENT: Groups Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {groups.map((group, groupIndex) => {
            const isValidTarget = draggingTeam && validTargetIndices.includes(groupIndex);
            
            return (
                <Card 
                    key={group.name} 
                    onDragOver={(e) => handleDragOver(e, groupIndex)}
                    onDrop={(e) => handleDrop(e, groupIndex)}
                    className={cn(
                        "overflow-hidden transition-all duration-200",
                        isValidTarget ? "ring-4 ring-green-500 shadow-xl scale-[1.02] z-10" : "",
                        draggingTeam && !isValidTarget && "opacity-50 grayscale-[0.5]" 
                    )}
                >
                <CardHeader className="bg-muted/50 py-2 px-3 border-b flex flex-row items-center justify-between space-y-0">
                    <span className="font-bold text-sm">Group {group.name}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {group.teams.filter(t => t).length}/4
                    </span>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y">
                    {group.teams.map((team, idx) => {
                        let displayTeam = team;
                        let rowClass = "";
                        
                        // Handle scanning visualization
                        if (scanningGroupIndex === groupIndex && currentTeam && scanningStatus) {
                            const potNum = currentTeam.pot || 1;
                            const targetSlot = potNum === 1
                              ? 0
                              : APPENDIX_B_POSITIONS[potNum][groupIndex] - 1;

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

                        // Determine if this team can be removed (simulation is running)
                        const assignedTeam = team;
                        const canRemove = isRunning && assignedTeam && !currentTeam && !isFastForwarding;

                        return (
                        <div key={idx} className={`flex items-center justify-between p-3 h-12 text-xs transition-colors duration-200 ${rowClass} group/item`}>
                        <span className="text-muted-foreground w-6 font-mono text-[10px] text-center border-r mr-3">
                            {idx + 1}
                        </span>
                        {displayTeam ? (
                            <div className="flex-1 flex items-center gap-3 min-w-0">
                                <div className="scale-125 origin-left">
                                    {renderFlag(displayTeam)}
                                </div>
                                <div className="flex flex-col leading-none min-w-0">
                                    <span className="font-bold text-sm truncate">{displayTeam.name}</span>
                                    <span className="text-[10px] text-muted-foreground mt-0.5">{displayTeam.confederation}</span>
                                </div>
                                {canRemove && assignedTeam && (
                                    <button
                                        type="button"
                                        onClick={() => removeTeam(assignedTeam, groupIndex)}
                                        className="ml-auto opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100 hover:bg-red-100 p-1 rounded-full transition-all text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                                        aria-label={getReturnToPotLabel(assignedTeam, group.name, idx + 1)}
                                        title={getReturnToPotLabel(assignedTeam, group.name, idx + 1)}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <span className="text-muted-foreground/20 italic text-[10px] flex-1">
                                Empty
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

      <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm" data-testid="draw-secondary-actions">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <Button className="w-full sm:w-auto" type="button" variant="outline" onClick={shareConfiguration} disabled={!isOfficialDraw && !seed.trim()}>
              <Link2 className="size-4" /> Share configuration
            </Button>
            <Button className="w-full sm:w-auto" type="button" variant="outline" onClick={exportDrawCsv} disabled={!isOfficialDraw && !seed.trim()}>
              <Download className="size-4" /> Draw CSV
            </Button>
            <Button className="w-full sm:w-auto" type="button" variant="outline" onClick={exportDrawJson} disabled={!isOfficialDraw && !seed.trim()}>
              <Download className="size-4" /> Draw JSON
            </Button>
          </div>
          <p className="min-h-5 text-xs text-muted-foreground" role="status" aria-live="polite">
            {shareStatus}
          </p>
        </div>

        {sharedVersionWarning && (
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300" role="alert">
            {sharedVersionWarning}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Share saves the setup; export saves this exact draw.
        </p>

        <details className="group border-t">
          <summary className="flex min-h-11 w-full cursor-pointer list-none items-center justify-between gap-3 rounded-md py-3 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <Settings2 className="size-4 text-muted-foreground" aria-hidden="true" />
              Advanced draw settings
              <span className="font-normal text-muted-foreground">Optional replay seed</span>
            </span>
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="mt-3 max-w-xl space-y-1 rounded-md bg-muted/30 p-3">
            <Label htmlFor="draw-seed">Optional replay seed</Label>
            <Input
              id="draw-seed"
              value={seed}
              onChange={event => setSeed(event.target.value)}
              disabled={isRunning || isOfficialDraw}
              maxLength={128}
              placeholder="Leave blank for a new random draw"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Leave this blank for a fresh draw each time. Enter a seed only when you want to replay the same random sequence.
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}

function subscribeToConfiguration(onStoreChange: () => void) {
  window.addEventListener('popstate', onStoreChange);
  window.addEventListener('world-cup-configuration-change', onStoreChange);
  return () => {
    window.removeEventListener('popstate', onStoreChange);
    window.removeEventListener('world-cup-configuration-change', onStoreChange);
  };
}

function getSharedVersionWarning() {
  const params = new URLSearchParams(window.location.search);
  const sharedRules = params.get('rules');
  const sharedInput = params.get('input');
  const sharedEngine = params.get('engine');
  const sharedScenario = params.get('scenario') === 'official' ? 'official' : 'seeded';
  const expectedInput = sharedScenario === 'official' ? OFFICIAL_DRAW_VERSION : DRAW_INPUT_VERSION;
  const mismatches = [
    sharedRules && sharedRules !== RULES_VERSION ? `rules ${sharedRules}` : null,
    sharedInput && sharedInput !== expectedInput ? `input ${sharedInput}` : null,
    sharedScenario === 'seeded' && sharedEngine && sharedEngine !== VISUAL_DRAW_ENGINE_VERSION
      ? `engine ${sharedEngine}`
      : null,
  ].filter(Boolean);

  return mismatches.length > 0
    ? `This link targets a different ${mismatches.join(' and ')} snapshot; the current app cannot reproduce it exactly.`
    : '';
}

function getServerSharedVersionWarning() {
  return '';
}
