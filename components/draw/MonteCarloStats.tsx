"use client";

import React, { useState, useMemo } from 'react';
import preDrawStats from '@/lib/data/pre-draw-monte-carlo.json';
import tournamentStats from '@/lib/data/tournament-sim-results.json';
import { SimulationResult } from '@/lib/engine/monte-carlo';
import { TournamentSimResult } from '@/lib/engine/tournament-sim';
import { TEAMS } from '@/lib/data/teams';
import { OFFICIAL_GROUPS } from '@/lib/data/official-draw';
import { getStadiumsForPosition } from '@/lib/data/matches';
import { resolvePath } from '@/lib/utils';
import { GROUP_NAMES, APPENDIX_B_POSITIONS } from '@/types/draw';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const preStats = preDrawStats as unknown as SimulationResult;
const postStats = tournamentStats as unknown as TournamentSimResult;
const PRE_DRAW_ITERATIONS = 1000000;

const ROUND_LABELS: Record<string, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarterfinals',
  SF: 'Semifinals',
  F: 'Final',
  W: 'Winner',
};

const ROUND_KEYS = ['R32', 'R16', 'QF', 'SF', 'F', 'W'] as const;
const OPPONENT_ROUNDS = ['R32', 'R16', 'QF', 'SF', 'F'] as const;

// Helper to find a team's group
function getTeamGroup(teamId: string): string | null {
  for (const g of OFFICIAL_GROUPS) {
    if (g.teams.some(t => t?.id === teamId)) return g.name;
  }
  return null;
}

// ============================================================
// Pre-Draw View (original)
// ============================================================

function PreDrawView() {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(TEAMS[0].id);

  const getGroupProbability = (teamId: string, groupName: string) => {
    const count = preStats.groupProbabilities[teamId]?.[groupName] || 0;
    return (count / PRE_DRAW_ITERATIONS) * 100;
  };

  const getOpponentProbability = (teamId: string, opponentId: string) => {
    const count = preStats.opponentCounts[teamId]?.[opponentId] || 0;
    return (count / PRE_DRAW_ITERATIONS) * 100;
  };

  const sortedOpponents = useMemo(() => {
    if (!selectedTeamId) return [];
    return TEAMS
      .filter(t => t.id !== selectedTeamId)
      .map(opponent => ({
        ...opponent,
        probability: getOpponentProbability(selectedTeamId, opponent.id)
      }))
      .filter(o => o.probability > 0)
      .sort((a, b) => b.probability - a.probability);
  }, [selectedTeamId]);

  const stadiumProbabilities = useMemo(() => {
    if (!selectedTeamId) return [];
    const team = TEAMS.find(t => t.id === selectedTeamId);
    if (!team || !team.pot) return [];
    const pot = team.pot;

    const stadiumProbs: Record<string, number> = {};
    GROUP_NAMES.forEach((groupName, idx) => {
      const count = preStats.groupProbabilities[selectedTeamId]?.[groupName] || 0;
      if (count === 0) return;
      let pos = 1;
      if (pot !== 1) pos = APPENDIX_B_POSITIONS[pot]?.[idx] || 0;
      if (pos === 0) return;
      const code = `${groupName}${pos}`;
      const stadiums = getStadiumsForPosition(code);
      stadiums.forEach(s => {
        stadiumProbs[s] = (stadiumProbs[s] || 0) + count;
      });
    });

    return Object.entries(stadiumProbs)
      .map(([name, count]) => ({ name, probability: (count / PRE_DRAW_ITERATIONS) * 100 }))
      .sort((a, b) => b.probability - a.probability);
  }, [selectedTeamId]);

  return (
    <Tabs defaultValue="groups" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="groups">Group Probabilities</TabsTrigger>
        <TabsTrigger value="opponents">Opponent Analysis</TabsTrigger>
        <TabsTrigger value="stadiums">Stadium Forecast</TabsTrigger>
      </TabsList>

      <TabsContent value="groups" className="mt-4">
        <div className="rounded-md border overflow-x-auto bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left font-medium sticky left-0 bg-muted/95 z-20 border-r">Team</th>
                <th className="p-3 text-left font-medium">Pot</th>
                {GROUP_NAMES.map(g => (
                  <th key={g} className="p-3 text-center font-medium w-16 min-w-[3rem]">Grp {g}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {TEAMS.map((team) => (
                <tr key={team.id} className="hover:bg-muted/50">
                  <td className="p-3 sticky left-0 bg-background z-10 font-medium border-r">
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <img src={resolvePath(team.flagUrl)} alt={team.id} className="w-5 h-3 object-cover border" />
                      <span className="truncate">{team.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground w-12 text-center">{team.pot}</td>
                  {GROUP_NAMES.map(g => {
                    const prob = getGroupProbability(team.id, g);
                    let bgClass = "";
                    if (prob > 25) bgClass = "bg-blue-600 text-white dark:bg-blue-700";
                    else if (prob > 15) bgClass = "bg-blue-500/50 text-blue-900 dark:text-blue-100";
                    else if (prob > 8) bgClass = "bg-blue-500/20 text-blue-700 dark:text-blue-300";
                    else if (prob > 0) bgClass = "text-muted-foreground";
                    else bgClass = "text-muted-foreground/30";
                    return (
                      <td key={g} className={`p-2 text-center text-xs ${bgClass}`}>
                        {prob > 0 ? `${prob.toFixed(1)}%` : "-"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabsContent>

      <TabsContent value="opponents" className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Most Likely Opponents</CardTitle>
            <CardDescription>Select a team to see who they were most likely to face in the group stage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <TeamSelector selectedTeamId={selectedTeamId} onChange={setSelectedTeamId} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedOpponents.map(opp => (
                <OpponentCard key={opp.id} name={opp.name} flagUrl={opp.flagUrl} probability={opp.probability} subtitle={`Pot ${opp.pot} \u2022 ${opp.confederation}`} color="blue" />
              ))}
              {sortedOpponents.length === 0 && <EmptyState message="No opponents found" />}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="stadiums" className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Stadium Probabilities</CardTitle>
            <CardDescription>Likelihood of playing at least one match in each venue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <TeamSelector selectedTeamId={selectedTeamId} onChange={setSelectedTeamId} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stadiumProbabilities.map(stad => (
                <div key={stad.name} className="flex items-center gap-3 p-3 rounded-lg border bg-card text-card-foreground shadow-sm">
                  <div className="font-bold text-lg w-16 text-right text-emerald-600 dark:text-emerald-400">
                    {stad.probability.toFixed(1)}%
                  </div>
                  <div className="h-8 w-[1px] bg-border" />
                  <div className="flex flex-col">
                    <span className="font-medium">{stad.name}</span>
                    <span className="text-xs text-muted-foreground">Venue</span>
                  </div>
                </div>
              ))}
              {stadiumProbabilities.length === 0 && <EmptyState message="No stadium data found" />}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

// ============================================================
// Post-Draw View (tournament simulation with Elo)
// ============================================================

function PostDrawView() {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('USA');
  const [selectedRound, setSelectedRound] = useState<string>('R32');
  const iterations = postStats.iterations;

  // Group finish probabilities for all teams, organized by group
  const groupFinishData = useMemo(() => {
    return OFFICIAL_GROUPS.map(group => ({
      name: group.name,
      teams: group.teams.map(team => {
        if (!team) return null;
        const finishes = postStats.groupFinish[team.id] || {};
        return {
          id: team.id,
          name: team.name,
          flagUrl: team.flagUrl,
          confederation: team.confederation,
          pct1st: ((finishes[1] || 0) / iterations) * 100,
          pct2nd: ((finishes[2] || 0) / iterations) * 100,
          pct3rd: ((finishes[3] || 0) / iterations) * 100,
          pct4th: ((finishes[4] || 0) / iterations) * 100,
          pctAdvance: ((postStats.roundReach[team.id]?.R32 || 0) / iterations) * 100,
        };
      }).filter(Boolean),
    }));
  }, [iterations]);

  // Deep run probabilities for selected team
  const deepRunData = useMemo(() => {
    const reach = postStats.roundReach[selectedTeamId];
    if (!reach) return [];
    return ROUND_KEYS.map(key => ({
      round: ROUND_LABELS[key],
      count: reach[key] || 0,
      pct: ((reach[key] || 0) / iterations) * 100,
    }));
  }, [selectedTeamId, iterations]);

  // Opponents for selected team in selected round
  const roundOpponents = useMemo(() => {
    const opponents = postStats.roundOpponents[selectedTeamId]?.[selectedRound] || {};
    return Object.entries(opponents)
      .map(([oppId, count]) => {
        const team = TEAMS.find(t => t.id === oppId);
        return {
          id: oppId,
          name: team?.name || oppId,
          flagUrl: team?.flagUrl,
          confederation: team?.confederation || '',
          group: getTeamGroup(oppId),
          count: count as number,
          pct: ((count as number) / iterations) * 100,
        };
      })
      .filter(o => o.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [selectedTeamId, selectedRound, iterations]);

  // Calculate total times team reaches the selected round (for conditional probabilities)
  const teamReachCount = postStats.roundReach[selectedTeamId]?.[selectedRound] || 0;

  return (
    <Tabs defaultValue="group-finish" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="group-finish">Group Standings</TabsTrigger>
        <TabsTrigger value="deep-run">Deep Run</TabsTrigger>
        <TabsTrigger value="opponents">Knockout Opponents</TabsTrigger>
      </TabsList>

      {/* Group Finish Probabilities */}
      <TabsContent value="group-finish" className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {groupFinishData.map(group => (
            <Card key={group.name}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Group {group.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-2 pl-4 text-left font-medium">Team</th>
                      <th className="p-2 text-center font-medium text-xs">1st</th>
                      <th className="p-2 text-center font-medium text-xs">2nd</th>
                      <th className="p-2 text-center font-medium text-xs">3rd</th>
                      <th className="p-2 text-center font-medium text-xs">4th</th>
                      <th className="p-2 pr-4 text-center font-medium text-xs">Adv.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {group.teams.map((team: any) => (
                      <tr key={team.id} className="hover:bg-muted/50">
                        <td className="p-2 pl-4">
                          <div className="flex items-center gap-2">
                            <img src={resolvePath(team.flagUrl)} alt={team.id} className="w-5 h-3 object-cover border" />
                            <span className="font-medium truncate text-xs">{team.name}</span>
                          </div>
                        </td>
                        <td className="p-2 text-center text-xs">
                          <FinishPctCell pct={team.pct1st} />
                        </td>
                        <td className="p-2 text-center text-xs">
                          <FinishPctCell pct={team.pct2nd} />
                        </td>
                        <td className="p-2 text-center text-xs">
                          <FinishPctCell pct={team.pct3rd} />
                        </td>
                        <td className="p-2 text-center text-xs">
                          <FinishPctCell pct={team.pct4th} />
                        </td>
                        <td className="p-2 pr-4 text-center text-xs font-semibold">
                          <span className={team.pctAdvance > 80 ? 'text-green-600 dark:text-green-400' : team.pctAdvance > 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}>
                            {team.pctAdvance.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      {/* Deep Run Probabilities */}
      <TabsContent value="deep-run" className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Tournament Progression</CardTitle>
            <CardDescription>Probability of reaching each round based on Elo-weighted simulation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <TeamSelector selectedTeamId={selectedTeamId} onChange={setSelectedTeamId} />

            <div className="space-y-3">
              {deepRunData.map(({ round, pct }) => (
                <div key={round} className="flex items-center gap-4">
                  <div className="w-28 text-sm font-medium text-right shrink-0">{round}</div>
                  <div className="flex-1 h-8 bg-muted rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 0.5)}%` }}
                    />
                  </div>
                  <div className="w-16 text-sm font-bold text-right">{pct.toFixed(1)}%</div>
                </div>
              ))}
            </div>

            {/* Quick comparison table: all teams sorted by win probability */}
            <div className="pt-4 border-t">
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Tournament Winner Odds</h4>
              <AllTeamsWinProbTable />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Knockout Opponents */}
      <TabsContent value="opponents" className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Knockout Opponents by Round</CardTitle>
            <CardDescription>
              Who is most likely to face the selected team at each knockout stage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <TeamSelector selectedTeamId={selectedTeamId} onChange={setSelectedTeamId} />
              <Select value={selectedRound} onValueChange={setSelectedRound}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPPONENT_ROUNDS.map(r => (
                    <SelectItem key={r} value={r}>{ROUND_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {teamReachCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {TEAMS.find(t => t.id === selectedTeamId)?.name} reaches the {ROUND_LABELS[selectedRound]} in {((teamReachCount / iterations) * 100).toFixed(1)}% of simulations.
                Opponent probabilities below are conditional on reaching this round.
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {roundOpponents.map(opp => {
                const conditionalPct = teamReachCount > 0 ? (opp.count / teamReachCount) * 100 : 0;
                return (
                  <OpponentCard
                    key={opp.id}
                    name={opp.name}
                    flagUrl={opp.flagUrl}
                    probability={conditionalPct}
                    subtitle={`Group ${opp.group || '?'} \u2022 ${opp.confederation}`}
                    color="blue"
                  />
                );
              })}
              {roundOpponents.length === 0 && <EmptyState message="No opponent data for this round" />}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

// ============================================================
// Shared sub-components
// ============================================================

function TeamSelector({ selectedTeamId, onChange }: { selectedTeamId: string; onChange: (id: string) => void }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium">Select Team:</span>
      <Select value={selectedTeamId} onValueChange={onChange}>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Select a team" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {TEAMS.map(t => (
            <SelectItem key={t.id} value={t.id}>
              <div className="flex items-center gap-2">
                <img src={resolvePath(t.flagUrl)} className="w-4 h-3" />
                <span>{t.name}</span>
                <span className="text-muted-foreground text-xs">(Pot {t.pot})</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function OpponentCard({ name, flagUrl, probability, subtitle, color }: {
  name: string;
  flagUrl?: string;
  probability: number;
  subtitle: string;
  color: 'blue' | 'emerald';
}) {
  const colorClass = color === 'blue'
    ? 'text-blue-600 dark:text-blue-400'
    : 'text-emerald-600 dark:text-emerald-400';
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className={`font-bold text-lg w-16 text-right ${colorClass}`}>
        {probability.toFixed(1)}%
      </div>
      <div className="h-8 w-[1px] bg-border" />
      <div className="flex flex-col">
        <div className="flex items-center gap-2 font-medium">
          <img src={resolvePath(flagUrl)} className="w-4 h-3 object-cover" />
          {name}
        </div>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </div>
    </div>
  );
}

function FinishPctCell({ pct }: { pct: number }) {
  let cls = 'text-muted-foreground/40';
  if (pct > 40) cls = 'font-semibold text-foreground';
  else if (pct > 20) cls = 'text-foreground';
  else if (pct > 5) cls = 'text-muted-foreground';
  return <span className={cls}>{pct.toFixed(0)}%</span>;
}

function AllTeamsWinProbTable() {
  const iterations = postStats.iterations;
  const sorted = useMemo(() => {
    return TEAMS
      .map(t => ({
        id: t.id,
        name: t.name,
        flagUrl: t.flagUrl,
        winPct: ((postStats.roundReach[t.id]?.W || 0) / iterations) * 100,
      }))
      .filter(t => t.winPct > 0.01)
      .sort((a, b) => b.winPct - a.winPct);
  }, [iterations]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {sorted.map((t, i) => (
        <div key={t.id} className="flex items-center gap-2 p-2 rounded border text-sm">
          <span className="text-muted-foreground w-5 text-right text-xs">{i + 1}.</span>
          <img src={resolvePath(t.flagUrl)} className="w-4 h-3 object-cover" />
          <span className="truncate flex-1">{t.name}</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">{t.winPct.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="col-span-full text-center py-12 text-muted-foreground">
      {message}
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export function MonteCarloStats() {
  const [view, setView] = useState<'post-draw' | 'pre-draw'>('post-draw');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Monte Carlo Probability Analysis</CardTitle>
              <CardDescription>
                {view === 'post-draw'
                  ? `Tournament simulation using Elo ratings \u2022 ${postStats.iterations.toLocaleString()} iterations`
                  : `Pre-draw group placement probabilities \u2022 ${PRE_DRAW_ITERATIONS.toLocaleString()} simulated draws`
                }
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
              <button
                onClick={() => setView('post-draw')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === 'post-draw'
                    ? 'bg-background shadow text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Post-Draw
              </button>
              <button
                onClick={() => setView('pre-draw')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === 'pre-draw'
                    ? 'bg-background shadow text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Pre-Draw
              </button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {view === 'post-draw' ? <PostDrawView /> : <PreDrawView />}
    </div>
  );
}
