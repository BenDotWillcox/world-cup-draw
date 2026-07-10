import { Team, Group, APPENDIX_B_POSITIONS, GROUP_NAMES, getPossibleConfederations } from '@/types/draw';
import { TEAMS } from '@/lib/data/teams';
import type { RandomSource } from '@/lib/engine/random';

// Helper to clone groups - used only for initial setup or when branching needs isolation
const cloneGroups = (groups: Group[]): Group[] => {
  return groups.map(g => ({ ...g, teams: [...g.teams] }));
};

const shuffledCopy = <T>(values: T[], random: RandomSource): T[] => {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
};

const HOST_GROUP_INDEX: Record<string, number> = {
  MEX: 0,
  CAN: 1,
  USA: 3,
};

// OPTIMIZED: Check if a team can go into a group without allocations
export const canPlaceTeamInGroup = (team: Team, group: Group): boolean => {
  const teamConfeds = getPossibleConfederations(team);
  const existingConfeds = group.teams
    .filter((existing): existing is Team => existing !== null)
    .map(getPossibleConfederations);

  // A playoff placeholder must be valid for every team that could eventually
  // win that path. Treat possible confederations conservatively in both
  // directions: at most two possible UEFA teams, and no repeated non-UEFA
  // confederation.
  if (teamConfeds.includes('UEFA')) {
    const possibleUefaCount = existingConfeds.filter(confeds => confeds.includes('UEFA')).length;
    if (possibleUefaCount >= 2) return false;
  }

  for (const confed of teamConfeds) {
    if (confed === 'UEFA') continue;
    if (existingConfeds.some(confeds => confeds.includes(confed))) return false;
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

// Pot 1 Live Logic: Check if placing 'team' in 'group' is valid given the constraints
export const canPlaceTeamInPot1 = (
  team: Team, 
  targetGroupIndex: number, 
  currentGroups: Group[]
): boolean => {
    // 1. Basic placement check (Hosts, empty slot)
    const group = currentGroups[targetGroupIndex];
    if (group.teams[0] !== null) return false; // Occupied

    const fixedHostGroup = HOST_GROUP_INDEX[team.id];
    if (fixedHostGroup !== undefined && fixedHostGroup !== targetGroupIndex) return false;

    const reservedHost = Object.entries(HOST_GROUP_INDEX).find(([, groupIndex]) => groupIndex === targetGroupIndex)?.[0];
    if (reservedHost && reservedHost !== team.id) return false;

    // `completeCurrentDraw` can receive a sparse state with later-pot teams
    // already present. Pot 1 placement must remain compatible with them.
    if (!canPlaceTeamInGroup(team, group)) return false;

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
export const drawPot1 = (
  groups: Group[],
  pot1Teams: Team[],
  random: RandomSource = Math.random,
): Group[] => {
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

  const assignedIndices = [0, 1, 3];

  const assignToSide = (team: Team, allowedIndices: number[]) => {
    const valid = allowedIndices.filter(i => !assignedIndices.includes(i));
    if (valid.length === 0) throw new Error("No slots in requested side");
    const picked = shuffledCopy(valid, random)[0];
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
         espSide = random() < 0.5 ? 'left' : 'right';
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
         fraSide = random() < 0.5 ? 'left' : 'right';
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
  const shuffledOthers = shuffledCopy(remainingTeams, random);

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
  potNumber: 2 | 3 | 4,
  random: RandomSource = Math.random,
): Group[] | null => {
  const trySolve = (attemptsLeft: number): Group[] | null => {
      const shuffledTeams = shuffledCopy(potTeams, random);
      const groupOrder = shuffledCopy([...Array(12).keys()], random);
      
      // Create a mutable working copy for this attempt
      const workingGroups = cloneGroups(currentGroups);

      const solve = (remainingTeams: Team[]): boolean => {
        if (remainingTeams.length === 0) return true;

        // Minimum-remaining-values ordering avoids factorial searches in
        // constrained or impossible states. The initial shuffle still
        // randomizes ties between equally constrained teams.
        let chosenTeamIndex = -1;
        let chosenGroups: number[] = [];

        for (let teamIdx = 0; teamIdx < remainingTeams.length; teamIdx++) {
          const candidate = remainingTeams[teamIdx];
          const validGroups: number[] = [];

          for (const groupIdx of groupOrder) {
            const group = workingGroups[groupIdx];
            const targetPosIndex = APPENDIX_B_POSITIONS[potNumber][groupIdx] - 1;
            if (group.teams[targetPosIndex] === null && canPlaceTeamInGroup(candidate, group)) {
              validGroups.push(groupIdx);
            }
          }

          if (validGroups.length === 0) return false;
          if (chosenTeamIndex === -1 || validGroups.length < chosenGroups.length) {
            chosenTeamIndex = teamIdx;
            chosenGroups = validGroups;
          }
        }

        const chosenTeam = remainingTeams[chosenTeamIndex];
        const nextTeams = remainingTeams.filter((_, index) => index !== chosenTeamIndex);

        for (const groupIdx of chosenGroups) {
          const targetPosIndex = APPENDIX_B_POSITIONS[potNumber][groupIdx] - 1;
          workingGroups[groupIdx].teams[targetPosIndex] = chosenTeam;

          if (solve(nextTeams)) return true;

          workingGroups[groupIdx].teams[targetPosIndex] = null;
        }

        return false;
      };

      if (solve(shuffledTeams)) return workingGroups;
      
      if (attemptsLeft > 0) {
          return trySolve(attemptsLeft - 1);
      }
      return null;
  };

  return trySolve(10);
};

const validateFinalDraw = (groups: Group[]): boolean => {
  if (groups.length !== GROUP_NAMES.length) return false;

  const expectedIds = new Set(TEAMS.map(team => team.id));
  const assignedIds = new Set<string>();

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const group = groups[groupIndex];
    if (group.name !== GROUP_NAMES[groupIndex] || group.teams.length !== 4) return false;

    const possibleConfeds: string[][] = [];
    for (let positionIndex = 0; positionIndex < group.teams.length; positionIndex++) {
      const team = group.teams[positionIndex];
      if (!team || !expectedIds.has(team.id) || assignedIds.has(team.id)) return false;

      const expectedPot = positionIndex === 0
        ? 1
        : ([2, 3, 4] as const).find(
            pot => APPENDIX_B_POSITIONS[pot][groupIndex] - 1 === positionIndex,
          );
      if (team.pot !== expectedPot) return false;

      assignedIds.add(team.id);
      possibleConfeds.push(getPossibleConfederations(team));
    }

    const guaranteedUefaCount = possibleConfeds.filter(
      confeds => confeds.length > 0 && confeds.every(confed => confed === 'UEFA'),
    ).length;
    const possibleUefaCount = possibleConfeds.filter(confeds => confeds.includes('UEFA')).length;
    if (guaranteedUefaCount < 1 || possibleUefaCount > 2) return false;

    for (const confed of ['AFC', 'CAF', 'CONCACAF', 'CONMEBOL', 'OFC']) {
      if (possibleConfeds.filter(confeds => confeds.includes(confed)).length > 1) return false;
    }
  }

  if (assignedIds.size !== expectedIds.size) return false;
  for (const id of expectedIds) {
    if (!assignedIds.has(id)) return false;
  }

  for (const [hostId, groupIndex] of Object.entries(HOST_GROUP_INDEX)) {
    if (groups[groupIndex].teams[0]?.id !== hostId) return false;
  }

  const leftSide = new Set([3, 4, 5, 6, 7, 8]);
  const groupIndexFor = (teamId: string): number =>
    groups.findIndex(group => group.teams.some(team => team?.id === teamId));

  for (const [first, second] of [['ESP', 'ARG'], ['FRA', 'ENG']] as const) {
    if (leftSide.has(groupIndexFor(first)) === leftSide.has(groupIndexFor(second))) return false;
  }

  return true;
};

export const simulateFullDraw = (random: RandomSource = Math.random): Group[] => {
  let attempts = 0;
  while (attempts < 100) {
      try {
        let groups = initializeGroups();
        const p1 = TEAMS.slice(0, 12);
        const p2 = TEAMS.slice(12, 24);
        const p3 = TEAMS.slice(24, 36);
        const p4 = TEAMS.slice(36, 48);

        groups = drawPot1(groups, p1, random);
        let res = drawPot(groups, p2, 2, random);
        if (!res) throw new Error("Deadlock in Pot 2");
        groups = res;
        res = drawPot(groups, p3, 3, random);
        if (!res) throw new Error("Deadlock in Pot 3");
        groups = res;
        res = drawPot(groups, p4, 4, random);
        if (!res) throw new Error("Deadlock in Pot 4");
        groups = res;

        if (validateFinalDraw(groups)) {
            return groups;
        }
      } catch {
          // continue
      }
      attempts++;
  }
  throw new Error("Could not generate valid draw satisfying all constraints after 100 attempts");
};


export const completeCurrentDraw = (
  currentGroups: Group[],
  unplacedTeams: Team[],
  random: RandomSource = Math.random,
): Group[] => {
  const workingGroups = cloneGroups(currentGroups);
  const remainingByPot = ([1, 2, 3, 4] as const).map(pot => ({
    pot,
    teams: unplacedTeams.filter(team => team.pot === pot),
  }));

  const solveLaterPots = (potDataIndex: number): boolean => {
    if (potDataIndex >= remainingByPot.length) return validateFinalDraw(workingGroups);

    const { pot, teams } = remainingByPot[potDataIndex];
    if (pot === 1) return solveLaterPots(potDataIndex + 1);

    const availableSlots = GROUP_NAMES.reduce((count, _, groupIndex) => {
      const positionIndex = APPENDIX_B_POSITIONS[pot][groupIndex] - 1;
      return count + (workingGroups[groupIndex].teams[positionIndex] === null ? 1 : 0);
    }, 0);
    if (availableSlots !== teams.length) return false;

    const solveTeams = (remainingTeams: Team[]): boolean => {
      if (remainingTeams.length === 0) return solveLaterPots(potDataIndex + 1);

      const groupOrder = shuffledCopy([...Array(12).keys()], random);
      let chosenTeamIndex = -1;
      let chosenGroups: number[] = [];

      for (let teamIndex = 0; teamIndex < remainingTeams.length; teamIndex++) {
        const candidate = remainingTeams[teamIndex];
        const validGroups = groupOrder.filter(groupIndex => {
          const positionIndex = APPENDIX_B_POSITIONS[pot][groupIndex] - 1;
          return workingGroups[groupIndex].teams[positionIndex] === null
            && canPlaceTeamInGroup(candidate, workingGroups[groupIndex]);
        });

        if (validGroups.length === 0) return false;
        if (chosenTeamIndex === -1 || validGroups.length < chosenGroups.length) {
          chosenTeamIndex = teamIndex;
          chosenGroups = validGroups;
        }
      }

      const chosenTeam = remainingTeams[chosenTeamIndex];
      const nextTeams = remainingTeams.filter((_, index) => index !== chosenTeamIndex);

      for (const groupIndex of chosenGroups) {
        const positionIndex = APPENDIX_B_POSITIONS[pot][groupIndex] - 1;
        workingGroups[groupIndex].teams[positionIndex] = chosenTeam;
        if (solveTeams(nextTeams)) return true;
        workingGroups[groupIndex].teams[positionIndex] = null;
      }

      return false;
    };

    return solveTeams(shuffledCopy(teams, random));
  };

  const pot1Teams = remainingByPot[0].teams;
  const availablePot1Slots = workingGroups.filter(group => group.teams[0] === null).length;

  const solvePot1 = (remainingTeams: Team[]): boolean => {
    if (remainingTeams.length === 0) return solveLaterPots(1);

    const groupOrder = shuffledCopy([...Array(12).keys()], random);
    let chosenTeamIndex = -1;
    let chosenGroups: number[] = [];

    for (let teamIndex = 0; teamIndex < remainingTeams.length; teamIndex++) {
      const candidate = remainingTeams[teamIndex];
      const validGroups = groupOrder.filter(groupIndex =>
        canPlaceTeamInPot1(candidate, groupIndex, workingGroups),
      );

      if (validGroups.length === 0) return false;
      if (chosenTeamIndex === -1 || validGroups.length < chosenGroups.length) {
        chosenTeamIndex = teamIndex;
        chosenGroups = validGroups;
      }
    }

    const chosenTeam = remainingTeams[chosenTeamIndex];
    const nextTeams = remainingTeams.filter((_, index) => index !== chosenTeamIndex);

    for (const groupIndex of chosenGroups) {
      workingGroups[groupIndex].teams[0] = chosenTeam;
      if (solvePot1(nextTeams)) return true;
      workingGroups[groupIndex].teams[0] = null;
    }

    return false;
  };

  if (availablePot1Slots === pot1Teams.length && solvePot1(shuffledCopy(pot1Teams, random))) {
    return workingGroups;
  }

  throw new Error("Could not complete draw from current state");
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
