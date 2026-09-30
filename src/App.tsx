import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Difficulty,
  GameState,
  LevelClearStats,
  Player,
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
import { Gamepad2 } from 'lucide-react';

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
  const [levelKey, setLevelKey] = useState<number>(1);
  const [lives, setLives] = useState<number>(3);
  const maxLives = 3;

  // Level configuration & objectives
  const [levelData, setLevelData] = useState(() => generateLevel(1, 'ARCADE'));
  const [coinsRemaining, setCoinsRemaining] = useState<number>(() => levelData.coins.length);
  const [portalActive, setPortalActive] = useState<boolean>(false);

  // Active power-up effects for HUD display
  const [activeEffects, setActiveEffects] = useState<Player['activeEffects']>({
    speedBoostRemaining: 0,
    freezeRemaining: 0,
    hasShield: false,
    magnetRemaining: 0,
  });

  // Settings & modal states
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [crtEffect, setCrtEffect] = useState<boolean>(true);
  const [showVirtualControls, setShowVirtualControls] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [records, setRecords] = useState<RunStats[]>([]);
  const [levelStats, setLevelStats] = useState<LevelClearStats | null>(null);

  // Movement & timing
  const [inputDirection, setInputDirection] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const activeKeysRef = useRef<{ [key: string]: boolean }>({});
  const levelStartTimeRef = useRef<number>(Date.now());
  const initialCoinsCountRef = useRef<number>(levelData.coins.length);

  // Detect touch device on mount
  useEffect(() => {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setShowVirtualControls(true);
    }
  }, []);

  // Unlock Web Audio API on first user gesture
  useEffect(() => {
    const unlockAudio = () => {
      sound.enableAudioOnGesture();
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
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
        if (parsed.showVirtualControls !== undefined) setShowVirtualControls(parsed.showVirtualControls);
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

      setRecords((prev) => {
        const updated = [newRecord, ...prev]
          .sort((a, b) => b.score - a.score)
          .slice(0, 15);
        try {
          localStorage.setItem(RECORDS_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (finalScore > highScore) {
        setHighScore(finalScore);
        try {
          localStorage.setItem(HIGH_SCORE_KEY, finalScore.toString());
        } catch {}
      }
    },
    [difficulty, highScore]
  );

  // Toggle sound
  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      sound.setMuted(!next);
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ soundEnabled: next, crtEffect, showVirtualControls }));
      } catch {}
      return next;
    });
  }, [crtEffect, showVirtualControls]);

  // Toggle CRT effect
  const handleToggleCRT = useCallback(() => {
    setCrtEffect((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ soundEnabled, crtEffect: next, showVirtualControls }));
      } catch {}
      return next;
    });
  }, [soundEnabled, showVirtualControls]);

  // Toggle Virtual Controls
  const handleToggleVirtualControls = useCallback(() => {
    setShowVirtualControls((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ soundEnabled, crtEffect, showVirtualControls: next }));
      } catch {}
      return next;
    });
  }, [soundEnabled, crtEffect]);

  // Start fresh run (Level 1)
  const handleStartGame = useCallback(() => {
    sound.enableAudioOnGesture();
    const newLvl = generateLevel(1, difficulty);
    setLevelData(newLvl);
    setScore(0);
    setLevel(1);
    setLevelKey((k) => k + 1);
    setLives(3);
    setPortalActive(false);
    setCoinsRemaining(newLvl.coins.length);
    setActiveEffects({
      speedBoostRemaining: 0,
      freezeRemaining: 0,
      hasShield: false,
      magnetRemaining: 0,
    });
    setInputDirection({ x: 0, y: 0 });
    activeKeysRef.current = {};
    initialCoinsCountRef.current = newLvl.coins.length;
    levelStartTimeRef.current = Date.now();
    setLevelStats(null);
    setGameState('PLAYING');
  }, [difficulty]);

  // Advance to next level
  const handleNextLevel = useCallback(() => {
    sound.enableAudioOnGesture();
    const nextLvlNum = level + 1;
    const newLvl = generateLevel(nextLvlNum, difficulty);
    setLevelData(newLvl);
    setLevel(nextLvlNum);
    setLevelKey((k) => k + 1);
    setPortalActive(false);
    setCoinsRemaining(newLvl.coins.length);
    setActiveEffects({
      speedBoostRemaining: 0,
      freezeRemaining: 0,
      hasShield: false,
      magnetRemaining: 0,
    });
    setInputDirection({ x: 0, y: 0 });
    activeKeysRef.current = {};
    initialCoinsCountRef.current = newLvl.coins.length;
    levelStartTimeRef.current = Date.now();
    setLevelStats(null);
    setGameState('PLAYING');
  }, [level, difficulty]);

  // Retry the current level
  const handleRetryLevel = useCallback(() => {
    sound.enableAudioOnGesture();
    const freshLvl = generateLevel(level, difficulty);
    setLevelData(freshLvl);
    setLevelKey((k) => k + 1);
    setPortalActive(false);
    setCoinsRemaining(freshLvl.coins.length);
    setActiveEffects({
      speedBoostRemaining: 0,
      freezeRemaining: 0,
      hasShield: false,
      magnetRemaining: 0,
    });
    setInputDirection({ x: 0, y: 0 });
    activeKeysRef.current = {};
    levelStartTimeRef.current = Date.now();
    setGameState('PLAYING');
  }, [level, difficulty]);

  // Toggle pause
  const handleTogglePause = useCallback(() => {
    setGameState((prev) => {
      if (prev === 'PLAYING') {
        sound.playButtonBeep();
        return 'PAUSED';
      }
      if (prev === 'PAUSED') {
        sound.playButtonBeep();
        return 'PLAYING';
      }
      return prev;
    });
  }, []);

  // Stable event handlers for ArcadeScreen
  const handleCoinCollected = useCallback((coin: { value: number; isSuper: boolean }, remainingCount: number) => {
    if (coin.isSuper) {
      sound.playSuperCoinSound();
    } else {
      sound.playCoinSound();
    }
    setCoinsRemaining(remainingCount);
    setScore((prev) => {
      const next = prev + coin.value;
      if (next > highScore) {
        setHighScore(next);
        try {
          localStorage.setItem(HIGH_SCORE_KEY, next.toString());
        } catch {}
      }
      return next;
    });
  }, [highScore]);

  const handlePowerUpCollected = useCallback(() => {
    setScore((prev) => {
      const next = prev + 50;
      if (next > highScore) {
        setHighScore(next);
        try {
          localStorage.setItem(HIGH_SCORE_KEY, next.toString());
        } catch {}
      }
      return next;
    });
  }, [highScore]);

  const handleCoinsDepleted = useCallback(() => {
    setPortalActive(true);
  }, []);

  const handlePortalReached = useCallback(() => {
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
      try {
        localStorage.setItem(HIGH_SCORE_KEY, finalLevelScore.toString());
      } catch {}
    }
    setGameState('LEVELCLEAR');
  }, [level, lives, score, highScore]);

  const handlePlayerHit = useCallback(() => {
    setLives((prev) => {
      const remainingLives = prev - 1;
      if (remainingLives <= 0) {
        sound.playGameOverSound();
        saveRecord(score, level);
        setGameState('GAMEOVER');
        return 0;
      }
      return remainingLives;
    });
  }, [level, score, saveRecord]);

  const handleEffectsUpdated = useCallback((effects: Player['activeEffects']) => {
    setActiveEffects(effects);
  }, []);

  const handleCoinsCountUpdated = useCallback((count: number) => {
    setCoinsRemaining(count);
  }, []);

  // Window blur listener to prevent stuck keyboard keys
  useEffect(() => {
    const handleBlur = () => {
      activeKeysRef.current = {};
      setInputDirection({ x: 0, y: 0 });
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, []);

  // Keyboard navigation listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        handleTogglePause();
        return;
      }

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
  }, [gameState, handleStartGame, handleNextLevel, handleTogglePause]);

  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#e0e2ec] flex flex-col items-center justify-between px-3 py-3 selection:bg-[#00ffcc] selection:text-[#0b0c10]">
      {/* Top Bar Contract (Zone 1: Brand title, Zone 2: Nav links, Zone 3: Primary Action) */}
      <header className="w-full max-w-5xl flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-2">
          <Gamepad2 className="text-[#00ffcc] w-5 h-5 shrink-0" />
          <span className="font-pixel text-sm sm:text-base text-white tracking-wider glow-cyan truncate">
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
              className="px-3 py-1.5 rounded-md bg-[#1f2233] hover:bg-[#2d3148] text-xs text-[#00ffcc] font-pixel border border-slate-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              PAUSE
            </button>
          ) : (
            <button
              onClick={handleStartGame}
              className="px-3.5 py-1.5 rounded-md bg-[#00ffcc] hover:bg-[#33ffdd] text-[#0a0a0e] text-xs font-pixel font-bold shadow-[0_3px_0_#009977] active:translate-y-0.5 active:shadow-none transition-all whitespace-nowrap cursor-pointer"
            >
              PLAY NOW
            </button>
          )}
        </div>
      </header>

      {/* Main Game Container */}
      <main className="w-full flex flex-col items-center justify-center flex-1 my-1">
        {/* Arcade ScoreBoard */}
        <ScoreBoard
          score={score}
          highScore={highScore}
          level={level}
          lives={lives}
          maxLives={maxLives}
          coinsRemaining={coinsRemaining}
          portalActive={portalActive}
          biome={levelData.config.theme}
          difficulty={difficulty}
          activeEffects={activeEffects}
          isPaused={gameState === 'PAUSED'}
          soundEnabled={soundEnabled}
          crtEffect={crtEffect}
          showVirtualControls={showVirtualControls}
          onToggleVirtualControls={handleToggleVirtualControls}
          onTogglePause={handleTogglePause}
          onToggleSound={handleToggleSound}
          onToggleCRT={handleToggleCRT}
          onOpenHelp={() => setShowHelp(true)}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
        />

        {/* Screen with Canvas and Interactive Overlays inside aligned aspect-square container */}
        <div className="relative w-full max-w-[476px] aspect-square mx-auto">
          <ArcadeScreen
            levelKey={levelKey}
            grid={levelData.config.grid}
            rows={levelData.config.rows}
            cols={levelData.config.cols}
            tileSize={levelData.config.tileSize}
            theme={levelData.config.theme}
            difficulty={difficulty}
            playerStart={levelData.playerStart}
            initialGhosts={levelData.ghosts}
            initialCoins={levelData.coins}
            initialPowerUps={levelData.powerUps}
            initialPortal={levelData.portal}
            isPlaying={gameState === 'PLAYING'}
            isPaused={gameState === 'PAUSED'}
            inputDirection={inputDirection}
            onCoinCollected={handleCoinCollected}
            onPowerUpCollected={handlePowerUpCollected}
            onPortalReached={handlePortalReached}
            onPlayerHit={handlePlayerHit}
            onCoinsDepleted={handleCoinsDepleted}
            onEffectsUpdated={handleEffectsUpdated}
            onCoinsCountUpdated={handleCoinsCountUpdated}
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
            onRestartGame={handleStartGame}
            onRetryLevel={handleRetryLevel}
            onChangeDifficulty={setDifficulty}
          />
        </div>

        {/* Virtual On-Screen Controls */}
        {showVirtualControls && (
          <div className="w-full flex justify-center">
            <VirtualControls
              onDirectionChange={setInputDirection}
              disabled={gameState !== 'PLAYING'}
            />
          </div>
        )}
      </main>

      {/* Keyboard Controls Hint Footer */}
      <footer className="w-full max-w-2xl text-center py-2 text-slate-500 text-[11px] font-sans">
        <div className="flex items-center justify-center gap-4 flex-wrap text-slate-400">
          <span>Move: <strong className="text-slate-200">WASD / Arrow Keys</strong></span>
          <span>·</span>
          <span>Pause: <strong className="text-slate-200">P / Esc</strong></span>
          <span>·</span>
          <span>Goal: <strong className="text-[#00ffcc]">Collect Coins &amp; Escape Portal</strong></span>
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
