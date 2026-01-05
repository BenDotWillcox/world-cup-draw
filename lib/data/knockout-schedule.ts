import { Match } from './matches';


// Constraints for the 8 slots that take 3rd place teams
// Key: Match ID, Value: Allowed Groups for the 3rd place team in that match
export const THIRD_PLACE_SLOTS: Record<string, string[]> = {
  'M74': ['A', 'B', 'C', 'D', 'F'], // vs Winner E
  'M77': ['C', 'D', 'F', 'G', 'H'], // vs Winner I
  'M79': ['C', 'E', 'F', 'H', 'I'], // vs Winner A
  'M80': ['E', 'H', 'I', 'J', 'K'], // vs Winner L
  'M81': ['B', 'E', 'F', 'I', 'J'], // vs Winner D
  'M82': ['A', 'E', 'H', 'I', 'J'], // vs Winner G
  'M85': ['E', 'F', 'G', 'I', 'J'], // vs Winner B
  'M87': ['D', 'E', 'I', 'J', 'L'], // vs Winner K
};

export const KNOCKOUT_SCHEDULE: Match[] = [
  // Round of 32
  { id: 'M73', placeholderT1: '2A', placeholderT2: '2B', stadium: 'Los Angeles', date: '2026-06-28', time: '12:00', utcTime: '19:00', t1: '?', t2: '?' },
  { id: 'M76', placeholderT1: '1C', placeholderT2: '2F', stadium: 'Houston', date: '2026-06-29', time: '12:00', utcTime: '17:00', t1: '?', t2: '?' },
  { id: 'M74', placeholderT1: '1E', placeholderT2: '3_M74', stadium: 'Boston', date: '2026-06-29', time: '16:30', utcTime: '20:30', t1: '?', t2: '?' },
  { id: 'M75', placeholderT1: '1F', placeholderT2: '2C', stadium: 'Monterrey', date: '2026-06-29', time: '19:00', utcTime: '01:00', t1: '?', t2: '?' },
  { id: 'M78', placeholderT1: '2E', placeholderT2: '2I', stadium: 'Dallas', date: '2026-06-30', time: '12:00', utcTime: '17:00', t1: '?', t2: '?' },
  { id: 'M77', placeholderT1: '1I', placeholderT2: '3_M77', stadium: 'New York', date: '2026-06-30', time: '17:00', utcTime: '21:00', t1: '?', t2: '?' },
  { id: 'M79', placeholderT1: '1A', placeholderT2: '3_M79', stadium: 'Mexico City', date: '2026-06-30', time: '19:00', utcTime: '01:00', t1: '?', t2: '?' },
  { id: 'M80', placeholderT1: '1L', placeholderT2: '3_M80', stadium: 'Atlanta', date: '2026-07-01', time: '12:00', utcTime: '16:00', t1: '?', t2: '?' },
  { id: 'M82', placeholderT1: '1G', placeholderT2: '3_M82', stadium: 'Seattle', date: '2026-07-01', time: '13:00', utcTime: '20:00', t1: '?', t2: '?' },
  { id: 'M81', placeholderT1: '1D', placeholderT2: '3_M81', stadium: 'San Francisco', date: '2026-07-01', time: '17:00', utcTime: '00:00', t1: '?', t2: '?' },
  { id: 'M84', placeholderT1: '1H', placeholderT2: '2J', stadium: 'Los Angeles', date: '2026-07-02', time: '12:00', utcTime: '19:00', t1: '?', t2: '?' },
  { id: 'M83', placeholderT1: '2K', placeholderT2: '2L', stadium: 'Toronto', date: '2026-07-02', time: '19:00', utcTime: '23:00', t1: '?', t2: '?' },
  { id: 'M85', placeholderT1: '1B', placeholderT2: '3_M85', stadium: 'Vancouver', date: '2026-07-02', time: '20:00', utcTime: '03:00', t1: '?', t2: '?' },
  { id: 'M88', placeholderT1: '2D', placeholderT2: '2G', stadium: 'Dallas', date: '2026-07-03', time: '13:00', utcTime: '18:00', t1: '?', t2: '?' },
  { id: 'M86', placeholderT1: '1J', placeholderT2: '2H', stadium: 'Miami', date: '2026-07-03', time: '18:00', utcTime: '22:00', t1: '?', t2: '?' },
  { id: 'M87', placeholderT1: '1K', placeholderT2: '3_M87', stadium: 'Kansas City', date: '2026-07-03', time: '20:30', utcTime: '01:30', t1: '?', t2: '?' },

  // Round of 16
  { id: 'M90', placeholderT1: 'W73', placeholderT2: 'W75', stadium: 'Houston', date: '2026-07-04', time: '12:00', utcTime: '17:00', t1: '?', t2: '?' },
  { id: 'M89', placeholderT1: 'W74', placeholderT2: 'W77', stadium: 'Philadelphia', date: '2026-07-04', time: '17:00', utcTime: '21:00', t1: '?', t2: '?' },
  { id: 'M91', placeholderT1: 'W76', placeholderT2: 'W78', stadium: 'New York', date: '2026-07-05', time: '16:00', utcTime: '20:00', t1: '?', t2: '?' },
  { id: 'M92', placeholderT1: 'W79', placeholderT2: 'W80', stadium: 'Mexico City', date: '2026-07-05', time: '18:00', utcTime: '00:00', t1: '?', t2: '?' },
  { id: 'M93', placeholderT1: 'W83', placeholderT2: 'W84', stadium: 'Dallas', date: '2026-07-06', time: '14:00', utcTime: '19:00', t1: '?', t2: '?' },
  { id: 'M94', placeholderT1: 'W81', placeholderT2: 'W82', stadium: 'Seattle', date: '2026-07-06', time: '17:00', utcTime: '00:00', t1: '?', t2: '?' },
  { id: 'M95', placeholderT1: 'W86', placeholderT2: 'W88', stadium: 'Atlanta', date: '2026-07-07', time: '12:00', utcTime: '16:00', t1: '?', t2: '?' },
  { id: 'M96', placeholderT1: 'W85', placeholderT2: 'W87', stadium: 'Vancouver', date: '2026-07-07', time: '13:00', utcTime: '20:00', t1: '?', t2: '?' },

  // Quarterfinals
  { id: 'M97', placeholderT1: 'W89', placeholderT2: 'W90', stadium: 'Boston', date: '2026-07-09', time: '16:00', utcTime: '20:00', t1: '?', t2: '?' },
  { id: 'M98', placeholderT1: 'W93', placeholderT2: 'W94', stadium: 'Los Angeles', date: '2026-07-10', time: '12:00', utcTime: '19:00', t1: '?', t2: '?' },
  { id: 'M99', placeholderT1: 'W91', placeholderT2: 'W92', stadium: 'Miami', date: '2026-07-11', time: '17:00', utcTime: '21:00', t1: '?', t2: '?' },
  { id: 'M100', placeholderT1: 'W95', placeholderT2: 'W96', stadium: 'Kansas City', date: '2026-07-11', time: '20:00', utcTime: '01:00', t1: '?', t2: '?' },

  // Semifinals
  { id: 'M101', placeholderT1: 'W97', placeholderT2: 'W98', stadium: 'Dallas', date: '2026-07-14', time: '14:00', utcTime: '19:00', t1: '?', t2: '?' },
  { id: 'M102', placeholderT1: 'W99', placeholderT2: 'W100', stadium: 'Atlanta', date: '2026-07-15', time: '15:00', utcTime: '19:00', t1: '?', t2: '?' },

  // Third Place
  { id: 'M103', placeholderT1: 'L101', placeholderT2: 'L102', stadium: 'Miami', date: '2026-07-18', time: '17:00', utcTime: '21:00', t1: '?', t2: '?' },

  // Final
  { id: 'M104', placeholderT1: 'W101', placeholderT2: 'W102', stadium: 'New York', date: '2026-07-19', time: '15:00', utcTime: '19:00', t1: '?', t2: '?' },
];
