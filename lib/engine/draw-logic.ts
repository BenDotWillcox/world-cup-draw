import { Team, Group, APPENDIX_B_POSITIONS, GROUP_NAMES } from '@/types/draw';
import { TEAMS } from '@/lib/data/teams';

// Helper to clone groups - used only for initial setup or when branching needs isolation
const cloneGroups = (groups: Group[]): Group[] => {
  return groups.map(g => ({ ...g, teams: [...g.teams] }));
};

// OPTIMIZED: Check if a team can go into a group without allocations
export const canPlaceTeamInGroup = (team: Team, group: Group): boolean => {
  // 1. UEFA Constraint: Max 2 UEFA teams
  let uefaCount = 0;
  for (let i = 0; i < 4; i++) {
      if (group.teams[i]?.confederation === 'UEFA') {
          uefaCount++;
      }
  }
  
  if (team.confederation === 'UEFA') {
    if (uefaCount >= 2) return false;
  } else {
    // 2. General Constraint: Max 1 team per confederation (non-UEFA)
    const teamConfeds = team.potentialConfederations;

    if (!teamConfeds) {
        // Fast path for standard teams
        const confed = team.confederation;
        for (let i = 0; i < 4; i++) {
            const existing = group.teams[i];
            if (!existing) continue;
            
            if (existing.potentialConfederations) {
                if (existing.potentialConfederations.includes(confed)) return false;
            } else {
                if (existing.confederation === confed) return false;
            }
        }
    } else {
        // Slow path for placeholders
        for (const confed of teamConfeds) {
            if (confed === 'UEFA') continue;
            
            for (let i = 0; i < 4; i++) {
                const existing = group.teams[i];
                if (!existing) continue;
                
                const existingConfeds = existing.potentialConfederations || [existing.confederation];
                if (existingConfeds.includes(confed)) return false;
            }
        }
    }
  }

  return true;
};

// Initialize Groups
export const initializeGroups = (): Group[] => {
  return GROUP_NAMES.map(name => ({
    name,
    teams: [null, null, null, null]
  }));
};

// Helper to check if team is one of the constrained pairs
const isConstrainedPot1Team = (id: string) => ['ESP', 'ARG', 'FRA', 'ENG'].includes(id);

// Pot 1 Live Logic: Check if placing 'team' in 'group' is valid given the constraints
export const canPlaceTeamInPot1 = (
  team: Team, 
  targetGroupIndex: number, 
  currentGroups: Group[]
): boolean => {
    // 1. Basic placement check (Hosts, empty slot)
    const group = currentGroups[targetGroupIndex];
    if (group.teams[0] !== null) return false; // Occupied

    // 3. Side Logic for ESP/ARG/FRA/ENG
    const LEFT_SIDE_INDICES = [3, 4, 5, 6, 7, 8]; // D, E, F, G, H, I
    const RIGHT_SIDE_INDICES = [0, 1, 2, 9, 10, 11]; // A, B, C, J, K, L
    
    const isTargetLeft = LEFT_SIDE_INDICES.includes(targetGroupIndex);

    // Helper to count available slots on a side
    const countEmpty = (indices: number[]) => indices.filter(idx => currentGroups[idx].teams[0] === null).length;
    
    // Check specifically for the "Partner" constraint
    const checkPartnerConstraint = (teamId: string, partnerId: string) => {
        if (team.id === teamId || team.id === partnerId) {
             const isThisTeamPartner = team.id === partnerId;
             const otherId = isThisTeamPartner ? teamId : partnerId;
             
             const otherGroup = currentGroups.find(g => g.teams[0]?.id === otherId);
             
             if (otherGroup) {
                 // Partner is already placed. We MUST be on the opposite side.
                 const partnerIdx = GROUP_NAMES.indexOf(otherGroup.name);
                 const isPartnerLeft = LEFT_SIDE_INDICES.includes(partnerIdx);
                 
                 if (isTargetLeft === isPartnerLeft) return false; // Same side conflict!
             } else {
                 // Partner is NOT placed yet.
                 // If we place THIS team here, will there be room for the partner on the OTHER side?
                 const otherSideIndices = isTargetLeft ? RIGHT_SIDE_INDICES : LEFT_SIDE_INDICES;
                 const emptyOnOtherSide = countEmpty(otherSideIndices);
                 
                 // If the other side is full, we can't place this team here because its partner needs a spot there!
                 if (emptyOnOtherSide === 0) return false;
             }
        } else {
             // We are placing some OTHER team (not part of this pair).
             // We must ensure we don't accidentally block the last slot for a pending pair member.
             
             const p1Placed = currentGroups.some(g => g.teams[0]?.id === teamId);
             const p2Placed = currentGroups.some(g => g.teams[0]?.id === partnerId);
             
             if (!p1Placed && !p2Placed) {
                 // Both still waiting. We need at least 1 slot on Left and 1 slot on Right reserved for them.
                 // Calculate empty slots AFTER this potential placement
                 let leftEmpty = countEmpty(LEFT_SIDE_INDICES);
                 let rightEmpty = countEmpty(RIGHT_SIDE_INDICES);
                 
                 if (isTargetLeft) leftEmpty--;
                 else rightEmpty--;
                 
                 if (leftEmpty < 1 || rightEmpty < 1) return false; // We are blocking the pair!
             } else if (p1Placed && !p2Placed) {
                 // P1 is placed. P2 needs a spot on the opposite side of P1.
                 const p1Group = currentGroups.find(g => g.teams[0]?.id === teamId);
                 const p1Idx = GROUP_NAMES.indexOf(p1Group!.name);
                 const isP1Left = LEFT_SIDE_INDICES.includes(p1Idx);
                 
                 const neededSideIndices = isP1Left ? RIGHT_SIDE_INDICES : LEFT_SIDE_INDICES;
                 const isTargetOnNeededSide = isP1Left ? !isTargetLeft : isTargetLeft;
                 
                 if (isTargetOnNeededSide) {
                     // We are placing a random team on the side P2 needs.
                     // Ensure we don't take the LAST slot.
                     const neededSideEmpty = countEmpty(neededSideIndices);
                     // We are about to take one.
                     if (neededSideEmpty <= 1) return false; // Don't block P2!
                 }
             } else if (!p1Placed && p2Placed) {
                 // Symmetric to above
                 const p2Group = currentGroups.find(g => g.teams[0]?.id === partnerId);
                 const p2Idx = GROUP_NAMES.indexOf(p2Group!.name);
                 const isP2Left = LEFT_SIDE_INDICES.includes(p2Idx);
                 
                 const neededSideIndices = isP2Left ? RIGHT_SIDE_INDICES : LEFT_SIDE_INDICES;
                 const isTargetOnNeededSide = isP2Left ? !isTargetLeft : isTargetLeft;

                 if (isTargetOnNeededSide) {
                     const neededSideEmpty = countEmpty(neededSideIndices);
                     if (neededSideEmpty <= 1) return false;
                 }
             }
        }
        return true;
    };

    if (!checkPartnerConstraint('ESP', 'ARG')) return false;
    if (!checkPartnerConstraint('FRA', 'ENG')) return false;

    return true;
};

// Pot 1 Logic (Pre-calc version - kept for fallback or simulation)
export const drawPot1 = (groups: Group[], pot1Teams: Team[]): Group[] => {
  const newGroups = cloneGroups(groups);
  
  const LEFT_SIDE_INDICES = [3, 4, 5, 6, 7, 8];
  const RIGHT_SIDE_INDICES = [0, 1, 2, 9, 10, 11];

  const hosts = pot1Teams.filter(t => t.isHost);
  const mexico = hosts.find(t => t.id === 'MEX');
  const canada = hosts.find(t => t.id === 'CAN');
  const usa = hosts.find(t => t.id === 'USA');

  if (mexico) newGroups[0].teams[0] = mexico;
  if (canada) newGroups[1].teams[0] = canada;
  if (usa)    newGroups[3].teams[0] = usa;

  let assignedIndices = [0, 1, 3];

  const shuffle = <T>(array: T[]) => array.sort(() => Math.random() - 0.5);

  const assignToSide = (team: Team, allowedIndices: number[]) => {
    const valid = allowedIndices.filter(i => !assignedIndices.includes(i));
    if (valid.length === 0) throw new Error("No slots in requested side");
    const picked = shuffle(valid)[0];
    newGroups[picked].teams[0] = team;
    assignedIndices.push(picked);
    return picked;
  };

  const esp = pot1Teams.find(t => t.id === 'ESP');
  const arg = pot1Teams.find(t => t.id === 'ARG');
  const fra = pot1Teams.find(t => t.id === 'FRA');
  const eng = pot1Teams.find(t => t.id === 'ENG');

  if (esp && arg) {
    const leftAvailable = LEFT_SIDE_INDICES.filter(i => !assignedIndices.includes(i));
    const rightAvailable = RIGHT_SIDE_INDICES.filter(i => !assignedIndices.includes(i));
    let espSide: 'left' | 'right';
    if (leftAvailable.length > 0 && rightAvailable.length > 0) {
         espSide = Math.random() < 0.5 ? 'left' : 'right';
    } else if (leftAvailable.length > 0) {
        espSide = 'left';
    } else {
        espSide = 'right';
    }
    if (espSide === 'left') {
        assignToSide(esp, LEFT_SIDE_INDICES);
        assignToSide(arg, RIGHT_SIDE_INDICES);
    } else {
        assignToSide(esp, RIGHT_SIDE_INDICES);
        assignToSide(arg, LEFT_SIDE_INDICES);
    }
  }

  if (fra && eng) {
    const leftAvailable = LEFT_SIDE_INDICES.filter(i => !assignedIndices.includes(i));
    const rightAvailable = RIGHT_SIDE_INDICES.filter(i => !assignedIndices.includes(i));
    let fraSide: 'left' | 'right';
    if (leftAvailable.length > 0 && rightAvailable.length > 0) {
         fraSide = Math.random() < 0.5 ? 'left' : 'right';
    } else if (leftAvailable.length > 0) {
        fraSide = 'left';
    } else {
        fraSide = 'right';
    }
    if (fraSide === 'left') {
        assignToSide(fra, LEFT_SIDE_INDICES);
        assignToSide(eng, RIGHT_SIDE_INDICES);
    } else {
        assignToSide(fra, RIGHT_SIDE_INDICES);
        assignToSide(eng, LEFT_SIDE_INDICES);
    }
  }

  const placedIds = new Set(['MEX', 'CAN', 'USA', 'ESP', 'ARG', 'FRA', 'ENG']);
  const remainingTeams = pot1Teams.filter(t => !placedIds.has(t.id));
  const allIndices = [...Array(12).keys()];
  
  const remainingSlots = allIndices.filter(i => !assignedIndices.includes(i));
  const shuffledOthers = shuffle(remainingTeams);

  shuffledOthers.forEach((team, idx) => {
      if (idx < remainingSlots.length) {
        const slot = remainingSlots[idx];
        newGroups[slot].teams[0] = team;
      }
  });

  return newGroups;
};

// OPTIMIZED: Recursive Backtracking with Mutation
export const drawPot = (
  currentGroups: Group[], 
  potTeams: Team[], 
  potNumber: 2 | 3 | 4
): Group[] | null => {
  const trySolve = (attemptsLeft: number): Group[] | null => {
      const shuffledTeams = [...potTeams].sort(() => Math.random() - 0.5);
      
      // Create a mutable working copy for this attempt
      const workingGroups = cloneGroups(currentGroups);

      const solve = (teamIdx: number): boolean => {
        if (teamIdx >= shuffledTeams.length) {
          return true;
        }

        const team = shuffledTeams[teamIdx];
        
        // Optimization: Try groups in order (0-11) or shuffled? 
        // Random order helps distribution if multiple valid slots exist, preventing bias.
        // But for performance, static order is faster. 
        // Given teams are shuffled, static group order is usually acceptable for stats.
        // Let's keep it 0-11 to be consistent with previous logic, or we can shuffle indices if bias appears.
        
        for (let groupIdx = 0; groupIdx < 12; groupIdx++) {
          const group = workingGroups[groupIdx];
          const targetPos1Based = APPENDIX_B_POSITIONS[potNumber][groupIdx];
          const targetPosIndex = targetPos1Based - 1;

          if (group.teams[targetPosIndex] !== null) continue;

          if (canPlaceTeamInGroup(team, group)) {
            // MUTATE
            group.teams[targetPosIndex] = team;

            if (solve(teamIdx + 1)) return true;

            // BACKTRACK
            group.teams[targetPosIndex] = null;
          }
        }
        return false;
      };

      if (solve(0)) return workingGroups;
      
      if (attemptsLeft > 0) {
          return trySolve(attemptsLeft - 1);
      }
      return null;
  };

  return trySolve(10);
};

const validateFinalDraw = (groups: Group[]): boolean => {
  for (const group of groups) {
    // Optimization: Direct loop
    let uefaCount = 0;
    for (let i = 0; i < 4; i++) {
        if (group.teams[i]?.confederation === 'UEFA') uefaCount++;
    }
    
    if (uefaCount < 1) return false;
    if (uefaCount > 2) return false;
  }
  return true;
};

export const simulateFullDraw = (): Group[] => {
  let attempts = 0;
  while (attempts < 100) {
      try {
        let groups = initializeGroups();
        const p1 = TEAMS.slice(0, 12);
        const p2 = TEAMS.slice(12, 24);
        const p3 = TEAMS.slice(24, 36);
        const p4 = TEAMS.slice(36, 48);

        groups = drawPot1(groups, p1);
        let res = drawPot(groups, p2, 2);
        if (!res) throw new Error("Deadlock in Pot 2");
        groups = res;
        res = drawPot(groups, p3, 3);
        if (!res) throw new Error("Deadlock in Pot 3");
        groups = res;
        res = drawPot(groups, p4, 4);
        if (!res) throw new Error("Deadlock in Pot 4");
        groups = res;

        if (validateFinalDraw(groups)) {
            return groups;
        }
      } catch (e) {
          // continue
      }
      attempts++;
  }
  throw new Error("Could not generate valid draw satisfying all constraints after 100 attempts");
};


// New helper for validateConstraintCounts: Chained Backtracking with Mutation
const canFitTeamsSequentially = (
  initialGroups: Group[], 
  potsData: { potNum: number, teams: Team[] }[]
): boolean => {
  // Clone initially to avoid mutating the passed-in state which might be used by UI
  const workingGroups = cloneGroups(initialGroups);

  const solveRecursively = (potDataIdx: number): boolean => {
    if (potDataIdx >= potsData.length) {
        return validateFinalDraw(workingGroups);
    }

    const currentPotData = potsData[potDataIdx];
    const potNum = currentPotData.potNum as 2 | 3 | 4;
    const teamsToPlace = currentPotData.teams;
    
    if (teamsToPlace.length === 0) {
        return solveRecursively(potDataIdx + 1);
    }

    // Sort teams by constraint difficulty
    const sortedTeams = [...teamsToPlace].sort((a, b) => {
      const aPoly = a.potentialConfederations ? 1 : 0;
      const bPoly = b.potentialConfederations ? 1 : 0;
      if (aPoly !== bPoly) return bPoly - aPoly; 
      return a.id.localeCompare(b.id);
    });

    // Identify available groups for this pot
    const availableGroupIndices: number[] = [];
    for (let i = 0; i < 12; i++) {
       const posMap = APPENDIX_B_POSITIONS[potNum][i];
       const pIdx = posMap - 1;
       if (workingGroups[i].teams[pIdx] === null) {
           availableGroupIndices.push(i);
       }
    }

    if (availableGroupIndices.length < sortedTeams.length) return false;

    // Backtracking solver for CURRENT pot
    const solvePot = (teamIdx: number, availableIndices: number[]): boolean => {
        if (teamIdx >= sortedTeams.length) {
            return solveRecursively(potDataIdx + 1);
        }

        const team = sortedTeams[teamIdx];
        
        for (let i = 0; i < availableIndices.length; i++) {
            const gIdx = availableIndices[i];
            const group = workingGroups[gIdx];
            const posMap = APPENDIX_B_POSITIONS[potNum][gIdx];
            const posIndex = posMap - 1;
            
            if (canPlaceTeamInGroup(team, group)) {
                // MUTATE
                group.teams[posIndex] = team;

                // Remove this group from available and recurse
                const nextAvailable = [...availableIndices];
                nextAvailable.splice(i, 1);
                
                if (solvePot(teamIdx + 1, nextAvailable)) return true;

                // BACKTRACK
                group.teams[posIndex] = null;
            }
        }
        return false;
    };

    return solvePot(0, availableGroupIndices);
  };

  return solveRecursively(0);
};

// NEW: Lightweight validation instead of full simulation
export const validateConstraintCounts = (
    groups: Group[],
    remainingTeams: Team[]
): boolean => {
    // 1. Group remaining teams by Pot
    const teamsByPot: Record<number, Team[]> = { 2: [], 3: [], 4: [] };

    for (const t of remainingTeams) {
        if (t.pot && t.pot >= 2) {
            teamsByPot[t.pot].push(t);
        }
    }

    // 2. Chain Pots 2 -> 3 -> 4
    const potsData = [
        { potNum: 2, teams: teamsByPot[2] },
        { potNum: 3, teams: teamsByPot[3] },
        { potNum: 4, teams: teamsByPot[4] }
    ];

    return canFitTeamsSequentially(groups, potsData);
};
