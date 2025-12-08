import { Group } from '@/types/draw';
import { TEAMS } from './teams';

const getTeam = (id: string) => {
  const team = TEAMS.find(t => t.id === id);
  if (!team) throw new Error(`Team ${id} not found`);
  return team;
};

export const OFFICIAL_GROUPS: Group[] = [
  {
    name: 'A',
    teams: [
      getTeam('MEX'),         // 1. Mexico
      getTeam('RSA'),         // 2. South Africa
      getTeam('KOR'),         // 3. Korea Republic
      getTeam('PO_UEFA_D')    // 4. UEFA Playoff D Winner
    ]
  },
  {
    name: 'B',
    teams: [
      getTeam('CAN'),         // 1. Canada
      getTeam('PO_UEFA_A'),   // 2. UEFA Playoff A Winner
      getTeam('QAT'),         // 3. Qatar
      getTeam('SUI')          // 4. Switzerland
    ]
  },
  {
    name: 'C',
    teams: [
      getTeam('BRA'),         // 1. Brazil
      getTeam('MAR'),         // 2. Morocco
      getTeam('HAI'),         // 3. Haiti
      getTeam('SCO')          // 4. Scotland
    ]
  },
  {
    name: 'D',
    teams: [
      getTeam('USA'),         // 1. USA
      getTeam('PAR'),         // 2. Paraguay
      getTeam('AUS'),         // 3. Australia
      getTeam('PO_UEFA_C')    // 4. UEFA Playoff C Winner
    ]
  },
  {
    name: 'E',
    teams: [
      getTeam('GER'),         // 1. Germany
      getTeam('CUW'),         // 2. Curaçao
      getTeam('CIV'),         // 3. Côte D'Ivoire
      getTeam('ECU')          // 4. Ecuador
    ]
  },
  {
    name: 'F',
    teams: [
      getTeam('NED'),         // 1. Netherlands
      getTeam('JPN'),         // 2. Japan
      getTeam('PO_UEFA_B'),   // 3. UEFA Playoff B Winner
      getTeam('TUN')          // 4. Tunisia
    ]
  },
  {
    name: 'G',
    teams: [
      getTeam('BEL'),         // 1. Belgium
      getTeam('EGY'),         // 2. Egypt
      getTeam('IRN'),         // 3. Iran
      getTeam('NZL')          // 4. New Zealand
    ]
  },
  {
    name: 'H',
    teams: [
      getTeam('ESP'),         // 1. Spain
      getTeam('CPV'),         // 2. Cabo Verde
      getTeam('KSA'),         // 3. Saudi Arabia
      getTeam('URU')          // 4. Uruguay
    ]
  },
  {
    name: 'I',
    teams: [
      getTeam('FRA'),         // 1. France
      getTeam('SEN'),         // 2. Senegal
      getTeam('PO_FIFA_2'),   // 3. FIFA 2 Winner
      getTeam('NOR')          // 4. Norway
    ]
  },
  {
    name: 'J',
    teams: [
      getTeam('ARG'),         // 1. Argentina
      getTeam('ALG'),         // 2. Algeria
      getTeam('AUT'),         // 3. Austria
      getTeam('JOR')          // 4. Jordan
    ]
  },
  {
    name: 'K',
    teams: [
      getTeam('POR'),         // 1. Portugal
      getTeam('PO_FIFA_1'),   // 2. FIFA 1 Winner
      getTeam('UZB'),         // 3. Uzbekistan
      getTeam('COL')          // 4. Colombia
    ]
  },
  {
    name: 'L',
    teams: [
      getTeam('ENG'),         // 1. England
      getTeam('CRO'),         // 2. Croatia
      getTeam('GHA'),         // 3. Ghana
      getTeam('PAN')          // 4. Panama
    ]
  }
];
