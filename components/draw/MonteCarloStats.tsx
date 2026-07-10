"use client";

import React, { useState, useMemo } from 'react';
import preDrawStats from '@/lib/data/pre-draw-monte-carlo.json';
import tournamentStats from '@/lib/data/tournament-sim-results.json';
import { SimulationResult } from '@/lib/engine/monte-carlo';
import { TournamentSimResult } from '@/lib/engine/tournament-sim';
import { TEAMS } from '@/lib/data/teams';
import { OFFICIAL_GROUPS } from '@/lib/data/official-draw';
import type { SimulationMetadata } from '@/lib/data/simulation-metadata';
import { getStadiumsForPosition } from '@/lib/data/matches';
import { downloadCsv, downloadJson, probabilitiesToCsv } from '@/lib/export-data';
import { formatEstimateTitle, getBinomialEstimate } from '@/lib/statistics/uncertainty';
import { resolvePath } from '@/lib/utils';
import { GROUP_NAMES, APPENDIX_B_POSITIONS } from '@/types/draw';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronDown, Download, Info, TriangleAlert } from 'lucide-react';

type StoredSimulationResult = SimulationResult & {
  metadata: SimulationMetadata;
  iterations: number;
  attempts: number;
  rejectedIterations: number;
};

type StoredTournamentResult = TournamentSimResult & {
  metadata: SimulationMetadata;
  attempts: number;
  rejectedIterations: number;
};

const preStats = preDrawStats as unknown as StoredSimulationResult;
const postStats = tournamentStats as unknown as StoredTournamentResult;
const PRE_DRAW_ITERATIONS = preStats.iterations;

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
      .map(([name, count]) => ({
        name,
        count,
        probability: (count / PRE_DRAW_ITERATIONS) * 100,
      }))
      .sort((a, b) => b.probability - a.probability);
  }, [selectedTeamId]);

  return (
    <Tabs defaultValue="groups" className="w-full">
      <TabsList className="grid h-auto min-h-9 w-full grid-cols-3">
        <TabsTrigger className="h-full whitespace-normal py-2 text-xs sm:text-sm" value="groups">Group Probabilities</TabsTrigger>
        <TabsTrigger className="h-full whitespace-normal py-2 text-xs sm:text-sm" value="opponents">Opponent Analysis</TabsTrigger>
        <TabsTrigger className="h-full whitespace-normal py-2 text-xs sm:text-sm" value="stadiums">Stadium Forecast</TabsTrigger>
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
                      <td
                        key={g}
                        className={`p-2 text-center text-xs ${bgClass}`}
                        title={formatEstimateTitle(
                          preStats.groupProbabilities[team.id]?.[g] ?? 0,
                          PRE_DRAW_ITERATIONS,
                        )}
                        aria-label={`${team.name}, Group ${g}: ${formatEstimateTitle(
                          preStats.groupProbabilities[team.id]?.[g] ?? 0,
                          PRE_DRAW_ITERATIONS,
                        )}`}
                        tabIndex={0}
                      >
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
                <OpponentCard
                  key={opp.id}
                  name={opp.name}
                  flagUrl={opp.flagUrl}
                  probability={opp.probability}
                  subtitle={`Pot ${opp.pot} \u2022 ${opp.confederation}`}
                  color="blue"
                  count={preStats.opponentCounts[selectedTeamId]?.[opp.id] ?? 0}
                  trials={PRE_DRAW_ITERATIONS}
                />
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
                <div
                  key={stad.name}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card text-card-foreground shadow-sm"
                  title={formatEstimateTitle(stad.count, PRE_DRAW_ITERATIONS)}
                  aria-label={`${stad.name} venue: ${formatEstimateTitle(stad.count, PRE_DRAW_ITERATIONS)}`}
                  tabIndex={0}
                >
                  <div className="font-bold text-lg w-16 text-right text-emerald-600 dark:text-emerald-400">
                    {stad.probability.toFixed(1)}%
                  </div>
                  <div className="h-8 w-[1px] bg-border" />
                  <div className="flex flex-col">
                    <span className="font-medium">{stad.name}</span>
                    <span className="text-xs text-muted-foreground">Venue</span>
                    <CompactEstimate count={stad.count} trials={PRE_DRAW_ITERATIONS} />
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
          finishes,
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
      <TabsList className="grid h-auto min-h-9 w-full grid-cols-3">
        <TabsTrigger className="h-full whitespace-normal py-2 text-xs sm:text-sm" value="group-finish">Group Standings</TabsTrigger>
        <TabsTrigger className="h-full whitespace-normal py-2 text-xs sm:text-sm" value="deep-run">Deep Run</TabsTrigger>
        <TabsTrigger className="h-full whitespace-normal py-2 text-xs sm:text-sm" value="opponents">Knockout Opponents</TabsTrigger>
      </TabsList>

      {/* Group Finish Probabilities */}
      <TabsContent value="group-finish" className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {groupFinishData.map(group => (
            <Card key={group.name} className="min-w-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Group {group.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
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
                    {group.teams.map(team => {
                      if (!team) return null;
                      return (
                      <tr key={team.id} className="hover:bg-muted/50">
                        <td className="p-2 pl-4">
                          <div className="flex items-center gap-2">
                            <img src={resolvePath(team.flagUrl)} alt={team.id} className="w-5 h-3 object-cover border" />
                            <span className="font-medium truncate text-xs">{team.name}</span>
                          </div>
                        </td>
                        <td className="p-2 text-center text-xs">
                          <FinishPctCell pct={team.pct1st} count={team.finishes[1] ?? 0} trials={iterations} />
                        </td>
                        <td className="p-2 text-center text-xs">
                          <FinishPctCell pct={team.pct2nd} count={team.finishes[2] ?? 0} trials={iterations} />
                        </td>
                        <td className="p-2 text-center text-xs">
                          <FinishPctCell pct={team.pct3rd} count={team.finishes[3] ?? 0} trials={iterations} />
                        </td>
                        <td className="p-2 text-center text-xs">
                          <FinishPctCell pct={team.pct4th} count={team.finishes[4] ?? 0} trials={iterations} />
                        </td>
                        <td className="p-2 pr-4 text-center text-xs font-semibold">
                          <span
                            className={team.pctAdvance > 80 ? 'text-green-600 dark:text-green-400' : team.pctAdvance > 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}
                            title={formatEstimateTitle(postStats.roundReach[team.id]?.R32 ?? 0, iterations)}
                            aria-label={`${team.name} advances: ${formatEstimateTitle(postStats.roundReach[team.id]?.R32 ?? 0, iterations)}`}
                            tabIndex={0}
                          >
                            {team.pctAdvance.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                  </table>
                </div>
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
              {deepRunData.map(({ round, pct, count }) => (
                <div
                  key={round}
                  className="flex items-center gap-4"
                  title={formatEstimateTitle(count, iterations)}
                  aria-label={`${round}: ${formatEstimateTitle(count, iterations)}`}
                  tabIndex={0}
                >
                  <div className="w-28 text-sm font-medium text-right shrink-0">{round}</div>
                  <div className="flex-1 h-8 bg-muted rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 0.5)}%` }}
                    />
                  </div>
                  <div className="w-28 text-right">
                    <div className="text-sm font-bold">{pct.toFixed(1)}%</div>
                    <CompactEstimate count={count} trials={iterations} />
                  </div>
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
                Opponent probabilities below are conditional on reaching this round (effective n={teamReachCount.toLocaleString()}).
              </p>
            )}

            {teamReachCount > 0 && teamReachCount < 100 && (
              <Alert className="border-amber-500/50 bg-amber-500/5">
                <TriangleAlert className="text-amber-600" />
                <AlertTitle>Sparse conditional estimate</AlertTitle>
                <AlertDescription>
                  This team reached the selected round only {teamReachCount} times. Treat opponent percentages as exploratory; the cards expose Wilson 95% intervals.
                </AlertDescription>
              </Alert>
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
                    count={opp.count}
                    trials={teamReachCount}
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
                <img src={resolvePath(t.flagUrl)} alt="" className="w-4 h-3" />
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

function OpponentCard({ name, flagUrl, probability, subtitle, color, count, trials }: {
  name: string;
  flagUrl?: string;
  probability: number;
  subtitle: string;
  color: 'blue' | 'emerald';
  count?: number;
  trials?: number;
}) {
  const colorClass = color === 'blue'
    ? 'text-blue-600 dark:text-blue-400'
    : 'text-emerald-600 dark:text-emerald-400';
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border bg-card text-card-foreground shadow-sm"
      title={count !== undefined && trials !== undefined ? formatEstimateTitle(count, trials) : undefined}
      aria-label={count !== undefined && trials !== undefined ? `${name}: ${formatEstimateTitle(count, trials)}` : undefined}
      tabIndex={count !== undefined && trials !== undefined ? 0 : undefined}
    >
      <div className={`font-bold text-lg w-16 text-right ${colorClass}`}>
        {probability.toFixed(1)}%
      </div>
      <div className="h-8 w-[1px] bg-border" />
      <div className="flex flex-col">
        <div className="flex items-center gap-2 font-medium">
          <img src={resolvePath(flagUrl)} alt="" className="w-4 h-3 object-cover" />
          {name}
        </div>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
        {count !== undefined && trials !== undefined && (
          <CompactEstimate count={count} trials={trials} />
        )}
        {trials !== undefined && trials < 100 && (
          <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">Sparse estimate · n={trials}</span>
        )}
      </div>
    </div>
  );
}

function FinishPctCell({ pct, count, trials }: { pct: number; count: number; trials: number }) {
  let cls = 'text-muted-foreground/40';
  if (pct > 40) cls = 'font-semibold text-foreground';
  else if (pct > 20) cls = 'text-foreground';
  else if (pct > 5) cls = 'text-muted-foreground';
  return (
    <span
      className={cls}
      title={formatEstimateTitle(count, trials)}
      aria-label={formatEstimateTitle(count, trials)}
      tabIndex={0}
    >
      {pct.toFixed(0)}%
    </span>
  );
}

function AllTeamsWinProbTable() {
  const iterations = postStats.iterations;
  const sorted = useMemo(() => {
    return TEAMS
      .map(t => ({
        id: t.id,
        name: t.name,
        flagUrl: t.flagUrl,
        winCount: postStats.roundReach[t.id]?.W || 0,
        winPct: ((postStats.roundReach[t.id]?.W || 0) / iterations) * 100,
      }))
      .filter(t => t.winPct > 0.01)
      .sort((a, b) => b.winPct - a.winPct);
  }, [iterations]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {sorted.map((t, i) => (
        <div
          key={t.id}
          className="flex items-center gap-2 p-2 rounded border text-sm"
          title={formatEstimateTitle(t.winCount, iterations)}
          aria-label={`${t.name} tournament winner: ${formatEstimateTitle(t.winCount, iterations)}`}
          tabIndex={0}
        >
          <span className="text-muted-foreground w-5 text-right text-xs">{i + 1}.</span>
          <img src={resolvePath(t.flagUrl)} alt="" className="w-4 h-3 object-cover" />
          <span className="truncate flex-1">{t.name}</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">{t.winPct.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

function CompactEstimate({ count, trials }: { count: number; trials: number }) {
  const estimate = getBinomialEstimate(count, trials);
  return (
    <span className="block text-[10px] leading-tight text-muted-foreground">
      95% CI {estimate.confidenceInterval95.lowPercentage.toFixed(1)}–{estimate.confidenceInterval95.highPercentage.toFixed(1)}% · n={trials.toLocaleString()}
    </span>
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
  const activeStats = view === 'post-draw' ? postStats : preStats;
  const metadata = activeStats.metadata;

  const exportJson = () => {
    downloadJson('world-cup-2026-probabilities.json', {
      exportedAt: new Date().toISOString(),
      preDraw: preStats,
      officialDrawTournament: postStats,
    });
  };

  const exportCsv = () => {
    downloadCsv('world-cup-2026-probabilities.csv', probabilitiesToCsv(preStats, postStats, TEAMS));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground" role="note">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          <span className="font-medium text-foreground">Fixed reference scenarios:</span>{' '}
          Official Draw uses the checked-in fixture; Pre-Draw Baseline uses precomputed simulations. These results do not change when you run a Visual Draw.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Monte Carlo Probability Analysis</CardTitle>
              <CardDescription>
                {view === 'post-draw'
                  ? 'Official-draw tournament probabilities using Elo ratings.'
                  : 'Group-placement probabilities before the draw.'
                }
              </CardDescription>
              <div
                className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
                role={metadata.convergence.passed ? undefined : 'alert'}
              >
                {metadata.convergence.passed ? (
                  <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" />
                ) : (
                  <TriangleAlert className="size-3.5 text-amber-600" aria-hidden="true" />
                )}
                <span>{activeStats.iterations.toLocaleString()} simulations</span>
                <span aria-hidden="true">&middot;</span>
                <span>{metadata.convergence.passed ? 'Convergence check passed' : 'Convergence check needs review'}</span>
                <span aria-hidden="true">&middot;</span>
                <span>Methodology below</span>
              </div>
            </div>
            <div className="flex flex-col sm:items-end gap-2">
              <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setView('post-draw')}
                  aria-pressed={view === 'post-draw'}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    view === 'post-draw'
                      ? 'bg-background shadow text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Official Draw
                </button>
                <button
                  type="button"
                  onClick={() => setView('pre-draw')}
                  aria-pressed={view === 'pre-draw'}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    view === 'pre-draw'
                      ? 'bg-background shadow text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Pre-Draw Baseline
                </button>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
                  <Download className="size-4" /> CSV
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={exportJson}>
                  <Download className="size-4" /> JSON
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {view === 'post-draw' ? <PostDrawView /> : <PreDrawView />}

      <details id="monte-carlo-methodology" className="group rounded-xl border bg-card shadow-sm">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-4 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-6 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block font-semibold">Methodology, reproducibility &amp; uncertainty</span>
            <span className="mt-1 block text-sm text-muted-foreground">Seed, source versions, confidence intervals, and convergence details</span>
          </span>
          <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="space-y-4 border-t px-4 py-5 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <MethodValue label="Trials" value={activeStats.iterations.toLocaleString()} />
            <MethodValue label="Seed" value={metadata.seed} mono />
            <MethodValue label="Rules" value={metadata.rulesVersion} mono />
            {metadata.modelVersion && <MethodValue label="Model" value={metadata.modelVersion} mono />}
            <MethodValue label="Input SHA-256" value={metadata.inputSnapshot.sha256.slice(0, 12)} mono />
            <MethodValue
              label="Discarded attempts"
              value={`${activeStats.rejectedIterations.toLocaleString()} of ${activeStats.attempts.toLocaleString()}`}
            />
            <MethodValue
              label="Marginal worst-case SE at global n"
              value={`${metadata.uncertainty.worstCaseStandardErrorPercentagePoints.toFixed(3)} pp`}
            />
            <MethodValue
              label="Marginal worst-case 95% margin at global n"
              value={`±${metadata.uncertainty.worstCaseMarginOfError95PercentagePoints.toFixed(3)} pp`}
            />
            <MethodValue
              label="Split-half convergence"
              value={`${metadata.convergence.maxAbsoluteDeltaPercentagePoints.toFixed(3)} pp / ${metadata.convergence.thresholdPercentagePoints.toFixed(3)} pp`}
              good={metadata.convergence.passed}
            />
          </div>

          <Alert>
            <Info />
            <AlertTitle>How to read the estimates</AlertTitle>
            <AlertDescription>
              Hover probability cells or cards for their Monte Carlo standard error and Wilson 95% interval. Conditional knockout-opponent estimates use the number of times that team reached the round—not the global trial count—and estimates below n=100 are flagged as sparse.
            </AlertDescription>
          </Alert>

          <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-2">
            <div className="flex items-center gap-2 font-medium">
              {metadata.convergence.passed ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : (
                <TriangleAlert className="size-4 text-amber-600" />
              )}
              {metadata.convergence.passed ? 'Convergence threshold passed' : 'Convergence threshold not met'} across {metadata.convergence.metricsCompared.toLocaleString()} published marginal estimates.
            </div>
            <p className="text-muted-foreground">
              Input {metadata.inputSnapshot.version}
              {metadata.elo ? ` · Elo ${metadata.elo.version}` : ''}
              {' · '}
              <a href={metadata.rulesSource} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                {metadata.kind === 'pre-draw' ? 'FIFA draw procedure' : 'FIFA tournament regulations'}
              </a>
              {metadata.elo && (
                <>
                  {' · '}<a href={metadata.elo.source} target="_blank" rel="noreferrer" className="underline underline-offset-2">Elo source</a>
                </>
              )}
            </p>
          </div>
        </div>
      </details>
    </div>
  );
}

function MethodValue({ label, value, mono = false, good }: {
  label: string;
  value: string;
  mono?: boolean;
  good?: boolean;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 break-all font-medium ${mono ? 'font-mono text-xs' : ''} ${good ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>
        {value}
      </div>
    </div>
  );
}
