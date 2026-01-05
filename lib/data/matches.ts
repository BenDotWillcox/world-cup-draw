export interface Match {
  id: string;
  t1: string;
  t2: string;
  stadium: string;
  date: string;
  time: string;
  utcTime: string;
  placeholderT1?: string;
  placeholderT2?: string;
}

export const MATCH_SCHEDULE: Match[] = [
  // Thursday, June 11
  { id: 'M1', t1: 'A1', t2: 'A2', stadium: 'Mexico City', date: '2026-06-11', time: '13:00', utcTime: '19:00' },
  { id: 'M2', t1: 'A3', t2: 'A4', stadium: 'Guadalajara', date: '2026-06-11', time: '20:00', utcTime: '02:00' },

  // Friday, June 12
  { id: 'M3', t1: 'B1', t2: 'B2', stadium: 'Toronto', date: '2026-06-12', time: '15:00', utcTime: '19:00' },
  { id: 'M4', t1: 'D1', t2: 'D2', stadium: 'Los Angeles', date: '2026-06-12', time: '21:00', utcTime: '04:00' },

  // Saturday, June 13
  { id: 'M5', t1: 'B3', t2: 'B4', stadium: 'San Francisco', date: '2026-06-13', time: '12:00', utcTime: '19:00' },
  { id: 'M6', t1: 'C1', t2: 'C2', stadium: 'New York', date: '2026-06-13', time: '18:00', utcTime: '22:00' },
  { id: 'M7', t1: 'C3', t2: 'C4', stadium: 'Boston', date: '2026-06-13', time: '21:00', utcTime: '01:00' },
  { id: 'M8', t1: 'D3', t2: 'D4', stadium: 'Vancouver', date: '2026-06-13', time: '21:00', utcTime: '04:00' },

  // Sunday, June 14
  { id: 'M9', t1: 'E1', t2: 'E2', stadium: 'Houston', date: '2026-06-14', time: '12:00', utcTime: '17:00' },
  { id: 'M10', t1: 'F1', t2: 'F2', stadium: 'Dallas', date: '2026-06-14', time: '15:00', utcTime: '20:00' },
  { id: 'M11', t1: 'E3', t2: 'E4', stadium: 'Philadelphia', date: '2026-06-14', time: '19:00', utcTime: '23:00' },
  { id: 'M12', t1: 'F3', t2: 'F4', stadium: 'Monterrey', date: '2026-06-14', time: '20:00', utcTime: '02:00' },

  // Monday, June 15
  { id: 'M13', t1: 'H1', t2: 'H2', stadium: 'Atlanta', date: '2026-06-15', time: '13:00', utcTime: '17:00' },
  { id: 'M14', t1: 'G1', t2: 'G2', stadium: 'Seattle', date: '2026-06-15', time: '15:00', utcTime: '22:00' },
  { id: 'M15', t1: 'H3', t2: 'H4', stadium: 'Miami', date: '2026-06-15', time: '18:00', utcTime: '22:00' },
  { id: 'M16', t1: 'G3', t2: 'G4', stadium: 'Los Angeles', date: '2026-06-15', time: '21:00', utcTime: '04:00' },

  // Tuesday, June 16
  { id: 'M17', t1: 'I1', t2: 'I2', stadium: 'New York', date: '2026-06-16', time: '15:00', utcTime: '19:00' },
  { id: 'M18', t1: 'I3', t2: 'I4', stadium: 'Boston', date: '2026-06-16', time: '18:00', utcTime: '22:00' },
  { id: 'M19', t1: 'J1', t2: 'J2', stadium: 'Kansas City', date: '2026-06-16', time: '21:00', utcTime: '02:00' },
  { id: 'M20', t1: 'J3', t2: 'J4', stadium: 'San Francisco', date: '2026-06-16', time: '21:00', utcTime: '04:00' },

  // Wednesday, June 17
  { id: 'M21', t1: 'K1', t2: 'K2', stadium: 'Houston', date: '2026-06-17', time: '12:00', utcTime: '17:00' },
  { id: 'M22', t1: 'L1', t2: 'L2', stadium: 'Dallas', date: '2026-06-17', time: '15:00', utcTime: '20:00' },
  { id: 'M23', t1: 'L3', t2: 'L4', stadium: 'Toronto', date: '2026-06-17', time: '19:00', utcTime: '23:00' },
  { id: 'M24', t1: 'K3', t2: 'K4', stadium: 'Mexico City', date: '2026-06-17', time: '22:00', utcTime: '04:00' },

  // Thursday, June 18
  { id: 'M25', t1: 'A4', t2: 'A2', stadium: 'Atlanta', date: '2026-06-18', time: '12:00', utcTime: '16:00' },
  { id: 'M26', t1: 'B4', t2: 'B2', stadium: 'Los Angeles', date: '2026-06-18', time: '12:00', utcTime: '19:00' },
  { id: 'M27', t1: 'B1', t2: 'B3', stadium: 'Vancouver', date: '2026-06-18', time: '18:00', utcTime: '01:00' },
  { id: 'M28', t1: 'A1', t2: 'A3', stadium: 'Guadalajara', date: '2026-06-18', time: '21:00', utcTime: '03:00' },

  // Friday, June 19
  { id: 'M29', t1: 'D1', t2: 'D3', stadium: 'Seattle', date: '2026-06-19', time: '12:00', utcTime: '19:00' },
  { id: 'M30', t1: 'C4', t2: 'C2', stadium: 'Boston', date: '2026-06-19', time: '15:00', utcTime: '22:00' },
  { id: 'M31', t1: 'C1', t2: 'C3', stadium: 'Philadelphia', date: '2026-06-19', time: '21:00', utcTime: '01:00' },
  { id: 'M32', t1: 'D4', t2: 'D2', stadium: 'San Francisco', date: '2026-06-19', time: '21:00', utcTime: '04:00' },

  // Saturday, June 20
  { id: 'M33', t1: 'F1', t2: 'F3', stadium: 'Houston', date: '2026-06-20', time: '12:00', utcTime: '17:00' },
  { id: 'M34', t1: 'E1', t2: 'E3', stadium: 'Toronto', date: '2026-06-20', time: '16:00', utcTime: '20:00' },
  { id: 'M35', t1: 'E4', t2: 'E2', stadium: 'Kansas City', date: '2026-06-20', time: '19:00', utcTime: '00:00' },
  { id: 'M36', t1: 'F4', t2: 'F2', stadium: 'Monterrey', date: '2026-06-20', time: '22:00', utcTime: '04:00' },

  // Sunday, June 21
  { id: 'M37', t1: 'H1', t2: 'H3', stadium: 'Atlanta', date: '2026-06-21', time: '12:00', utcTime: '16:00' },
  { id: 'M38', t1: 'G1', t2: 'G3', stadium: 'Los Angeles', date: '2026-06-21', time: '15:00', utcTime: '22:00' },
  { id: 'M39', t1: 'H4', t2: 'H2', stadium: 'Miami', date: '2026-06-21', time: '18:00', utcTime: '22:00' },
  { id: 'M40', t1: 'G4', t2: 'G2', stadium: 'Vancouver', date: '2026-06-21', time: '21:00', utcTime: '04:00' },

  // Monday, June 22
  { id: 'M41', t1: 'J1', t2: 'J3', stadium: 'Dallas', date: '2026-06-22', time: '12:00', utcTime: '17:00' },
  { id: 'M42', t1: 'I1', t2: 'I3', stadium: 'Philadelphia', date: '2026-06-22', time: '17:00', utcTime: '21:00' },
  { id: 'M43', t1: 'I4', t2: 'I2', stadium: 'New York', date: '2026-06-22', time: '20:00', utcTime: '00:00' },
  { id: 'M44', t1: 'J4', t2: 'J2', stadium: 'San Francisco', date: '2026-06-22', time: '20:00', utcTime: '03:00' },

  // Tuesday, June 23
  { id: 'M45', t1: 'K1', t2: 'K3', stadium: 'Houston', date: '2026-06-23', time: '12:00', utcTime: '17:00' },
  { id: 'M46', t1: 'L1', t2: 'L3', stadium: 'Boston', date: '2026-06-23', time: '16:00', utcTime: '20:00' },
  { id: 'M47', t1: 'L4', t2: 'L2', stadium: 'Toronto', date: '2026-06-23', time: '19:00', utcTime: '23:00' },
  { id: 'M48', t1: 'K4', t2: 'K2', stadium: 'Guadalajara', date: '2026-06-23', time: '20:00', utcTime: '02:00' },

  // Wednesday, June 24
  { id: 'M49', t1: 'B4', t2: 'B1', stadium: 'Vancouver', date: '2026-06-24', time: '12:00', utcTime: '19:00' },
  { id: 'M50', t1: 'B2', t2: 'B3', stadium: 'Seattle', date: '2026-06-24', time: '12:00', utcTime: '19:00' },
  { id: 'M51', t1: 'C4', t2: 'C1', stadium: 'Miami', date: '2026-06-24', time: '18:00', utcTime: '22:00' },
  { id: 'M52', t1: 'C2', t2: 'C3', stadium: 'Atlanta', date: '2026-06-24', time: '18:00', utcTime: '22:00' },
  { id: 'M53', t1: 'A4', t2: 'A1', stadium: 'Mexico City', date: '2026-06-24', time: '19:00', utcTime: '01:00' },
  { id: 'M54', t1: 'A2', t2: 'A3', stadium: 'Monterrey', date: '2026-06-24', time: '19:00', utcTime: '01:00' },

  // Thursday, June 25
  { id: 'M55', t1: 'E4', t2: 'E1', stadium: 'New York', date: '2026-06-25', time: '16:00', utcTime: '20:00' },
  { id: 'M56', t1: 'E2', t2: 'E3', stadium: 'Philadelphia', date: '2026-06-25', time: '16:00', utcTime: '20:00' },
  { id: 'M57', t1: 'F2', t2: 'F3', stadium: 'Dallas', date: '2026-06-25', time: '18:00', utcTime: '23:00' },
  { id: 'M58', t1: 'F4', t2: 'F1', stadium: 'Kansas City', date: '2026-06-25', time: '18:00', utcTime: '23:00' },
  { id: 'M59', t1: 'D4', t2: 'D1', stadium: 'Los Angeles', date: '2026-06-25', time: '19:00', utcTime: '02:00' },
  { id: 'M60', t1: 'D2', t2: 'D3', stadium: 'San Francisco', date: '2026-06-25', time: '19:00', utcTime: '02:00' },

  // Friday, June 26
  { id: 'M61', t1: 'I4', t2: 'I1', stadium: 'Boston', date: '2026-06-26', time: '15:00', utcTime: '19:00' },
  { id: 'M62', t1: 'I2', t2: 'I3', stadium: 'Toronto', date: '2026-06-26', time: '15:00', utcTime: '19:00' },
  { id: 'M63', t1: 'H2', t2: 'H3', stadium: 'Houston', date: '2026-06-26', time: '19:00', utcTime: '00:00' },
  { id: 'M64', t1: 'H4', t2: 'H1', stadium: 'Guadalajara', date: '2026-06-26', time: '18:00', utcTime: '00:00' },
  { id: 'M65', t1: 'G2', t2: 'G3', stadium: 'Seattle', date: '2026-06-26', time: '20:00', utcTime: '03:00' },
  { id: 'M66', t1: 'G4', t2: 'G1', stadium: 'Vancouver', date: '2026-06-26', time: '20:00', utcTime: '03:00' },

  // Saturday, June 27
  { id: 'M67', t1: 'L4', t2: 'L1', stadium: 'New York', date: '2026-06-27', time: '17:00', utcTime: '21:00' },
  { id: 'M68', t1: 'L2', t2: 'L3', stadium: 'Philadelphia', date: '2026-06-27', time: '17:00', utcTime: '21:00' },
  { id: 'M69', t1: 'K4', t2: 'K1', stadium: 'Miami', date: '2026-06-27', time: '19:30', utcTime: '23:30' },
  { id: 'M70', t1: 'K2', t2: 'K3', stadium: 'Atlanta', date: '2026-06-27', time: '19:30', utcTime: '23:30' },
  { id: 'M71', t1: 'J2', t2: 'J3', stadium: 'Kansas City', date: '2026-06-27', time: '21:00', utcTime: '02:00' },
  { id: 'M72', t1: 'J4', t2: 'J1', stadium: 'Dallas', date: '2026-06-27', time: '21:00', utcTime: '02:00' },

  // Sunday, June 28
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
