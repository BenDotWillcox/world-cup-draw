import { useState, useCallback, useEffect, useRef } from 'react';
import { Team, Group, APPENDIX_B_POSITIONS } from '@/types/draw';
import { initializeGroups, canPlaceTeamInGroup, canPlaceTeamInPot1, validateConstraintCounts } from '@/lib/engine/draw-logic';
import { TEAMS } from '@/lib/data/teams';

export type DrawStep = {
  team: Team;
  groupIndex: number;
  positionIndex: number;
  potNumber: 1 | 2 | 3 | 4;
};

export const useDrawSimulation = () => {
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
    startDraw();
  }, [startDraw]);

  const advancePot = useCallback(() => {
    if (currentPot === 4) {
        setIsRunning(false);
        isRunningRef.current = false;
        return;
    }
    const nextPot = (currentPot + 1) as 2|3|4;
    setCurrentPot(nextPot);
    const nextTeams = TEAMS.filter(t => t.pot === nextPot);
    setAvailableTeams(nextTeams);
    
    // Clear any processing state
    isProcessingRef.current = false;
    setCurrentTeam(null);
    setScanningGroupIndex(null);
    setScanningStatus(null);
    
  }, [currentPot]);

  const nextStep = useCallback(async () => {
    if (!isRunning || isProcessingRef.current) return;
    
    // If no teams left in current pot, try to advance
    if (availableTeams.length === 0) {
        if (currentPot < 4) {
            advancePot();
        } else {
            setIsRunning(false);
        }
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

      if (currentPot === 1) {
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
          if (currentPot < 2) allRemainingTeams.push(...TEAMS.filter(t => t.pot === 2));
          if (currentPot < 3) allRemainingTeams.push(...TEAMS.filter(t => t.pot === 3));
          if (currentPot < 4) allRemainingTeams.push(...TEAMS.filter(t => t.pot === 4));

          for (let gIdx = 0; gIdx < 12; gIdx++) {
              const posMap = APPENDIX_B_POSITIONS[currentPot][gIdx];
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

  return {
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
    steps: [],
    fastForward: () => {}
  };
};
