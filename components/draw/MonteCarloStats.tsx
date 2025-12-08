"use client";

import React, { useState, useMemo } from 'react';
import precomputedStats from '@/lib/data/monte-carlo-results.json';
import { SimulationResult } from '@/lib/engine/monte-carlo';
import { TEAMS } from '@/lib/data/teams';
import { getStadiumsForPosition } from '@/lib/data/matches';
import { resolvePath } from '@/lib/utils';
import { GROUP_NAMES, APPENDIX_B_POSITIONS } from '@/types/draw';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const stats = precomputedStats as unknown as SimulationResult;
const ITERATIONS = 1000000;

export function MonteCarloStats() {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(TEAMS[0].id);

  const getGroupProbability = (teamId: string, groupName: string) => {
    const count = stats.groupProbabilities[teamId][groupName] || 0;
    return (count / ITERATIONS) * 100;
  };

  const getOpponentProbability = (teamId: string, opponentId: string) => {
    const count = stats.opponentCounts[teamId]?.[opponentId] || 0;
    return (count / ITERATIONS) * 100;
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
        const count = stats.groupProbabilities[selectedTeamId]?.[groupName] || 0;
        if (count === 0) return;

        let pos = 1;
        if (pot === 1) pos = 1;
        else {
            pos = APPENDIX_B_POSITIONS[pot]?.[idx] || 0;
        }
        
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
            probability: (count / ITERATIONS) * 100 
        }))
        .sort((a, b) => b.probability - a.probability);
  }, [selectedTeamId]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <CardTitle>Monte Carlo Probability Analysis</CardTitle>
                    <CardDescription>
                        Analysis based on {ITERATIONS.toLocaleString()} pre-simulated draws.
                    </CardDescription>
                </div>
            </div>
        </CardHeader>
      </Card>

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
                  {TEAMS.map((team) => {
                    const pot = team.pot; 
                    
                    return (
                      <tr key={team.id} className="hover:bg-muted/50">
                        <td className="p-3 sticky left-0 bg-background z-10 font-medium border-r">
                            <div className="flex items-center gap-2 min-w-[140px]">
                                <img src={resolvePath(team.flagUrl)} alt={team.id} className="w-5 h-3 object-cover border" />
                                <span className="truncate">{team.name}</span>
                            </div>
                        </td>
                        <td className="p-3 text-muted-foreground w-12 text-center">{pot}</td>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>
          
          <TabsContent value="opponents" className="mt-4 space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Most Likely Opponents</CardTitle>
                    <CardDescription>Select a team to see who they are most likely to face in the group stage.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">Select Team:</span>
                        <Select 
                            value={selectedTeamId} 
                            onValueChange={setSelectedTeamId}
                        >
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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sortedOpponents.map(opp => (
                            <div key={opp.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card text-card-foreground shadow-sm">
                                <div className="font-bold text-lg w-16 text-right text-blue-600 dark:text-blue-400">
                                    {opp.probability.toFixed(1)}%
                                </div>
                                <div className="h-8 w-[1px] bg-border" />
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 font-medium">
                                        <img src={resolvePath(opp.flagUrl)} className="w-4 h-3 object-cover" />
                                        {opp.name}
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        Pot {opp.pot} • {opp.confederation}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {sortedOpponents.length === 0 && (
                            <div className="col-span-full text-center py-12 text-muted-foreground">
                                No opponents found (Run simulation first)
                            </div>
                        )}
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
                     <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">Select Team:</span>
                        <Select 
                            value={selectedTeamId} 
                            onValueChange={setSelectedTeamId}
                        >
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
                         {stadiumProbabilities.length === 0 && (
                            <div className="col-span-full text-center py-12 text-muted-foreground">
                                No stadium data found
                            </div>
                        )}
                    </div>
                </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
}
