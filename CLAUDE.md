# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # ESLint check
npm run start    # Start production server

# Generate Monte Carlo statistics (1M iterations)
npx tsx scripts/generate-stats.ts
```

## Architecture

This is a Next.js 16 app (React 19) that simulates the FIFA World Cup 2026 draw with accurate constraint handling.

### Core Components

**Draw Engine** (`lib/engine/`)
- `draw-logic.ts` - Main constraint solver with backtracking algorithm. Handles:
  - Pot 1: Host placement (MEX→A, CAN→B, USA→D) plus side constraints (ESP/ARG and FRA/ENG must be on opposite bracket sides)
  - Pots 2-4: Confederation constraints (max 2 UEFA per group, max 1 of any other confederation) with `APPENDIX_B_POSITIONS` determining slot positions
  - `validateConstraintCounts()` - Lightweight validation using chained backtracking
  - `completeCurrentDraw()` - Fast-forwards partial draws to completion
- `fast-sim.ts` - Optimized simulation for Monte Carlo runs
- `monte-carlo.ts` - Statistical simulation wrapper

**State Management** (`components/draw/DrawContext.tsx`)
- React Context managing draw state, team placement, and constraint validation
- Supports manual placement with live constraint checking via `calculateValidGroups()`

**Data** (`lib/data/`)
- `teams.ts` - 48 teams with confederations, FIFA rankings, pot assignments. Includes placeholders for UEFA/FIFA playoffs with `potentialConfederations` for uncertain confederation membership
- `official-draw.ts` - The actual 2026 draw results
- `monte-carlo-results.json` - Pre-computed probability distributions

### Key Types (`types/draw.ts`)
- `Team`, `Group`, `Confederation`
- `APPENDIX_B_POSITIONS` - Maps pot number to group position (defines which slot in each group that pot fills)

### UI Components (`components/draw/`)
- `DrawVisualizer.tsx` - Interactive draw simulation with animations
- `MonteCarloStats.tsx` - Probability visualization from pre-computed data
- `TeamPathMap.tsx` - Geographic visualization of team paths

### Path Aliases
Uses `@/*` alias mapping to project root (e.g., `@/lib/engine/draw-logic`).
