import { BiomeTheme, Coin, Difficulty, Ghost, GhostType, MazeConfig, Portal, PowerUp, PowerUpType } from '../types/game';

export interface GeneratedLevel {
  config: MazeConfig;
  coins: Coin[];
  powerUps: PowerUp[];
  ghosts: Ghost[];
  portal: Portal;
  playerStart: { x: number; y: number };
}

const THEMES: BiomeTheme[] = [
  'CYBERPUNK',
  'SYNTHWAVE',
  'EMERALD_DUNGEON',
  'VOLCANO_FORGE',
  'NEO_ICE',
];

export function generateLevel(level: number, difficulty: Difficulty): GeneratedLevel {
  // Grid size scales gently with level up to 19x19 or 21x21
  const cols = 17;
  const rows = 17;
  const tileSize = 28; // 17 * 28 = 476px

  // 1 = Wall, 0 = Passage
  const grid: number[][] = Array(rows)
    .fill(null)
    .map(() => Array(cols).fill(1));

  function inBounds(r: number, c: number) {
    return r > 0 && r < rows - 1 && c > 0 && c < cols - 1;
  }

  // Randomized Depth-First Search with backtracking
  const stack: { r: number; c: number }[] = [];
  const startR = 1;
  const startC = 1;
  grid[startR][startC] = 0;
  stack.push({ r: startR, c: startC });

  const directions = [
    { dr: -2, dc: 0 },
    { dr: 2, dc: 0 },
    { dr: 0, dc: -2 },
    { dr: 0, dc: 2 },
  ];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors: { r: number; c: number; wallR: number; wallC: number }[] = [];

    // Shuffle directions for organic maze paths
    const shuffled = [...directions].sort(() => Math.random() - 0.5);

    for (const d of shuffled) {
      const nr = current.r + d.dr;
      const nc = current.c + d.dc;
      if (inBounds(nr, nc) && grid[nr][nc] === 1) {
        neighbors.push({
          r: nr,
          c: nc,
          wallR: current.r + d.dr / 2,
          wallC: current.c + d.dc / 2,
        });
      }
    }

    if (neighbors.length > 0) {
      const next = neighbors[0];
      grid[next.wallR][next.wallC] = 0;
      grid[next.r][next.c] = 0;
      stack.push({ r: next.r, c: next.c });
    } else {
      stack.pop();
    }
  }

  // Guarantee exit path at bottom-right
  const exitR = rows - 2;
  const exitC = cols - 2;
  grid[exitR][exitC] = 0;
  grid[exitR][exitC - 1] = 0;
  grid[exitR - 1][exitC] = 0;

  // Braiding: Open roughly 15% of dead ends to provide strategic flanking arcade loops
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      if (grid[r][c] === 0) {
        // Count open orthogonal neighbors
        let openNeighbors = 0;
        if (grid[r - 1][c] === 0) openNeighbors++;
        if (grid[r + 1][c] === 0) openNeighbors++;
        if (grid[r][c - 1] === 0) openNeighbors++;
        if (grid[r][c + 1] === 0) openNeighbors++;

        // If dead end (only 1 open neighbor), 35% chance to break a wall to create loop
        if (openNeighbors === 1 && Math.random() < 0.35) {
          const candidates: { r: number; c: number }[] = [];
          if (inBounds(r - 1, c) && grid[r - 1][c] === 1) candidates.push({ r: r - 1, c });
          if (inBounds(r + 1, c) && grid[r + 1][c] === 1) candidates.push({ r: r + 1, c });
          if (inBounds(r, c - 1) && grid[r][c - 1] === 1) candidates.push({ r, c: c - 1 });
          if (inBounds(r, c + 1) && grid[r][c + 1] === 1) candidates.push({ r, c: c + 1 });

          if (candidates.length > 0) {
            const pick = candidates[Math.floor(Math.random() * candidates.length)];
            grid[pick.r][pick.c] = 0;
          }
        }
      }
    }
  }

  // Theme selection
  const themeIndex = (level - 1) % THEMES.length;
  const theme = THEMES[themeIndex];

  // Open passages list for entity placement
  const openTiles: { r: number; c: number }[] = [];
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      if (grid[r][c] === 0) {
        // Exclude start and exit tiles from general distribution
        if (!(r <= 2 && c <= 2) && !(r >= exitR - 1 && c >= exitC - 1)) {
          openTiles.push({ r, c });
        }
      }
    }
  }

  // Shuffle open tiles
  const shuffledOpenTiles = [...openTiles].sort(() => Math.random() - 0.5);

  // Coins generation (populate ~50-60% of open tiles)
  const coins: Coin[] = [];
  const coinProbability = 0.55;

  shuffledOpenTiles.forEach((tile, index) => {
    if (Math.random() < coinProbability) {
      const isSuper = Math.random() < 0.08; // 8% chance for big super gem
      coins.push({
        id: `coin-${tile.r}-${tile.c}-${index}`,
        x: tile.c * tileSize + tileSize / 2,
        y: tile.r * tileSize + tileSize / 2,
        collected: false,
        value: isSuper ? 50 : 10,
        isSuper,
      });
    }
  });

  // Ensure there are at least 15 coins so level feels full
  if (coins.length < 15) {
    shuffledOpenTiles.slice(0, 20).forEach((tile, idx) => {
      if (!coins.some((c) => Math.hypot(c.x - (tile.c * tileSize + tileSize / 2), c.y - (tile.r * tileSize + tileSize / 2)) < 5)) {
        coins.push({
          id: `coin-filler-${idx}`,
          x: tile.c * tileSize + tileSize / 2,
          y: tile.r * tileSize + tileSize / 2,
          collected: false,
          value: 10,
          isSuper: false,
        });
      }
    });
  }

  // Power-Ups (1 or 2 per level)
  const powerUps: PowerUp[] = [];
  const powerUpTypes: PowerUpType[] = ['SPEED', 'FREEZE', 'SHIELD', 'MAGNET'];
  const numPowerUps = level === 1 ? 1 : 2;

  // Pick tiles away from player start
  const powerUpCandidateTiles = shuffledOpenTiles.filter(
    (t) => Math.hypot(t.c - 1, t.r - 1) > 5 && !coins.some((c) => Math.hypot(c.x - (t.c * tileSize + tileSize / 2), c.y - (t.r * tileSize + tileSize / 2)) < 2)
  );

  for (let i = 0; i < Math.min(numPowerUps, powerUpCandidateTiles.length); i++) {
    const tile = powerUpCandidateTiles[i];
    const pType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    powerUps.push({
      id: `pw-${level}-${i}`,
      type: pType,
      x: tile.c * tileSize + tileSize / 2,
      y: tile.r * tileSize + tileSize / 2,
      collected: false,
      durationMs: pType === 'SHIELD' ? 0 : pType === 'FREEZE' ? 5000 : 7000,
    });
  }

  // Base ghost speed modulated by difficulty & level
  const diffMultiplier = difficulty === 'CASUAL' ? 0.75 : difficulty === 'ARCADE' ? 1.0 : 1.25;
  const baseGhostSpeed = (1.2 + Math.min(level * 0.15, 1.2)) * diffMultiplier;

  // Ghost spawning
  const ghosts: Ghost[] = [];
  const ghostRoster: { name: string; type: GhostType; color: string; secondaryColor: string }[] = [
    { name: 'Blinky', type: 'HUNTER', color: '#ff3366', secondaryColor: '#ff99aa' },
    { name: 'Speedy', type: 'PATROLLER', color: '#00e5ff', secondaryColor: '#99f3ff' },
    { name: 'Shadow', type: 'AMBUSHER', color: '#b026ff', secondaryColor: '#e099ff' },
    { name: 'Sparky', type: 'WANDERER', color: '#ffaa00', secondaryColor: '#ffe099' },
  ];

  // Number of ghosts: Level 1 -> 1, Level 2 -> 2, Level 3 -> 3, Level 4+ -> 4
  const numGhosts = Math.min(1 + Math.floor((level - 1) * 0.8), 4);

  // Far corners for ghost spawns
  const ghostSpawnPoints = [
    { r: exitR, c: exitC },
    { r: 1, c: cols - 2 },
    { r: rows - 2, c: 1 },
    { r: Math.floor(rows / 2), c: Math.floor(cols / 2) },
  ];

  for (let i = 0; i < numGhosts; i++) {
    const roster = ghostRoster[i % ghostRoster.length];
    // Find closest open tile to preferred spawn
    let spawnR = ghostSpawnPoints[i].r;
    let spawnC = ghostSpawnPoints[i].c;

    // Verify open tile
    if (grid[spawnR][spawnC] === 1) {
      const alt = shuffledOpenTiles.find((t) => Math.hypot(t.c - 1, t.r - 1) > 7);
      if (alt) {
        spawnR = alt.r;
        spawnC = alt.c;
      }
    }

    // Slightly different speeds per ghost type
    const speedVariation =
      roster.type === 'PATROLLER' ? 1.15 : roster.type === 'HUNTER' ? 1.0 : roster.type === 'AMBUSHER' ? 0.95 : 1.1;

    ghosts.push({
      id: `ghost-${i}-${roster.name}`,
      name: roster.name,
      type: roster.type,
      x: spawnC * tileSize + tileSize / 2,
      y: spawnR * tileSize + tileSize / 2,
      radius: 9,
      speed: baseGhostSpeed * speedVariation,
      baseSpeed: baseGhostSpeed * speedVariation,
      color: roster.color,
      secondaryColor: roster.secondaryColor,
      targetTileX: spawnC,
      targetTileY: spawnR,
      isFrozen: false,
      freezeTimer: 0,
      eyeOffset: { x: 0, y: 0 },
    });
  }

  return {
    config: {
      rows,
      cols,
      tileSize,
      grid,
      theme,
    },
    coins,
    powerUps,
    ghosts,
    portal: {
      x: exitC * tileSize + tileSize / 2,
      y: exitR * tileSize + tileSize / 2,
      active: false,
      pulseRadius: 14,
    },
    playerStart: {
      x: startC * tileSize + tileSize / 2,
      y: startR * tileSize + tileSize / 2,
    },
  };
}

// Biome palette colors for wall, floor, borders, and ambient glow
export function getThemePalette(theme: BiomeTheme) {
  switch (theme) {
    case 'SYNTHWAVE':
      return {
        wallFill: '#241432',
        wallStroke: '#7928ca',
        floorFill: '#0d0716',
        gridLine: '#1a0e28',
        ambientGlow: 'rgba(236, 72, 153, 0.15)',
        accentColor: '#f43f5e',
        name: 'Synthwave Neon',
      };
    case 'EMERALD_DUNGEON':
      return {
        wallFill: '#11291b',
        wallStroke: '#10b981',
        floorFill: '#06130b',
        gridLine: '#0d1f14',
        ambientGlow: 'rgba(16, 185, 129, 0.15)',
        accentColor: '#10b981',
        name: 'Emerald Cavern',
      };
    case 'VOLCANO_FORGE':
      return {
        wallFill: '#2b1411',
        wallStroke: '#f97316',
        floorFill: '#120705',
        gridLine: '#200b08',
        ambientGlow: 'rgba(249, 115, 22, 0.15)',
        accentColor: '#f97316',
        name: 'Volcano Core',
      };
    case 'NEO_ICE':
      return {
        wallFill: '#122338',
        wallStroke: '#38bdf8',
        floorFill: '#060d16',
        gridLine: '#0c1a2b',
        ambientGlow: 'rgba(56, 189, 248, 0.15)',
        accentColor: '#38bdf8',
        name: 'Glacial Matrix',
      };
    case 'CYBERPUNK':
    default:
      return {
        wallFill: '#1c1f2b',
        wallStroke: '#3b82f6',
        floorFill: '#0a0b10',
        gridLine: '#13151f',
        ambientGlow: 'rgba(59, 130, 246, 0.15)',
        accentColor: '#00ffcc',
        name: 'Cyberpunk Grid',
      };
  }
}
