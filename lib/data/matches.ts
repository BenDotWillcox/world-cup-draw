
export interface Match {
  id: string;
  t1: string;
  t2: string;
  stadium: string;
}

export const MATCH_SCHEDULE: Match[] = [
  { id: 'M1', t1: 'A1', t2: 'A2', stadium: 'Mexico City' },
  { id: 'M2', t1: 'A3', t2: 'A4', stadium: 'Guadalajara' },
  { id: 'M3', t1: 'B1', t2: 'B2', stadium: 'Toronto' },
  { id: 'M4', t1: 'D1', t2: 'D2', stadium: 'Los Angeles' },
  { id: 'M5', t1: 'C3', t2: 'C4', stadium: 'Boston' },
  { id: 'M6', t1: 'D3', t2: 'D4', stadium: 'Vancouver' },
  { id: 'M7', t1: 'C1', t2: 'C2', stadium: 'New York' },
  { id: 'M8', t1: 'B3', t2: 'B4', stadium: 'San Francisco' },
  { id: 'M9', t1: 'E3', t2: 'E4', stadium: 'Philadelphia' },
  { id: 'M10', t1: 'E1', t2: 'E2', stadium: 'Houston' },
  { id: 'M11', t1: 'F1', t2: 'F2', stadium: 'Dallas' },
  { id: 'M12', t1: 'F3', t2: 'F4', stadium: 'Monterrey' },
  { id: 'M13', t1: 'H3', t2: 'H4', stadium: 'Miami' },
  { id: 'M14', t1: 'H1', t2: 'H2', stadium: 'Atlanta' },
  { id: 'M15', t1: 'G3', t2: 'G4', stadium: 'Los Angeles' },
  { id: 'M16', t1: 'G1', t2: 'G2', stadium: 'Seattle' },
  { id: 'M17', t1: 'I1', t2: 'I2', stadium: 'New York' },
  { id: 'M18', t1: 'I3', t2: 'I4', stadium: 'Boston' },
  { id: 'M19', t1: 'J1', t2: 'J2', stadium: 'Kansas City' },
  { id: 'M20', t1: 'J3', t2: 'J4', stadium: 'San Francisco' },
  { id: 'M21', t1: 'L3', t2: 'L4', stadium: 'Toronto' },
  { id: 'M22', t1: 'L1', t2: 'L2', stadium: 'Dallas' },
  { id: 'M23', t1: 'K1', t2: 'K2', stadium: 'Houston' },
  { id: 'M24', t1: 'K3', t2: 'K4', stadium: 'Mexico City' },
  { id: 'M25', t1: 'A2', t2: 'A4', stadium: 'Atlanta' },
  { id: 'M26', t1: 'B2', t2: 'B4', stadium: 'Los Angeles' },
  { id: 'M27', t1: 'B1', t2: 'B3', stadium: 'Vancouver' },
  { id: 'M28', t1: 'A1', t2: 'A3', stadium: 'Guadalajara' },
  { id: 'M29', t1: 'C1', t2: 'C3', stadium: 'Philadelphia' },
  { id: 'M30', t1: 'C2', t2: 'C4', stadium: 'Boston' },
  { id: 'M31', t1: 'D2', t2: 'D4', stadium: 'San Francisco' },
  { id: 'M32', t1: 'D1', t2: 'D3', stadium: 'Seattle' },
  { id: 'M33', t1: 'E1', t2: 'E3', stadium: 'Toronto' },
  { id: 'M34', t1: 'E2', t2: 'E4', stadium: 'Kansas City' },
  { id: 'M35', t1: 'F1', t2: 'F3', stadium: 'Houston' },
  { id: 'M36', t1: 'F2', t2: 'F4', stadium: 'Monterrey' },
  { id: 'M37', t1: 'H2', t2: 'H4', stadium: 'Miami' },
  { id: 'M38', t1: 'H1', t2: 'H3', stadium: 'Atlanta' },
  { id: 'M39', t1: 'G2', t2: 'G4', stadium: 'Los Angeles' },
  { id: 'M40', t1: 'G1', t2: 'G3', stadium: 'Vancouver' },
  { id: 'M41', t1: 'I2', t2: 'I4', stadium: 'New York' },
  { id: 'M42', t1: 'I1', t2: 'I3', stadium: 'Philadelphia' },
  { id: 'M43', t1: 'J2', t2: 'J4', stadium: 'Dallas' },
  { id: 'M44', t1: 'J1', t2: 'J3', stadium: 'San Francisco' },
  { id: 'M45', t1: 'L2', t2: 'L4', stadium: 'Boston' },
  { id: 'M46', t1: 'L1', t2: 'L3', stadium: 'Toronto' },
  { id: 'M47', t1: 'K2', t2: 'K4', stadium: 'Houston' }, // Corrected from K3 to K4
  { id: 'M48', t1: 'K1', t2: 'K3', stadium: 'Guadalajara' },
  { id: 'M49', t1: 'C1', t2: 'C4', stadium: 'Miami' },
  { id: 'M50', t1: 'C2', t2: 'C3', stadium: 'Atlanta' },
  { id: 'M51', t1: 'B1', t2: 'B4', stadium: 'Vancouver' },
  { id: 'M52', t1: 'B2', t2: 'B3', stadium: 'Seattle' },
  { id: 'M53', t1: 'A1', t2: 'A4', stadium: 'Mexico City' },
  { id: 'M54', t1: 'A2', t2: 'A3', stadium: 'Monterrey' },
  { id: 'M55', t1: 'E1', t2: 'E4', stadium: 'Philadelphia' },
  { id: 'M56', t1: 'E2', t2: 'E3', stadium: 'New York' },
  { id: 'M57', t1: 'F1', t2: 'F4', stadium: 'Dallas' },
  { id: 'M58', t1: 'F2', t2: 'F3', stadium: 'Kansas City' },
  { id: 'M59', t1: 'D1', t2: 'D4', stadium: 'Los Angeles' },
  { id: 'M60', t1: 'D2', t2: 'D3', stadium: 'San Francisco' },
  { id: 'M61', t1: 'I1', t2: 'I4', stadium: 'Boston' },
  { id: 'M62', t1: 'I2', t2: 'I3', stadium: 'Toronto' },
  { id: 'M63', t1: 'G1', t2: 'G4', stadium: 'Seattle' },
  { id: 'M64', t1: 'G2', t2: 'G3', stadium: 'Vancouver' },
  { id: 'M65', t1: 'H1', t2: 'H4', stadium: 'Houston' },
  { id: 'M66', t1: 'H2', t2: 'H3', stadium: 'Guadalajara' },
  { id: 'M67', t1: 'L1', t2: 'L4', stadium: 'New York' },
  { id: 'M68', t1: 'L2', t2: 'L3', stadium: 'Philadelphia' },
  { id: 'M69', t1: 'J1', t2: 'J4', stadium: 'Kansas City' },
  { id: 'M70', t1: 'J2', t2: 'J3', stadium: 'Dallas' },
  { id: 'M71', t1: 'K1', t2: 'K4', stadium: 'Miami' },
  { id: 'M72', t1: 'K2', t2: 'K3', stadium: 'Atlanta' },
];

// Cache for stadium lookups
const STADIUMS_BY_POS: Record<string, string[]> = {};

export const getStadiumsForPosition = (positionCode: string): string[] => {
  if (STADIUMS_BY_POS[positionCode]) return STADIUMS_BY_POS[positionCode];
  
  const stadiums = new Set<string>();
  for (const m of MATCH_SCHEDULE) {
    if (m.t1 === positionCode || m.t2 === positionCode) {
      stadiums.add(m.stadium);
    }
  }
  const result = Array.from(stadiums);
  STADIUMS_BY_POS[positionCode] = result;
  return result;
};

