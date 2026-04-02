// Elo ratings for 2026 World Cup teams
// Source: https://www.eloratings.net/ (update before use)
//
// Host teams (USA, MEX, CAN) get +100 applied at match simulation time,
// not stored here — these are neutral-venue ratings.

export const ELO_RATINGS: Record<string, number> = {
  // --- POT 1 ---
  MEX: 1858,
  CAN: 1784,
  USA: 1721,
  ESP: 2165,
  ARG: 2113,
  FRA: 2082,
  ENG: 2020,
  BRA: 1984,
  POR: 1984,
  NED: 1961,
  BEL: 1866,
  GER: 1923,

  // --- POT 2 ---
  CRO: 1930,
  MAR: 1821,
  COL: 1975,
  URU: 1892,
  SUI: 1889,
  JPN: 1904,
  SEN: 1879,
  IRN: 1760,
  KOR: 1752,
  ECU: 1933,
  AUT: 1827,
  AUS: 1783,

  // --- POT 3 ---
  NOR: 1912,
  PAN: 1737,
  EGY: 1689,
  ALG: 1743,
  SCO: 1767,
  PAR: 1833,
  TUN: 1636,
  CIV: 1676,
  UZB: 1727,
  QAT: 1425,
  KSA: 1568,
  RSA: 1524,

  // --- POT 4 ---
  JOR: 1690,
  CPV: 1549,
  GHA: 1505,
  CUW: 1436,
  HAI: 1532,
  NZL: 1585,

  // UEFA Playoff placeholders — use average of possible teams
  BOS: 1594, // Bosnia and Herzegovina
  SWE: 1719, // Sweden
  TUR: 1902, // Turkey
  CZE: 1726, // Czech Republic

  // FIFA Playoff placeholders — use average of possible teams
  COD: 1655, // DR Congo
  IRQ: 1607, // Iraq
};

// Host team IDs that receive +100 Elo when playing at home venues
export const HOST_TEAM_IDS = new Set(['USA', 'MEX', 'CAN']);
export const HOST_ELO_BONUS = 100;
