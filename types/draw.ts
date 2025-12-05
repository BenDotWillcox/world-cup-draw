export type Confederation = 
  | 'UEFA' 
  | 'CONMEBOL' 
  | 'CONCACAF' 
  | 'CAF' 
  | 'AFC' 
  | 'OFC';

export interface Team {
  id: string;
  name: string;
  confederation: Confederation;
  rank: number;
  // For placeholders that could be from multiple confederations
  potentialConfederations?: Confederation[];
  isHost?: boolean;
  pot?: number;
  flagUrl?: string;
}

export interface Pot {
  number: 1 | 2 | 3 | 4;
  teams: Team[];
}

export interface Group {
  name: string; // A, B, C... L
  teams: (Team | null)[]; // Positions 1, 2, 3, 4 (0-indexed in array)
}

export const GROUP_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// Appendix B: Mapping of Pot number to Position in Group (1-based group index A=1...L=12)
// Rows: Pot 2, 3, 4. Cols: Group A-L. Values: Position 2, 3, 4.
// We will store this as a map or 2D array.
// Let's use a map where key is Pot Number, value is array of positions for Groups A-L.
export const APPENDIX_B_POSITIONS: Record<number, number[]> = {
  // Groups: A  B  C  D  E  F  G  H  I  J  K  L
  2:        [3, 4, 2, 3, 4, 2, 3, 4, 2, 3, 4, 2],
  3:        [2, 3, 4, 2, 3, 4, 2, 3, 4, 2, 3, 4],
  4:        [4, 2, 3, 4, 2, 3, 4, 2, 3, 4, 2, 3],
};

