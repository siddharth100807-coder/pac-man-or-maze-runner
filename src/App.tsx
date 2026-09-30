import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BiomeTheme,
  Coin,
  Difficulty,
  GameState,
  Ghost,
  LevelClearStats,
  MazeConfig,
  Player,
  Portal,
  PowerUp,
  RunStats,
} from './types/game';
import { generateLevel } from './utils/mazeGenerator';
import { sound } from './audio/soundEngine';
import { ScoreBoard } from './components/ScoreBoard';
import { ArcadeScreen } from './components/ArcadeScreen';
import { Overlays } from './components/Overlays';
import { VirtualControls } from './components/VirtualControls';
import { HelpModal } from './components/HelpModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { Gamepad2, Trophy, HelpCircle, Volume2, VolumeX, Tv } from 'lucide-react';

const HIGH_SCORE_KEY = 'retro_maze_runner_high_score';
const RECORDS_KEY = 'retro_maze_runner_records';
const SETTINGS_KEY = 'retro_maze_runner_settings';

export default function App() {
  // Game states
  const [gameState, setGameState] = useState<GameState>('START');
  const [difficulty, setDifficulty] = useState<Difficulty>('ARCADE');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [lives, setLives] = useState<number>(3);
  const maxLives = 3;

  // Level Entities & Config
  const [levelData, setLevelData] = useState(() => generateLevel(1, 'ARCADE'));
  const [player, setPlayer] = useState<Player>({
    x: 42,
    y: 42,
    radius: 9,
    speed: 2.6,
    baseSpeed: 2.6,
    facing: 'RIGHT',
    moving: false,
    activeEffects: {
      speedBoostRemaining: 0,
      freezeRemaining: 0,
      hasShield: false,
      magnetRemaining: 0,
    },
  });
  const [ghosts, setGhosts] = useState<Ghost[]>(levelData.ghosts);
  const [coins, setCoins] = useState<Coin[]>(levelData.coins);
  const [powerUps, setPowerUps] = useState<PowerUp[]>(levelData.powerUps);
  const [portal, setPortal] = useState<Portal>(levelData.portal);

  // Settings & UI state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [crtEffect, setCrtEffect] = useState<boolean>(true);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [records, setRecords] = useState<RunStats[]>([]);
  const [levelStats, setLevelStats] = useState<LevelClearStats | null>(null);

  // Movement & timing
  const [inputDirection, setInputDirection] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const activeKeysRef = useRef<{ [key: string]: boolean }>({});
  const levelStartTimeRef = useRef<number>(Date.now());
  const initialCoinsCountRef = useRef<number>(levelData.coins.length);

  // Touch device detection
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Load saved high scores & settings on startup
  useEffect(() => {
    try {
      const savedHighScore = localStorage.getItem(HIGH_SCORE_KEY);
      if (savedHighScore) setHighScore(parseInt(savedHighScore, 10));

      const savedRecords = localStorage.getItem(RECORDS_KEY);
      if (savedRecords) setRecords(JSON.parse(savedRecords));

      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.soundEnabled !== undefined) {
          setSoundEnabled(parsed.soundEnabled);
          sound.setMuted(!parsed.soundEnabled);
        }
        if (parsed.crtEffect !== undefined) setCrtEffect(parsed.crtEffect);
      }
    } catch {
      // LocalStorage access errors ignored gracefully
    }
  }, []);

  // Save records helper
  const saveRecord = useCallback(
    (finalScore: number, finalLevel: number) => {
      if (finalScore <= 0) return;
      const newRecord: RunStats = {
        score: finalScore,
        level: finalLevel,
        coinsCollectedTotal: 0,
        totalTimeSeconds: Math.floor((Date.now() - levelStartTimeRef.current) / 1000),
        ghostsEvaded: 0,
        powerUpsUsed: 0,
        difficulty,
        date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      };

      const updated = [newRecord, ...records]
        .sort((a, b) => b.score - a.score)
        .slice(0, 15);

      setRecords(updated);
      try {
        localStorage.setItem(RECORDS_KEY, JSON.stringify(updated));
      } catch {}

      if (finalScore > highScore) {
        setHighScore(finalScore);
        try {
          localStorage.setItem(HIGH_SCORE_KEY, finalScore.toString());
        } catch {}
      }
    },
    [difficulty, highScore, records]
  );

  // Update sound engine muted state
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.setMuted(!next);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ soundEnabled: next, crtEffect }));
    } catch {}
  };

  // Toggle CRT scanline effect
  const handleToggleCRT = () => {
    const next = !crtEffect;
    setCrtEffect(next);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ soundEnabled, crtEffect: next }));
    } catch {}
  };

  // Start new run from scratch
  const handleStartGame = () => {
    sound.enableAudioOnGesture();
    const newLvl = generateLevel(1, difficulty);
    setLevelData(newLvl);
    setScore(0);
    setLevel(1);
    setLives(3);
    setGhosts(newLvl.ghosts);
    setCoins(newLvl.coins);
    setPowerUps(newLvl.powerUps);
    setPortal(newLvl.portal);
    setPlayer({
      x: newLvl.playerStart.x,
      y: newLvl.playerStart.y,
      radius: 9,
      speed: 2.6,
      baseSpeed: 2.6,
      facing: 'RIGHT',
      moving: false,
      activeEffects: {
        speedBoostRemaining: 0,
        freezeRemaining: 0,
        hasShield: false,
        magnetRemaining: 0,
      },
    });
    initialCoinsCountRef.current = newLvl.coins.length;
    levelStartTimeRef.current = Date.now();
    setLevelStats(null);
    setGameState('PLAYING');
  };

  // Advance to next level
  const handleNextLevel = () => {
    sound.enableAudioOnGesture();
    const nextLvlNum = level + 1;
    const newLvl = generateLevel(nextLvlNum, difficulty);
    setLevelData(newLvl);
    setLevel(nextLvlNum);
    setGhosts(newLvl.ghosts);
    setCoins(newLvl.coins);
    setPowerUps(newLvl.powerUps);
    setPortal(newLvl.portal);
    setPlayer({
      x: newLvl.playerStart.x,
      y: newLvl.playerStart.y,
      radius: 9,
      speed: 2.6,
      baseSpeed: 2.6,
      facing: 'RIGHT',
      moving: false,
      activeEffects: {
        speedBoostRemaining: 0,
        freezeRemaining: 0,
        hasShield: false,
        magnetRemaining: 0,
      },
    });
    initialCoinsCountRef.current = newLvl.coins.length;
    levelStartTimeRef.current = Date.now();
    setLevelStats(null);
    setGameState('PLAYING');
  };

  // Restart current run
  const handleRestartGame = () => {
    handleStartGame();
  };

  // Toggle pause
  const handleTogglePause = () => {
    if (gameState === 'PLAYING') {
      sound.playButtonBeep();
      setGameState('PAUSED');
    } else if (gameState === 'PAUSED') {
      sound.playButtonBeep();
      setGameState('PLAYING');
    }
  };

  // Coin collected
  const handleCoinCollected = (coin: Coin) => {
    if (coin.isSuper) {
      sound.playSuperCoinSound();
    } else {
      sound.playCoinSound();
    }
    setScore((prev) => {
      const next = prev + coin.value;
      if (next > highScore) setHighScore(next);
      return next;
    });
  };

  // Power-up picked up
  const handlePowerUpCollected = (pw: PowerUp) => {
    setPlayer((prev) => {
      const effects = { ...prev.activeEffects };
      if (pw.type === 'SPEED') effects.speedBoostRemaining = 6000;
      if (pw.type === 'FREEZE') {
        effects.freezeRemaining = 5000;
        sound.playFreezeSound();
      }
      if (pw.type === 'SHIELD') effects.hasShield = true;
      if (pw.type === 'MAGNET') effects.magnetRemaining = 7000;
      return { ...prev, activeEffects: effects };
    });
    setScore((prev) => prev + 50);
  };

  // All coins cleared
  const handleCoinsDepleted = () => {
    setPortal((prev) => ({ ...prev, active: true }));
  };

  // Portal reached (Level Victory)
  const handlePortalReached = () => {
    const timeTakenSec = Math.max(1, (Date.now() - levelStartTimeRef.current) / 1000);
    const speedBonus = Math.max(0, Math.floor((50 - timeTakenSec) * 15));
    const livesBonus = lives * 75;
    const finalLevelScore = score + speedBonus + livesBonus;

    setLevelStats({
      level,
      coinsCount: initialCoinsCountRef.current,
      levelScore: score,
      timeTakenSec,
      speedBonus,
      livesBonus,
      totalScore: finalLevelScore,
    });

    setScore(finalLevelScore);
    if (finalLevelScore > highScore) {
      setHighScore(finalLevelScore);
    }
    setGameState('LEVELCLEAR');
  };

  // Player hit by ghost
  const handlePlayerHit = () => {
    const remainingLives = lives - 1;
    setLives(remainingLives);

    if (remainingLives <= 0) {
      sound.playGameOverSound();
      saveRecord(score, level);
      setGameState('GAMEOVER');
    } else {
      // Safely respawn player at starting point
      setPlayer((prev) => ({
        ...prev,
        x: levelData.playerStart.x,
        y: levelData.playerStart.y,
        activeEffects: {
          ...prev.activeEffects,
          speedBoostRemaining: 0,
          hasShield: false,
        },
      }));
    }
  };

  // Keyboard navigation listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser scroll on arrow keys and space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      // Pause toggle
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (gameState === 'PLAYING') setGameState('PAUSED');
        else if (gameState === 'PAUSED') setGameState('PLAYING');
        return;
      }

      // Enter/Space on overlays
      if (e.key === 'Enter' || e.key === ' ') {
        if (gameState === 'START' || gameState === 'GAMEOVER') {
          handleStartGame();
          return;
        }
        if (gameState === 'LEVELCLEAR') {
          handleNextLevel();
          return;
        }
      }

      activeKeysRef.current[e.key.toLowerCase()] = true;
      activeKeysRef.current[e.key] = true;
      computeInputDirection();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeysRef.current[e.key.toLowerCase()] = false;
      activeKeysRef.current[e.key] = false;
      computeInputDirection();
    };

    const computeInputDirection = () => {
      const keys = activeKeysRef.current;
      let x = 0;
      let y = 0;

      if (keys['arrowup'] || keys['w']) y -= 1;
      if (keys['arrowdown'] || keys['s']) y += 1;
      if (keys['arrowleft'] || keys['a']) x -= 1;
      if (keys['arrowright'] || keys['d']) x += 1;

      setInputDirection({ x, y });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, level, difficulty]);

  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#e0e2ec] flex flex-col items-center justify-between px-3 py-4 selection:bg-[#00ffcc] selection:text-[#0b0c10]">
      {/* Top Bar Contract (Zone 1: Brand title, Zone 2: Nav links, Zone 3: Primary Action) */}
      <header className="w-full max-w-5xl flex items-center justify-between pb-3 mb-2 border-b border-slate-800/80">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-2">
          <Gamepad2 className="text-[#00ffcc] w-5 h-5" />
          <span className="font-pixel text-sm sm:text-base text-white tracking-wider glow-cyan">
            RETRO MAZE RUNNER
          </span>
        </div>

        {/* Zone 2: Navigation links */}
        <nav className="hidden sm:flex items-center gap-5 text-xs text-slate-400 font-sans">
          <button
            onClick={() => setShowHelp(true)}
            className="hover:text-white transition-colors cursor-pointer"
          >
            How To Play
          </button>
          <button
            onClick={() => setShowLeaderboard(true)}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Leaderboard
          </button>
          <button
            onClick={handleToggleCRT}
            className="hover:text-white transition-colors cursor-pointer"
          >
            CRT Filter: {crtEffect ? 'ON' : 'OFF'}
          </button>
        </nav>

        {/* Zone 3: Primary Action Button */}
        <div className="flex items-center gap-2">
          {gameState === 'PLAYING' ? (
            <button
              onClick={handleTogglePause}
              className="px-3 py-1.5 rounded-md bg-[#1f2233] hover:bg-[#2d3148] text-xs text-[#00ffcc] font-pixel border border-slate-700 transition-colors whitespace-nowrap"
            >
              PAUSE
            </button>
          ) : (
            <button
              onClick={handleStartGame}
              className="px-3.5 py-1.5 rounded-md bg-[#00ffcc] hover:bg-[#33ffdd] text-[#0a0a0e] text-xs font-pixel font-bold shadow-[0_3px_0_#009977] active:translate-y-0.5 active:shadow-none transition-all whitespace-nowrap"
            >
              PLAY NOW
            </button>
          )}
        </div>
      </header>

      {/* Main Game Arena Container */}
      <main className="w-full flex flex-col items-center justify-center flex-1 my-1">
        {/* Arcade ScoreBoard */}
        <ScoreBoard
          score={score}
          highScore={highScore}
          level={level}
          lives={lives}
          maxLives={maxLives}
          biome={levelData.config.theme}
          difficulty={difficulty}
          player={player}
          isPaused={gameState === 'PAUSED'}
          soundEnabled={soundEnabled}
          crtEffect={crtEffect}
          onTogglePause={handleTogglePause}
          onToggleSound={handleToggleSound}
          onToggleCRT={handleToggleCRT}
          onOpenHelp={() => setShowHelp(true)}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
        />

        {/* Screen with Canvas and Interactive Overlays */}
        <div className="relative">
          <ArcadeScreen
            grid={levelData.config.grid}
            rows={levelData.config.rows}
            cols={levelData.config.cols}
            tileSize={levelData.config.tileSize}
            theme={levelData.config.theme}
            difficulty={difficulty}
            player={player}
            ghosts={ghosts}
            coins={coins}
            powerUps={powerUps}
            portal={portal}
            isPlaying={gameState === 'PLAYING'}
            isPaused={gameState === 'PAUSED'}
            inputDirection={inputDirection}
            onCoinCollected={handleCoinCollected}
            onPowerUpCollected={handlePowerUpCollected}
            onPortalReached={handlePortalReached}
            onPlayerHit={handlePlayerHit}
            onCoinsDepleted={handleCoinsDepleted}
            onUpdatePlayerPos={setPlayer}
            crtEffect={crtEffect}
          />

          {/* Overlays for Start, Pause, Victory, and Game Over */}
          <Overlays
            gameState={gameState}
            score={score}
            highScore={highScore}
            level={level}
            difficulty={difficulty}
            levelStats={levelStats}
            onStartGame={handleStartGame}
            onResumeGame={() => setGameState('PLAYING')}
            onNextLevel={handleNextLevel}
            onRestartGame={handleRestartGame}
            onChangeDifficulty={setDifficulty}
          />
        </div>

        {/* Virtual On-Screen Controls for mobile / touch */}
        {isTouchDevice && (
          <VirtualControls
            onDirectionChange={setInputDirection}
            disabled={gameState !== 'PLAYING'}
          />
        )}
      </main>

      {/* Keyboard Controls Hint Footer */}
      <footer className="w-full max-w-2xl text-center py-2 text-slate-500 text-[11px] font-sans">
        <div className="flex items-center justify-center gap-4 flex-wrap text-slate-400">
          <span>Move: <strong className="text-slate-200">WASD / Arrow Keys</strong></span>
          <span>·</span>
          <span>Pause: <strong className="text-slate-200">P / Esc</strong></span>
          <span>·</span>
          <span>Goal: <strong className="text-[#00ffcc]">Collect Coins &amp; Enter Portal</strong></span>
        </div>
      </footer>

      {/* Help Modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        records={records}
        onClearRecords={() => {
          setRecords([]);
          localStorage.removeItem(RECORDS_KEY);
        }}
      />
    </div>
  );
}
