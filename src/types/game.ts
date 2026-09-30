export type GameState = 'START' | 'PLAYING' | 'PAUSED' | 'LEVELCLEAR' | 'GAMEOVER';

export type Difficulty = 'CASUAL' | 'ARCADE' | 'HARDCORE';

export type BiomeTheme = 'CYBERPUNK' | 'SYNTHWAVE' | 'EMERALD_DUNGEON' | 'VOLCANO_FORGE' | 'NEO_ICE';

export type PowerUpType = 'SPEED' | 'FREEZE' | 'SHIELD' | 'MAGNET';

export type GhostType = 'HUNTER' | 'AMBUSHER' | 'PATROLLER' | 'WANDERER';

export interface PowerUp {
  id: string;
  type: PowerUpType;
  x: number;
  y: number;
  collected: boolean;
  durationMs: number;
}

export interface Coin {
  id: string;
  x: number;
  y: number;
  collected: boolean;
  value: number;
  isSuper: boolean;
}

export interface Player {
  x: number;
  y: number;
  radius: number;
  speed: number;
  baseSpeed: number;
  facing: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  moving: boolean;
  activeEffects: {
    speedBoostRemaining: number;
    freezeRemaining: number;
    hasShield: boolean;
    magnetRemaining: number;
  };
}

export interface Ghost {
  id: string;
  name: string;
  type: GhostType;
  x: number;
  y: number;
  radius: number;
  speed: number;
  baseSpeed: number;
  color: string;
  secondaryColor: string;
  targetTileX: number;
  targetTileY: number;
  isFrozen: boolean;
  freezeTimer: number;
  eyeOffset: { x: number; y: number };
  spawnX?: number;
  spawnY?: number;
  dirX?: number;
  dirY?: number;
}

export interface Portal {
  x: number;
  y: number;
  active: boolean;
  pulseRadius: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface FloatingNotification {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface MazeConfig {
  rows: number;
  cols: number;
  tileSize: number;
  grid: number[][]; // 1 = Wall, 0 = Open Path
  theme: BiomeTheme;
}

export interface RunStats {
  score: number;
  level: number;
  coinsCollectedTotal: number;
  totalTimeSeconds: number;
  ghostsEvaded: number;
  powerUpsUsed: number;
  difficulty: Difficulty;
  date: string;
}

export interface LevelClearStats {
  level: number;
  coinsCount: number;
  levelScore: number;
  timeTakenSec: number;
  speedBonus: number;
  livesBonus: number;
  totalScore: number;
}
