import { Team, Pot } from '@/types/draw';

// This data mimics the structure described in the prompt.
// Rankings are hypothetical or based on the prompt's 2025 ranking logic snapshot.
// Hosts: USA, Mexico, Canada in Pot 1.

export const TEAMS: Team[] = [
  // --- POT 1 ---
  // Hosts
  { id: 'MEX', name: 'Mexico', confederation: 'CONCACAF', rank: 0, isHost: true, pot: 1, flagUrl: '/images/flags/mexico.png' }, // A1
  { id: 'CAN', name: 'Canada', confederation: 'CONCACAF', rank: 0, isHost: true, pot: 1, flagUrl: '/images/flags/canada.png' }, // B1
  { id: 'USA', name: 'USA', confederation: 'CONCACAF', rank: 0, isHost: true, pot: 1, flagUrl: '/images/flags/usa.png' },    // D1
  
  // Top 9 Ranked
  { id: 'ESP', name: 'Spain', confederation: 'UEFA', rank: 1, pot: 1, flagUrl: '/images/flags/spain.png' },
  { id: 'ARG', name: 'Argentina', confederation: 'CONMEBOL', rank: 2, pot: 1, flagUrl: '/images/flags/argentina.png' },
  { id: 'FRA', name: 'France', confederation: 'UEFA', rank: 3, pot: 1, flagUrl: '/images/flags/france.png' },
  { id: 'ENG', name: 'England', confederation: 'UEFA', rank: 4, pot: 1, flagUrl: '/images/flags/england.png' },
  { id: 'BRA', name: 'Brazil', confederation: 'CONMEBOL', rank: 5, pot: 1, flagUrl: '/images/flags/brazil.png' },
  { id: 'POR', name: 'Portugal', confederation: 'UEFA', rank: 6, pot: 1, flagUrl: '/images/flags/portugal.png' },
  { id: 'NED', name: 'Netherlands', confederation: 'UEFA', rank: 7, pot: 1, flagUrl: '/images/flags/netherlands.png' },
  { id: 'BEL', name: 'Belgium', confederation: 'UEFA', rank: 8, pot: 1, flagUrl: '/images/flags/belgium.png' },
  { id: 'GER', name: 'Germany', confederation: 'UEFA', rank: 9, pot: 1, flagUrl: '/images/flags/germany.png' },

  // --- POT 2 ---
  { id: 'CRO', name: 'Croatia', confederation: 'UEFA', rank: 10, pot: 2, flagUrl: '/images/flags/croatia.png' },
  { id: 'MAR', name: 'Morocco', confederation: 'CAF', rank: 11, pot: 2, flagUrl: '/images/flags/morocco.png' },
  { id: 'COL', name: 'Colombia', confederation: 'CONMEBOL', rank: 12, pot: 2, flagUrl: '/images/flags/colombia.png' },
  { id: 'URU', name: 'Uruguay', confederation: 'CONMEBOL', rank: 13, pot: 2, flagUrl: '/images/flags/uruguay.png' },
  { id: 'SUI', name: 'Switzerland', confederation: 'UEFA', rank: 14, pot: 2, flagUrl: '/images/flags/switzerland.png' },
  { id: 'JPN', name: 'Japan', confederation: 'AFC', rank: 15, pot: 2, flagUrl: '/images/flags/japan.png' },
  { id: 'SEN', name: 'Senegal', confederation: 'CAF', rank: 16, pot: 2, flagUrl: '/images/flags/senegal.png' },
  { id: 'IRN', name: 'IR Iran', confederation: 'AFC', rank: 17, pot: 2, flagUrl: '/images/flags/iran.png' },
  { id: 'KOR', name: 'South Korea', confederation: 'AFC', rank: 18, pot: 2, flagUrl: '/images/flags/south-korea.png' },
  { id: 'ECU', name: 'Ecuador', confederation: 'CONMEBOL', rank: 19, pot: 2, flagUrl: '/images/flags/ecuador.png' },
  { id: 'AUT', name: 'Austria', confederation: 'UEFA', rank: 20, pot: 2, flagUrl: '/images/flags/austria.png' },
  { id: 'AUS', name: 'Australia', confederation: 'AFC', rank: 21, pot: 2, flagUrl: '/images/flags/australia.png' },

  // --- POT 3 ---
  { id: 'NOR', name: 'Norway', confederation: 'UEFA', rank: 22, pot: 3, flagUrl: '/images/flags/norway.png' },
  { id: 'PAN', name: 'Panama', confederation: 'CONCACAF', rank: 23, pot: 3, flagUrl: '/images/flags/panama.png' },
  { id: 'EGY', name: 'Egypt', confederation: 'CAF', rank: 24, pot: 3, flagUrl: '/images/flags/egypt.png' },
  { id: 'ALG', name: 'Algeria', confederation: 'CAF', rank: 25, pot: 3, flagUrl: '/images/flags/algeria.png' },
  { id: 'SCO', name: 'Scotland', confederation: 'UEFA', rank: 26, pot: 3, flagUrl: '/images/flags/scotland.png' },
  { id: 'PAR', name: 'Paraguay', confederation: 'CONMEBOL', rank: 27, pot: 3, flagUrl: '/images/flags/paraguay.png' },
  { id: 'TUN', name: 'Tunisia', confederation: 'CAF', rank: 28, pot: 3, flagUrl: '/images/flags/tunisia.png' },
  { id: 'CIV', name: 'Côte d\'Ivoire', confederation: 'CAF', rank: 29, pot: 3, flagUrl: '/images/flags/ivory-coast.png' },
  { id: 'UZB', name: 'Uzbekistan', confederation: 'AFC', rank: 30, pot: 3, flagUrl: '/images/flags/uzbekistan.png' },
  { id: 'QAT', name: 'Qatar', confederation: 'AFC', rank: 31, pot: 3, flagUrl: '/images/flags/qatar.png' },
  { id: 'KSA', name: 'Saudi Arabia', confederation: 'AFC', rank: 32, pot: 3, flagUrl: '/images/flags/saudi-arabia.png' },
  { id: 'RSA', name: 'South Africa', confederation: 'CAF', rank: 33, pot: 3, flagUrl: '/images/flags/south-africa.png' },

  // --- POT 4 ---
  { id: 'JOR', name: 'Jordan', confederation: 'AFC', rank: 34, pot: 4, flagUrl: '/images/flags/jordan.png' },
  { id: 'CPV', name: 'Cabo Verde', confederation: 'CAF', rank: 35, pot: 4, flagUrl: '/images/flags/cabo-verde.png' },
  { id: 'GHA', name: 'Ghana', confederation: 'CAF', rank: 36, pot: 4, flagUrl: '/images/flags/ghana.png' },
  { id: 'CUW', name: 'Curaçao', confederation: 'CONCACAF', rank: 37, pot: 4, flagUrl: '/images/flags/curacao.png' },
  { id: 'HAI', name: 'Haiti', confederation: 'CONCACAF', rank: 38, pot: 4, flagUrl: '/images/flags/haiti.png' },
  { id: 'NZL', name: 'New Zealand', confederation: 'OFC', rank: 39, pot: 4, flagUrl: '/images/flags/new-zealand.png' },
  
  // Placeholders - European Play-offs
  { id: 'PO_UEFA_A', name: 'ITA-NIR-WAL-BIH', confederation: 'UEFA', rank: 40, pot: 4 },
  { id: 'PO_UEFA_B', name: 'UKR-SWE-POL-ALB', confederation: 'UEFA', rank: 41, pot: 4 },
  { id: 'PO_UEFA_C', name: 'TUR-ROU-SVK-KOS', confederation: 'UEFA', rank: 42, pot: 4 },
  { id: 'PO_UEFA_D', name: 'DEN-MKD-CZE-IRL', confederation: 'UEFA', rank: 43, pot: 4 },

  // Placeholders - FIFA Play-offs
  { 
    id: 'PO_FIFA_1', 
    name: 'COD-NCL-JAM', 
    confederation: 'FIFA' as any, 
    potentialConfederations: ['OFC', 'CONCACAF', 'CAF'], 
    rank: 44,
    pot: 4
  },
  { 
    id: 'PO_FIFA_2', 
    name: 'IRQ-BOL-SUR', 
    confederation: 'FIFA' as any, 
    potentialConfederations: ['CONMEBOL', 'CONCACAF', 'AFC'],
    rank: 45,
    pot: 4
  },
];

export const INITIAL_POTS: Pot[] = [
  { number: 1, teams: TEAMS.slice(0, 12) },
  { number: 2, teams: TEAMS.slice(12, 24) },
  { number: 3, teams: TEAMS.slice(24, 36) },
  { number: 4, teams: TEAMS.slice(36, 48) },
];
