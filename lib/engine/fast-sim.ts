import { TEAMS } from '@/lib/data/teams';
import { Team, GROUP_NAMES } from '@/types/draw';

// --- PRE-COMPUTATION ---

// Map Confederations to Bitmasks for O(1) checks
const CONFED_BITS: Record<string, number> = {
  'AFC': 1,
  'CAF': 2,
  'CONCACAF': 4,
  'CONMEBOL': 8,
  'OFC': 16,
  // UEFA is handled separately via a counter
};

interface FastTeam {
  idIndex: number; // Index in original TEAMS array
  id: string;
  pot: number;
  isUefa: boolean;
  confedMask: number; // Bitmask of non-UEFA confederations
  isHost: boolean;
  hostGroupIndex: number; // -1 if not host
}

// Pre-process teams into lightweight structures
const FAST_TEAMS: FastTeam[] = TEAMS.map((t, idx) => {
  let mask = 0;
  const confeds = t.potentialConfederations || [t.confederation];
  
  for (const c of confeds) {
    if (c !== 'UEFA' && CONFED_BITS[c]) {
      mask |= CONFED_BITS[c];
    }
  }

  let hostGroup = -1;
  if (t.id === 'MEX') hostGroup = 0; // A
  if (t.id === 'CAN') hostGroup = 1; // B
  if (t.id === 'USA') hostGroup = 3; // D

  return {
    idIndex: idx,
    id: t.id,
    pot: t.pot ?? 4, // Fallback to 4 if undefined (though data should be complete)
    isUefa: t.confederation === 'UEFA' || (t.potentialConfederations?.includes('UEFA') ?? false),
    confedMask: mask,
    isHost: !!t.isHost,
    hostGroupIndex: hostGroup
  };
});

// Group Arrays by Pot for easy access
const POT_1 = FAST_TEAMS.filter(t => t.pot === 1);
const POT_2 = FAST_TEAMS.filter(t => t.pot === 2);
const POT_3 = FAST_TEAMS.filter(t => t.pot === 3);
const POT_4 = FAST_TEAMS.filter(t => t.pot === 4);

// Special handling for Pot 1 Pairs
const ESP = POT_1.find(t => t.id === 'ESP');
const ARG = POT_1.find(t => t.id === 'ARG');
const FRA = POT_1.find(t => t.id === 'FRA');
const ENG = POT_1.find(t => t.id === 'ENG');

// Side indices
const LEFT_SIDE = [3, 4, 5, 6, 7, 8];  // D-I
const RIGHT_SIDE = [0, 1, 2, 9, 10, 11]; // A-C, J-L

// --- FAST ENGINE ---

export function runFastSimulation(iterations: number) {
  // Results Storage (Int Arrays for speed)
  // groupCounts[teamIdx][groupIdx]
  const groupCounts = new Int32Array(TEAMS.length * 12); 
  
  // opponentCounts[teamIdx][opponentIdx]
  // Flattened: index = teamIdx * 48 + opponentIdx
  const opponentCounts = new Int32Array(TEAMS.length * 48);

  // Simulation State (Reused to avoid GC)
  const groupUefaCounts = new Int8Array(12);
  const groupConfedMasks = new Int32Array(12);
  const groupTeamIndices = new Int32Array(12 * 4); // 12 groups * 4 slots flattened
  const groupSizes = new Int8Array(12); // Current fill level

  // Helpers
  const resetState = () => {
    groupUefaCounts.fill(0);
    groupConfedMasks.fill(0);
    groupTeamIndices.fill(-1);
    groupSizes.fill(0);
  };

  const addToGroup = (gIdx: number, team: FastTeam) => {
    const slot = gIdx * 4 + groupSizes[gIdx];
    groupTeamIndices[slot] = team.idIndex;
    groupSizes[gIdx]++;
    
    if (team.isUefa) groupUefaCounts[gIdx]++;
    groupConfedMasks[gIdx] |= team.confedMask;
  };

  // Shuffle helper using Fisher-Yates
  const shuffle = (arr: FastTeam[]) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
  };

  let successCount = 0;

  // --- MAIN LOOP ---
  
  // Batching isn't strictly needed for speed here (it's fast), 
  // but we might want to yield if iterations > 100k. 
  // For 10k, this will run in < 200ms.
  
  while (successCount < iterations) {
    resetState();

    // --- POT 1 (Custom Logic) ---
    // 1. Hosts
    // MEX->A(0), CAN->B(1), USA->D(3)
    // We hardcode finding them in POT_1 array to save time or use pre-computed vars?
    // We'll just iterate POT_1 since we need to shuffle the rest anyway.
    
    // Need a mutable copy of Pot 1 to shuffle
    const p1Shuffled = [...POT_1]; 
    
    // Pull out fixed teams
    const assignedIndices = new Set<number>();
    
    POT_1.forEach(t => {
      if (t.isHost) {
         addToGroup(t.hostGroupIndex, t);
         assignedIndices.add(t.hostGroupIndex);
         // Remove from shuffle list
         const idx = p1Shuffled.indexOf(t);
         if (idx > -1) p1Shuffled.splice(idx, 1);
      }
    });

    // 2. Pairs (ESP/ARG, FRA/ENG)
    // We need to assign them to random valid sides
    // Filter out from p1Shuffled as we place them
    const handlePair = (t1: FastTeam | undefined, t2: FastTeam | undefined) => {
      if (!t1 || !t2) return;
      
      // Remove from shuffle list
      const idx1 = p1Shuffled.indexOf(t1);
      if (idx1 > -1) p1Shuffled.splice(idx1, 1);

      const idx2 = p1Shuffled.indexOf(t2);
      if (idx2 > -1) p1Shuffled.splice(idx2, 1);

      // Decide sides
      const swap = Math.random() < 0.5;
      const side1 = swap ? RIGHT_SIDE : LEFT_SIDE;
      const side2 = swap ? LEFT_SIDE : RIGHT_SIDE;

      // Pick slots
      const valid1 = side1.filter(i => !assignedIndices.has(i));
      const pick1 = valid1[(Math.random() * valid1.length) | 0];
      addToGroup(pick1, t1);
      assignedIndices.add(pick1);

      const valid2 = side2.filter(i => !assignedIndices.has(i));
      const pick2 = valid2[(Math.random() * valid2.length) | 0];
      addToGroup(pick2, t2);
      assignedIndices.add(pick2);
    };

    handlePair(ESP, ARG);
    handlePair(FRA, ENG);

    // 3. Rest of Pot 1
    shuffle(p1Shuffled);
    const openSlots = [0,1,2,3,4,5,6,7,8,9,10,11].filter(i => !assignedIndices.has(i));
    // Simple fill
    for (let i = 0; i < p1Shuffled.length; i++) {
      addToGroup(openSlots[i], p1Shuffled[i]);
    }


    // --- GENERIC POT LOGIC (2, 3, 4) ---
    const processPot = (teams: FastTeam[]) => {
      const pShuffled = [...teams];
      shuffle(pShuffled);
      
      // Available groups indices
      const groups = [0,1,2,3,4,5,6,7,8,9,10,11];
      
      // Greedy placement
      for (const t of pShuffled) {
        // Find all valid groups
        const validGroups: number[] = [];
        for (const gIdx of groups) {
           // Check capacity (should always be ok if we do pot by pot, but standard constraints apply)
           if (groupSizes[gIdx] >= 4) continue; // Should not happen if logic is correct
           
           // Check constraints
           // UEFA < 2
           if (t.isUefa && groupUefaCounts[gIdx] >= 2) continue;
           // Other Confed < 1 (Bitmask check)
           if (!t.isUefa && (groupConfedMasks[gIdx] & t.confedMask) !== 0) continue;
           
           // Slot is empty? (implicit by groupSizes logic, we just append)
           validGroups.push(gIdx);
        }

        if (validGroups.length === 0) {
          return false; // DEADLOCK
        }

        // Pick random
        const picked = validGroups[(Math.random() * validGroups.length) | 0];
        addToGroup(picked, t);
        
        // Remove from available if full (not strictly necessary if we check capacity, but cleaner)
        // Actually we don't remove from 'groups' array because multiple teams go into different groups.
      }
      return true;
    };

    if (!processPot(POT_2)) continue; // Retry Draw
    if (!processPot(POT_3)) continue; // Retry Draw
    if (!processPot(POT_4)) continue; // Retry Draw

    // If we got here, draw is valid
    successCount++;

    // --- RECORD STATS ---
    for (let g = 0; g < 12; g++) {
       const teamIndices = [];
       for (let s = 0; s < 4; s++) {
         const tIdx = groupTeamIndices[g * 4 + s];
         if (tIdx !== -1) {
           teamIndices.push(tIdx);
           // Record Group Placement
           // Matrix: [TeamIdx * 12 + GroupIdx]
           groupCounts[tIdx * 12 + g]++;
         }
       }
       
       // Record Opponents
       for (let i = 0; i < teamIndices.length; i++) {
         const t1 = teamIndices[i];
         for (let j = i + 1; j < teamIndices.length; j++) {
           const t2 = teamIndices[j];
           // Symmetric? Yes, but maybe just store once or both
           // Let's store both for easier lookup
           opponentCounts[t1 * 48 + t2]++;
           opponentCounts[t2 * 48 + t1]++;
         }
       }
    }
  }

  // --- FORMAT OUTPUT ---
  const groupProbabilities: Record<string, Record<string, number>> = {};
  const statsOpponentCounts: Record<string, Record<string, number>> = {};

  TEAMS.forEach((t, idx) => {
    groupProbabilities[t.id] = {};
    statsOpponentCounts[t.id] = {};
    
    for (let g = 0; g < 12; g++) {
       groupProbabilities[t.id][GROUP_NAMES[g]] = groupCounts[idx * 12 + g];
    }
    
    TEAMS.forEach((opp, oppIdx) => {
       if (idx !== oppIdx) {
         statsOpponentCounts[t.id][opp.id] = opponentCounts[idx * 48 + oppIdx];
       }
    });
  });

  return {
    groupProbabilities,
    opponentCounts: statsOpponentCounts
  };
}

