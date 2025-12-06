"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { Team, Group, APPENDIX_B_POSITIONS } from '@/types/draw';
import { initializeGroups, canPlaceTeamInGroup, canPlaceTeamInPot1, validateConstraintCounts } from '@/lib/engine/draw-logic';
import { TEAMS } from '@/lib/data/teams';

export type DrawStep = {
  team: Team;
  groupIndex: number;
  positionIndex: number;
  potNumber: 1 | 2 | 3 | 4;
};

interface DrawContextType {
  groups: Group[];
  startDraw: () => void;
  nextStep: () => void;
  reset: () => void;
  currentTeam: Team | null;
  isRunning: boolean;
  scanningGroupIndex: number | null;
  scanningStatus: 'scanning' | 'found' | 'rejected' | null;
  currentPot: 1 | 2 | 3 | 4;
  totalSteps: number;
  currentStepIndex: number;
  calculateValidGroups: (team: Team) => number[];
  placeTeam: (team: Team, groupIndex: number) => void;
  removeTeam: (team: Team, groupIndex: number) => void;
  steps: DrawStep[];
  fastForward: () => void;
}

const DrawContext = createContext<DrawContextType | undefined>(undefined);

export const DrawProvider = ({ children }: { children: ReactNode }) => {
  // --- STATE ---
  const [groups, setGroups] = useState<Group[]>(() => {
    const initial = initializeGroups();
    const mex = TEAMS.find(t => t.id === 'MEX');
    const can = TEAMS.find(t => t.id === 'CAN');
    const usa = TEAMS.find(t => t.id === 'USA');
    if (mex) initial[0].teams[0] = mex; // A1
    if (can) initial[1].teams[0] = can; // B1
    if (usa) initial[3].teams[0] = usa; // D1
    return initial;
  });

  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [currentPot, setCurrentPot] = useState<1 | 2 | 3 | 4>(1);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [scanningGroupIndex, setScanningGroupIndex] = useState<number | null>(null);
  const [scanningStatus, setScanningStatus] = useState<'scanning' | 'found' | 'rejected' | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const isProcessingRef = useRef(false);
  const isRunningRef = useRef(isRunning);

  // --- ACTIONS ---

  const startDraw = useCallback(() => {
    const cleanGroups = initializeGroups();
    const mex = TEAMS.find(t => t.id === 'MEX');
    const can = TEAMS.find(t => t.id === 'CAN');
    const usa = TEAMS.find(t => t.id === 'USA');
    if (mex) cleanGroups[0].teams[0] = mex;
    if (can) cleanGroups[1].teams[0] = can;
    if (usa) cleanGroups[3].teams[0] = usa;
    setGroups(cleanGroups);
    
    setCurrentPot(1);
    setIsRunning(true);
    setScanningGroupIndex(null);
    setScanningStatus(null);
    setCurrentTeam(null);
    isProcessingRef.current = false;
    isRunningRef.current = true;

    // Set available teams for Pot 1 (excluding hosts)
    const pot1Teams = TEAMS.filter(t => t.pot === 1 && !t.isHost);
    setAvailableTeams(pot1Teams);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setScanningGroupIndex(null);
    setScanningStatus(null);
    setCurrentTeam(null);
    isProcessingRef.current = false;
    isRunningRef.current = false;
    
    // Re-initialize groups to initial state (Hosts placed only)
    const cleanGroups = initializeGroups();
    const mex = TEAMS.find(t => t.id === 'MEX');
    const can = TEAMS.find(t => t.id === 'CAN');
    const usa = TEAMS.find(t => t.id === 'USA');
    if (mex) cleanGroups[0].teams[0] = mex;
    if (can) cleanGroups[1].teams[0] = can;
    if (usa) cleanGroups[3].teams[0] = usa;
    setGroups(cleanGroups);
    
    setCurrentPot(1);
    setAvailableTeams([]); 
  }, []);

  const advancePot = useCallback(() => {
    if (currentPot === 4) {
        setIsRunning(false);
        isRunningRef.current = false;
        return;
    }
    const nextPot = (currentPot + 1) as 2|3|4;
    setCurrentPot(nextPot);
    
    // Filter teams that are already placed in the groups
    const nextTeams = TEAMS.filter(t => {
      if (t.pot !== nextPot) return false;
      const isPlaced = groups.some(g => g.teams.some(gt => gt?.id === t.id));
      return !isPlaced;
    });
    setAvailableTeams(nextTeams);
    
    // Clear any processing state
    isProcessingRef.current = false;
    setCurrentTeam(null);
    setScanningGroupIndex(null);
    setScanningStatus(null);
    
  }, [currentPot, groups]);

  // --- NEW: Manual Placement Support ---

  const calculateValidGroups = useCallback((team: Team): number[] => {
    const validIndices: number[] = [];
    
    // Pot 1 Logic
    if (team.pot === 1) {
        for (let gIdx = 0; gIdx < 12; gIdx++) {
             if (canPlaceTeamInPot1(team, gIdx, groups)) {
                 validIndices.push(gIdx);
             }
        }
        return validIndices;
    }

    // Pots 2, 3, 4 Logic
    // Combine remaining teams for validation
    const remainingInPot = availableTeams.filter(t => t.id !== team.id);
    let allRemainingTeams = [...remainingInPot];

    const isTeamPlaced = (tId: string) => groups.some(g => g.teams.some(gt => gt?.id === tId));

    if (currentPot < 2 && team.pot < 2) allRemainingTeams.push(...TEAMS.filter(t => t.pot === 2 && !isTeamPlaced(t.id)));
    if (currentPot < 3 && team.pot < 3) allRemainingTeams.push(...TEAMS.filter(t => t.pot === 3 && !isTeamPlaced(t.id)));
    if (currentPot < 4 && team.pot < 4) allRemainingTeams.push(...TEAMS.filter(t => t.pot === 4 && !isTeamPlaced(t.id)));

    for (let gIdx = 0; gIdx < 12; gIdx++) {
        const posMap = APPENDIX_B_POSITIONS[team.pot as 2|3|4][gIdx];
        const pIdx = posMap - 1;
        
        if (groups[gIdx].teams[pIdx] !== null) continue;
        if (!canPlaceTeamInGroup(team, groups[gIdx])) continue;

        const tempGroups = groups.map(g => ({...g, teams: [...g.teams]}));
        tempGroups[gIdx].teams[pIdx] = team;
        
        if (validateConstraintCounts(tempGroups, allRemainingTeams)) {
            validIndices.push(gIdx);
        }
    }

    return validIndices;
  }, [availableTeams, currentPot, groups]);

  const placeTeam = useCallback((team: Team, groupIndex: number) => {
      let targetPositionIndex = 0;
      if (team.pot > 1) {
         const posMap = APPENDIX_B_POSITIONS[team.pot as 2|3|4][groupIndex];
         targetPositionIndex = posMap - 1;
      }

      setGroups(prev => {
          const newGroups = [...prev];
          newGroups[groupIndex] = {
              ...newGroups[groupIndex],
              teams: [...newGroups[groupIndex].teams]
          };
          newGroups[groupIndex].teams[targetPositionIndex] = team;
          return newGroups;
      });

      // Remove from available teams
      setAvailableTeams(prev => prev.filter(t => t.id !== team.id));
      
      // Reset current team if we just placed it manually
      if (currentTeam?.id === team.id) {
          setCurrentTeam(null);
          setScanningGroupIndex(null);
          setScanningStatus(null);
          isProcessingRef.current = false;
      }
      
  }, [currentPot, currentTeam]);

  const removeTeam = useCallback((team: Team, groupIndex: number) => {
      // Find position to clear
      let targetPositionIndex = 0;
      if (team.pot > 1) {
         const posMap = APPENDIX_B_POSITIONS[team.pot as 2|3|4][groupIndex];
         targetPositionIndex = posMap - 1;
      } else {
          // For Pot 1, it's always index 0
          targetPositionIndex = 0;
      }

      // Update Groups
      setGroups(prev => {
          const newGroups = [...prev];
          newGroups[groupIndex] = {
              ...newGroups[groupIndex],
              teams: [...newGroups[groupIndex].teams]
          };
          newGroups[groupIndex].teams[targetPositionIndex] = null;
          return newGroups;
      });

      // Revert Pot Logic
      if (team.pot < currentPot) {
          setCurrentPot(team.pot as 1|2|3|4);
          
          // We need to find all unassigned teams for this "old" pot to properly populate availableTeams
          // We use the current 'groups' state, but treating the team we just removed as definitely unassigned
          const unassignedFromTargetPot = TEAMS.filter(t => {
              if (t.pot !== team.pot) return false;
              if (t.id === team.id) return true;
              
              // Check if currently assigned in any OTHER group
              // (Since we haven't updated 'groups' in this closure yet, it is still in groupIndex)
              const isAssigned = groups.some((g, gIdx) => {
                   if (gIdx === groupIndex && t.id === team.id) return false; // We are removing this one
                   return g.teams.some(gt => gt?.id === t.id);
              });
              return !isAssigned;
          });
          
          setAvailableTeams(unassignedFromTargetPot);
      } else {
          // Same pot (or future pot? shouldn't happen given UI constraints usually, but standard add back)
          setAvailableTeams(prev => {
             if (prev.find(t => t.id === team.id)) return prev;
             return [...prev, team];
          });
      }

  }, [currentPot, groups]);


  const nextStep = useCallback(async () => {
    if (!isRunning || isProcessingRef.current) return;
    
    // If no teams left in current pot, try to advance
    if (availableTeams.length === 0) {
        if (currentPot < 4) {
            advancePot();
        }
        // If Pot 4, do nothing (stay in edit mode)
        return;
    }

    isProcessingRef.current = true;

    try {
      // 1. Draw Random Team
      const randomIndex = Math.floor(Math.random() * availableTeams.length);
      const team = availableTeams[randomIndex];
      
      console.log(`Drawing team: ${team.name} (Pot ${currentPot})`);

      const remainingInPot = [...availableTeams];
      remainingInPot.splice(randomIndex, 1);
      setAvailableTeams(remainingInPot);
      
      setCurrentTeam(team);
      await new Promise(r => setTimeout(r, 1000));

      // 2. Find Target Slot
      let targetGroupIndex = -1;
      let targetPositionIndex = -1;

      if (team.pot === 1) {
          // Live Pot 1 Scan Logic
          for (let gIdx = 0; gIdx < 12; gIdx++) {
              if (canPlaceTeamInPot1(team, gIdx, groups)) {
                  targetGroupIndex = gIdx;
                  targetPositionIndex = 0;
                  break;
              }
          }
      } else {
          // Pots 2, 3, 4: FAST Constraint Validation Logic
          // Combine all remaining teams
          let allRemainingTeams = [...remainingInPot];
          // Use currentPot to guess future, but safeguard against going back? 
          // If we are placing a Pot 2 team, we need to consider Pot 3 and 4 teams.
          // If availableTeams has teams from Pot 2, 3, 4 mixed, remainingInPot has them.
          // If we are strictly sequential, TEAMS.filter works.
          
          const isTeamPlaced = (tId: string) => groups.some(g => g.teams.some(gt => gt?.id === tId));

          if (currentPot < 2 && team.pot < 2) allRemainingTeams.push(...TEAMS.filter(t => t.pot === 2 && !isTeamPlaced(t.id)));
          if (currentPot < 3 && team.pot < 3) allRemainingTeams.push(...TEAMS.filter(t => t.pot === 3 && !isTeamPlaced(t.id)));
          if (currentPot < 4 && team.pot < 4) allRemainingTeams.push(...TEAMS.filter(t => t.pot === 4 && !isTeamPlaced(t.id)));

          for (let gIdx = 0; gIdx < 12; gIdx++) {
              const posMap = APPENDIX_B_POSITIONS[team.pot as 2|3|4][gIdx];
              const pIdx = posMap - 1;
              
              if (groups[gIdx].teams[pIdx] !== null) continue;
              if (!canPlaceTeamInGroup(team, groups[gIdx])) continue;

              const tempGroups = groups.map(g => ({...g, teams: [...g.teams]}));
              tempGroups[gIdx].teams[pIdx] = team;
              
              // Use the new lightning-fast validation check
              if (validateConstraintCounts(tempGroups, allRemainingTeams)) {
                  targetGroupIndex = gIdx;
                  targetPositionIndex = pIdx;
                  break;
              }
          }
      }

      if (targetGroupIndex === -1) {
          console.error(`DEADLOCK: No valid slot for ${team.name} in Pot ${currentPot}`);
          console.error("Groups state:", JSON.stringify(groups.map(g => g.teams.map(t => t?.id).join(',')), null, 2));
          
          setIsRunning(false);
          alert(`Deadlock encountered for ${team.name}. The simulation cannot continue from this state. This implies a previous step made a suboptimal choice.`);
          return;
      }

      // 3. Animate Scanning
      const scanDelay = 150;
      
      for (let i = 0; i < targetGroupIndex; i++) {
          setScanningGroupIndex(i);
          setScanningStatus('rejected');
          await new Promise(r => setTimeout(r, scanDelay));
      }
      
      // Target found
      setScanningGroupIndex(targetGroupIndex);
      setScanningStatus('found');
      await new Promise(r => setTimeout(r, 500));

      // 4. Place Team
      setGroups(prev => {
          const newGroups = [...prev];
          newGroups[targetGroupIndex] = {
              ...newGroups[targetGroupIndex],
              teams: [...newGroups[targetGroupIndex].teams]
          };
          newGroups[targetGroupIndex].teams[targetPositionIndex] = team;
          return newGroups;
      });
    } catch (err) {
      console.error("Error in nextStep execution:", err);
    } finally {
      // Always reset processing state
      setScanningGroupIndex(null);
      setScanningStatus(null);
      setCurrentTeam(null);
      isProcessingRef.current = false;
    }
    
  }, [availableTeams, currentPot, groups, isRunning, advancePot]);

  // Keep refs updated
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  // Auto-advance when pot is empty
  useEffect(() => {
    if (isRunning && availableTeams.length === 0 && !currentTeam && !scanningStatus && !isProcessingRef.current) {
        const timer = setTimeout(() => {
            if (currentPot < 4) {
                advancePot();
            }
            // If Pot 4 is done, we stay in running state to allow edits
        }, 1000);
        return () => clearTimeout(timer);
    }
  }, [availableTeams, isRunning, currentTeam, scanningStatus, currentPot, advancePot]);

  const value = {
    groups,
    startDraw,
    nextStep,
    reset,
    currentTeam,
    isRunning,
    scanningGroupIndex,
    scanningStatus,
    currentPot,
    totalSteps: 48,
    currentStepIndex: 48 - availableTeams.length,
    calculateValidGroups,
    placeTeam,
    removeTeam,
    steps: [],
    fastForward: () => {}
  };

  return <DrawContext.Provider value={value}>{children}</DrawContext.Provider>;
};

export const useDrawSimulation = () => {
  const context = useContext(DrawContext);
  if (context === undefined) {
    throw new Error('useDrawSimulation must be used within a DrawProvider');
  }
  return context;
};

