import React, { useEffect, useRef, useCallback } from 'react';
import { BiomeTheme, Coin, Difficulty, FloatingNotification, Ghost, Particle, Player, Portal, PowerUp } from '../types/game';
import { getThemePalette } from '../utils/mazeGenerator';
import { sound } from '../audio/soundEngine';

interface ArcadeScreenProps {
  levelKey: number;
  grid: number[][];
  rows: number;
  cols: number;
  tileSize: number;
  theme: BiomeTheme;
  difficulty: Difficulty;
  playerStart: { x: number; y: number };
  initialGhosts: Ghost[];
  initialCoins: Coin[];
  initialPowerUps: PowerUp[];
  initialPortal: Portal;
  isPlaying: boolean;
  isPaused: boolean;
  inputDirection: { x: number; y: number };
  onCoinCollected: (coin: Coin, remainingCount: number) => void;
  onPowerUpCollected: (pw: PowerUp) => void;
  onPortalReached: () => void;
  onPlayerHit: () => void;
  onCoinsDepleted: () => void;
  onEffectsUpdated: (effects: Player['activeEffects']) => void;
  onCoinsCountUpdated: (count: number) => void;
  crtEffect: boolean;
}

export const ArcadeScreen: React.FC<ArcadeScreenProps> = ({
  levelKey,
  grid,
  rows,
  cols,
  tileSize,
  theme,
  difficulty,
  playerStart,
  initialGhosts,
  initialCoins,
  initialPowerUps,
  initialPortal,
  isPlaying,
  isPaused,
  inputDirection,
  onCoinCollected,
  onPowerUpCollected,
  onPortalReached,
  onPlayerHit,
  onCoinsDepleted,
  onEffectsUpdated,
  onCoinsCountUpdated,
  crtEffect,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Stable callbacks container
  const callbacksRef = useRef({
    onCoinCollected,
    onPowerUpCollected,
    onPortalReached,
    onPlayerHit,
    onCoinsDepleted,
    onEffectsUpdated,
    onCoinsCountUpdated,
  });
  callbacksRef.current = {
    onCoinCollected,
    onPowerUpCollected,
    onPortalReached,
    onPlayerHit,
    onCoinsDepleted,
    onEffectsUpdated,
    onCoinsCountUpdated,
  };

  const inputRef = useRef<{ x: number; y: number }>(inputDirection);
  inputRef.current = inputDirection;

  // Local game state refs
  const playerRef = useRef<Player>({
    x: playerStart.x,
    y: playerStart.y,
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

  const ghostsRef = useRef<Ghost[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const portalRef = useRef<Portal>({ ...initialPortal });

  // Input buffering for smooth arcade corner turns
  const bufferedDirectionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Visual effects
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingNotification[]>([]);
  const screenShakeRef = useRef<number>(0);
  const invulnerableTimerRef = useRef<number>(0);
  const portalAnnouncedRef = useRef<boolean>(false);
  const lastEffectsSyncRef = useRef<number>(0);

  const canvasWidth = cols * tileSize;
  const canvasHeight = rows * tileSize;

  // Initialize level entities on levelKey change
  useEffect(() => {
    playerRef.current = {
      x: playerStart.x,
      y: playerStart.y,
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
    };

    ghostsRef.current = initialGhosts.map((g) => ({
      ...g,
      x: g.spawnX ?? g.x,
      y: g.spawnY ?? g.y,
      dirX: 0,
      dirY: 0,
    }));

    coinsRef.current = initialCoins.map((c) => ({ ...c }));
    powerUpsRef.current = initialPowerUps.map((p) => ({ ...p }));
    portalRef.current = { ...initialPortal };
    portalAnnouncedRef.current = false;
    particlesRef.current = [];
    floatingTextsRef.current = [];
    screenShakeRef.current = 0;
    invulnerableTimerRef.current = 0;
    bufferedDirectionRef.current = { x: 0, y: 0 };

    callbacksRef.current.onCoinsCountUpdated(initialCoins.length);
  }, [levelKey, playerStart, initialGhosts, initialCoins, initialPowerUps, initialPortal]);

  // Wall collision check helper
  const checkWallCollision = useCallback(
    (x: number, y: number, radius: number): boolean => {
      const numChecks = 8;
      for (let i = 0; i < numChecks; i++) {
        const angle = (i * 2 * Math.PI) / numChecks;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;

        const c = Math.floor(px / tileSize);
        const r = Math.floor(py / tileSize);

        if (r < 0 || r >= rows || c < 0 || c >= cols) return true;
        if (grid[r] && grid[r][c] === 1) return true;
      }
      return false;
    },
    [grid, rows, cols, tileSize]
  );

  // Particle helper (with safety max pool of 120)
  const addParticles = (x: number, y: number, color: string, count = 8, speed = 2.5) => {
    if (particlesRef.current.length > 120) {
      particlesRef.current.splice(0, count);
    }
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = (0.5 + Math.random() * 0.8) * speed;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: 1.5 + Math.random() * 2.5,
        color,
        life: 0,
        maxLife: 18 + Math.random() * 12,
      });
    }
  };

  // Floating text helper (with safety max pool of 15)
  const addFloatingText = (x: number, y: number, text: string, color: string) => {
    if (floatingTextsRef.current.length > 15) {
      floatingTextsRef.current.shift();
    }
    floatingTextsRef.current.push({
      id: Math.random().toString(),
      x,
      y: y - 5,
      text,
      color,
      life: 0,
      maxLife: 35,
    });
  };

  // MAIN STABLE 60FPS GAME LOOP
  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const deltaTime = Math.min(currentTime - lastTime, 40);
      lastTime = currentTime;

      const canvas = canvasRef.current;
      if (!canvas) {
        animationId = requestAnimationFrame(loop);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationId = requestAnimationFrame(loop);
        return;
      }

      // Crisp pixel rendering without blurring
      ctx.imageSmoothingEnabled = false;

      if (isPlaying && !isPaused) {
        const curPlayer = playerRef.current;
        const input = inputRef.current;
        const curCoins = coinsRef.current;
        const curPowerUps = powerUpsRef.current;
        const curGhosts = ghostsRef.current;
        const curPortal = portalRef.current;

        // Decrement invulnerability timer
        if (invulnerableTimerRef.current > 0) {
          invulnerableTimerRef.current -= deltaTime;
        }

        // 1. UPDATE POWER-UP TIMERS (FIX 2: GUARANTEED ZERO-EXPIRY EMIT)
        let effectsActive = false;
        let expiredThisFrame = false;

        if (curPlayer.activeEffects.speedBoostRemaining > 0) {
          curPlayer.activeEffects.speedBoostRemaining = Math.max(0, curPlayer.activeEffects.speedBoostRemaining - deltaTime);
          if (curPlayer.activeEffects.speedBoostRemaining === 0) expiredThisFrame = true;
          else effectsActive = true;

          // Dash trail particles
          if (Math.random() < 0.25) {
            particlesRef.current.push({
              x: curPlayer.x + (Math.random() - 0.5) * 6,
              y: curPlayer.y + (Math.random() - 0.5) * 6,
              vx: -input.x * 0.5,
              vy: -input.y * 0.5,
              size: 2,
              color: '#f59e0b',
              life: 0,
              maxLife: 12,
            });
          }
        }

        if (curPlayer.activeEffects.freezeRemaining > 0) {
          curPlayer.activeEffects.freezeRemaining = Math.max(0, curPlayer.activeEffects.freezeRemaining - deltaTime);
          if (curPlayer.activeEffects.freezeRemaining === 0) expiredThisFrame = true;
          else effectsActive = true;
        }

        if (curPlayer.activeEffects.magnetRemaining > 0) {
          curPlayer.activeEffects.magnetRemaining = Math.max(0, curPlayer.activeEffects.magnetRemaining - deltaTime);
          if (curPlayer.activeEffects.magnetRemaining === 0) expiredThisFrame = true;
          else effectsActive = true;
        }

        // Sync with HUD on timer expiry OR every 100ms
        if (expiredThisFrame || (effectsActive && currentTime - lastEffectsSyncRef.current > 100)) {
          lastEffectsSyncRef.current = currentTime;
          callbacksRef.current.onEffectsUpdated({ ...curPlayer.activeEffects });
        }

        // 2. PLAYER MOVEMENT & CORNER TURNING (FIX 5: PRE-TURN BUFFERING)
        if (input.x !== 0 || input.y !== 0) {
          bufferedDirectionRef.current = { x: input.x, y: input.y };
        }

        const speedMultiplier = curPlayer.activeEffects.speedBoostRemaining > 0 ? 1.45 : 1.0;
        const effectiveSpeed = curPlayer.baseSpeed * speedMultiplier;

        // Try applying buffered turn if perpendicular
        let desiredX = input.x;
        let desiredY = input.y;

        // Attempt pre-turn into open corridor
        const curTileC = Math.floor(curPlayer.x / tileSize);
        const curTileR = Math.floor(curPlayer.y / tileSize);
        const tileCenterX = curTileC * tileSize + tileSize / 2;
        const tileCenterY = curTileR * tileSize + tileSize / 2;

        if (desiredX !== 0 && desiredY === 0) {
          // Player wants to move horizontally
          const diffY = tileCenterY - curPlayer.y;
          if (Math.abs(diffY) > 1 && Math.abs(diffY) < tileSize * 0.45) {
            // Check if horizontal passage is open
            const nextC = curTileC + (desiredX > 0 ? 1 : -1);
            if (nextC >= 0 && nextC < cols && grid[curTileR] && grid[curTileR][nextC] === 0) {
              // Nudge vertically toward tile center
              curPlayer.y += Math.sign(diffY) * Math.min(Math.abs(diffY), 1.5);
            }
          }
        } else if (desiredY !== 0 && desiredX === 0) {
          // Player wants to move vertically
          const diffX = tileCenterX - curPlayer.x;
          if (Math.abs(diffX) > 1 && Math.abs(diffX) < tileSize * 0.45) {
            const nextR = curTileR + (desiredY > 0 ? 1 : -1);
            if (nextR >= 0 && nextR < rows && grid[nextR] && grid[nextR][curTileC] === 0) {
              curPlayer.x += Math.sign(diffX) * Math.min(Math.abs(diffX), 1.5);
            }
          }
        }

        let dx = desiredX * effectiveSpeed;
        let dy = desiredY * effectiveSpeed;

        if (dx !== 0 && dy !== 0) {
          dx *= 0.7071;
          dy *= 0.7071;
        }

        let moved = false;

        // Move X
        if (dx !== 0) {
          if (!checkWallCollision(curPlayer.x + dx, curPlayer.y, curPlayer.radius)) {
            curPlayer.x += dx;
            moved = true;
          } else {
            // Wall slide nudge along Y
            const diffY = tileCenterY - curPlayer.y;
            if (Math.abs(diffY) > 1.2 && Math.abs(diffY) < tileSize * 0.4) {
              const nudge = Math.sign(diffY) * Math.min(Math.abs(diffY), 1.4);
              if (!checkWallCollision(curPlayer.x + dx * 0.3, curPlayer.y + nudge, curPlayer.radius)) {
                curPlayer.y += nudge;
                curPlayer.x += dx * 0.5;
                moved = true;
              }
            }
          }
        }

        // Move Y
        if (dy !== 0) {
          if (!checkWallCollision(curPlayer.x, curPlayer.y + dy, curPlayer.radius)) {
            curPlayer.y += dy;
            moved = true;
          } else {
            // Wall slide nudge along X
            const diffX = tileCenterX - curPlayer.x;
            if (Math.abs(diffX) > 1.2 && Math.abs(diffX) < tileSize * 0.4) {
              const nudge = Math.sign(diffX) * Math.min(Math.abs(diffX), 1.4);
              if (!checkWallCollision(curPlayer.x + nudge, curPlayer.y + dy * 0.3, curPlayer.radius)) {
                curPlayer.x += nudge;
                curPlayer.y += dy * 0.5;
                moved = true;
              }
            }
          }
        }

        // Update facing direction
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) curPlayer.facing = 'RIGHT';
          else if (dx < 0) curPlayer.facing = 'LEFT';
        } else if (Math.abs(dy) > 0.1) {
          if (dy > 0) curPlayer.facing = 'DOWN';
          else if (dy < 0) curPlayer.facing = 'UP';
        }
        curPlayer.moving = moved;

        // 3. COINS COLLECTION & MAGNET
        const isMagnetActive = curPlayer.activeEffects.magnetRemaining > 0;
        const magnetRadius = tileSize * 4;
        let coinCollectedThisFrame = false;

        curCoins.forEach((coin) => {
          if (!coin.collected) {
            const dist = Math.hypot(curPlayer.x - coin.x, curPlayer.y - coin.y);

            // Magnet attraction
            if (isMagnetActive && dist < magnetRadius) {
              const pullSpeed = 3.8;
              const angle = Math.atan2(curPlayer.y - coin.y, curPlayer.x - coin.x);
              coin.x += Math.cos(angle) * pullSpeed;
              coin.y += Math.sin(angle) * pullSpeed;
            }

            // Collection
            if (dist < curPlayer.radius + 7) {
              coin.collected = true;
              coinCollectedThisFrame = true;
              const remaining = curCoins.filter((c) => !c.collected).length;
              callbacksRef.current.onCoinCollected(coin, remaining);
              callbacksRef.current.onCoinsCountUpdated(remaining);
              addParticles(coin.x, coin.y, coin.isSuper ? '#00ffcc' : '#ffcc00', coin.isSuper ? 12 : 7);
              addFloatingText(coin.x, coin.y, `+${coin.value}`, coin.isSuper ? '#00ffcc' : '#ffcc00');
            }
          }
        });

        // 4. CHECK PORTAL ACTIVATION
        const uncollectedCoins = curCoins.filter((c) => !c.collected).length;
        if (uncollectedCoins === 0 && !curPortal.active) {
          curPortal.active = true;
          if (!portalAnnouncedRef.current) {
            portalAnnouncedRef.current = true;
            sound.playPortalOpenSound();
            addFloatingText(curPortal.x, curPortal.y - 12, 'PORTAL OPEN!', '#00ffcc');
            addParticles(curPortal.x, curPortal.y, '#00ffcc', 28, 4);
          }
          callbacksRef.current.onCoinsDepleted();
        }

        // 5. POWER-UP COLLECTION
        curPowerUps.forEach((pw) => {
          if (!pw.collected) {
            const dist = Math.hypot(curPlayer.x - pw.x, curPlayer.y - pw.y);
            if (dist < curPlayer.radius + 8) {
              pw.collected = true;
              if (pw.type === 'SPEED') curPlayer.activeEffects.speedBoostRemaining = 6000;
              if (pw.type === 'FREEZE') {
                curPlayer.activeEffects.freezeRemaining = 5000;
                sound.playFreezeSound();
              }
              if (pw.type === 'SHIELD') curPlayer.activeEffects.hasShield = true;
              if (pw.type === 'MAGNET') curPlayer.activeEffects.magnetRemaining = 7000;

              callbacksRef.current.onEffectsUpdated({ ...curPlayer.activeEffects });
              callbacksRef.current.onPowerUpCollected(pw);
              sound.playPowerUpSound();

              const colors: Record<string, string> = {
                SPEED: '#f59e0b',
                FREEZE: '#38bdf8',
                SHIELD: '#3b82f6',
                MAGNET: '#c084fc',
              };
              const color = colors[pw.type] || '#ffcc00';
              addParticles(pw.x, pw.y, color, 16, 3.5);
              addFloatingText(pw.x, pw.y, pw.type, color);
            }
          }
        });

        // 6. PORTAL REACHED (LEVEL CLEAR)
        if (curPortal.active) {
          const distToPortal = Math.hypot(curPlayer.x - curPortal.x, curPlayer.y - curPortal.y);
          if (distToPortal < curPlayer.radius + 10) {
            sound.playLevelClearSound();
            addParticles(curPortal.x, curPortal.y, '#00ffcc', 35, 5);
            callbacksRef.current.onPortalReached();
          }
        }

        // 7. GHOST AI & CORRIDOR NAVIGATION (FIX 4: ACCURATE TILE-CROSSING DETECTION)
        const isFrozen = curPlayer.activeEffects.freezeRemaining > 0;

        curGhosts.forEach((ghost) => {
          if (isFrozen) {
            ghost.isFrozen = true;
            return;
          }
          ghost.isFrozen = false;

          let targetX = curPlayer.x;
          let targetY = curPlayer.y;

          if (ghost.type === 'AMBUSHER') {
            const lookAhead = tileSize * 3;
            if (curPlayer.facing === 'UP') targetY -= lookAhead;
            else if (curPlayer.facing === 'DOWN') targetY += lookAhead;
            else if (curPlayer.facing === 'LEFT') targetX -= lookAhead;
            else if (curPlayer.facing === 'RIGHT') targetX += lookAhead;
          } else if (ghost.type === 'PATROLLER') {
            const t = Math.floor(currentTime / 4000) % 4;
            if (t === 0) {
              targetX = tileSize * 1.5;
              targetY = tileSize * 1.5;
            } else if (t === 1) {
              targetX = (cols - 2) * tileSize;
              targetY = tileSize * 1.5;
            } else if (t === 2) {
              targetX = (cols - 2) * tileSize;
              targetY = (rows - 2) * tileSize;
            } else {
              targetX = tileSize * 1.5;
              targetY = (rows - 2) * tileSize;
            }
          }

          const gTileC = Math.floor(ghost.x / tileSize);
          const gTileR = Math.floor(ghost.y / tileSize);
          const gCenterX = gTileC * tileSize + tileSize / 2;
          const gCenterY = gTileR * tileSize + tileSize / 2;

          // Check if ghost is at center of tile or has no direction
          const curDirX = ghost.dirX || 0;
          const curDirY = ghost.dirY || 0;

          const distToCenterX = Math.abs(ghost.x - gCenterX);
          const distToCenterY = Math.abs(ghost.y - gCenterY);

          // We trigger decision when within 2px of center along axis of movement or stopped
          const reachedIntersection =
            (curDirX === 0 && curDirY === 0) ||
            (curDirX !== 0 && distToCenterX <= Math.max(ghost.speed, 2.0)) ||
            (curDirY !== 0 && distToCenterY <= Math.max(ghost.speed, 2.0));

          if (reachedIntersection) {
            // Snap to lane axis to prevent drifting
            if (curDirX !== 0) ghost.y = gCenterY;
            if (curDirY !== 0) ghost.x = gCenterX;

            // Evaluate valid corridor directions
            const directions = [
              { dx: 0, dy: -1 }, // UP
              { dx: 0, dy: 1 },  // DOWN
              { dx: -1, dy: 0 }, // LEFT
              { dx: 1, dy: 0 },  // RIGHT
            ];

            const validChoices: { dx: number; dy: number; score: number }[] = [];

            for (const d of directions) {
              const nextC = gTileC + d.dx;
              const nextR = gTileR + d.dy;

              if (nextR >= 0 && nextR < rows && nextC >= 0 && nextC < cols && grid[nextR][nextC] === 0) {
                const isReverse = curDirX !== 0 && d.dx === -curDirX || curDirY !== 0 && d.dy === -curDirY;
                const nextTileCenterX = nextC * tileSize + tileSize / 2;
                const nextTileCenterY = nextR * tileSize + tileSize / 2;
                const distToTarget = Math.hypot(nextTileCenterX - targetX, nextTileCenterY - targetY);

                let score = distToTarget;
                if (isReverse) score += 1000; // Prefer continuing forward or turning over turning back
                if (ghost.type === 'WANDERER') score += Math.random() * 250;

                validChoices.push({ dx: d.dx, dy: d.dy, score });
              }
            }

            if (validChoices.length > 0) {
              validChoices.sort((a, b) => a.score - b.score);
              ghost.dirX = validChoices[0].dx;
              ghost.dirY = validChoices[0].dy;
            }
          }

          // Move along chosen direction
          const nextGx = ghost.x + (ghost.dirX || 0) * ghost.speed;
          const nextGy = ghost.y + (ghost.dirY || 0) * ghost.speed;

          if (!checkWallCollision(nextGx, nextGy, ghost.radius)) {
            ghost.x = nextGx;
            ghost.y = nextGy;
          } else {
            // If collision hit, snap to tile center and reset direction
            ghost.x = gCenterX;
            ghost.y = gCenterY;
            ghost.dirX = 0;
            ghost.dirY = 0;
          }

          // Eye offset
          const edx = curPlayer.x - ghost.x;
          const edy = curPlayer.y - ghost.y;
          const edist = Math.hypot(edx, edy) || 1;
          ghost.eyeOffset = {
            x: Math.max(-2, Math.min(2, (edx / edist) * 2)),
            y: Math.max(-2, Math.min(2, (edy / edist) * 2)),
          };

          // Check collision with player (FIX 10: CLEAN RESPAWN)
          const ghostDist = Math.hypot(curPlayer.x - ghost.x, curPlayer.y - ghost.y);
          if (ghostDist < curPlayer.radius + ghost.radius - 2) {
            if (invulnerableTimerRef.current <= 0) {
              if (curPlayer.activeEffects.hasShield) {
                // Shield pops
                curPlayer.activeEffects.hasShield = false;
                invulnerableTimerRef.current = 1000;
                callbacksRef.current.onEffectsUpdated({ ...curPlayer.activeEffects });
                sound.playShieldPopSound();
                screenShakeRef.current = 6;
                addParticles(curPlayer.x, curPlayer.y, '#3b82f6', 20, 4);
                addFloatingText(curPlayer.x, curPlayer.y - 10, 'SHIELD SAVED!', '#38bdf8');
                // Knock ghost back
                ghost.x = ghost.spawnX ?? gCenterX;
                ghost.y = ghost.spawnY ?? gCenterY;
                ghost.dirX = 0;
                ghost.dirY = 0;
              } else {
                // Life lost: safely respawn player & reset all ghosts
                invulnerableTimerRef.current = 1800;
                screenShakeRef.current = 14;
                sound.playHitSound();
                addParticles(curPlayer.x, curPlayer.y, '#ef4444', 25, 4.5);
                addFloatingText(curPlayer.x, curPlayer.y - 10, '-1 LIFE', '#ef4444');

                curPlayer.x = playerStart.x;
                curPlayer.y = playerStart.y;
                curPlayer.activeEffects.speedBoostRemaining = 0;

                curGhosts.forEach((g) => {
                  g.x = g.spawnX ?? (cols - 2) * tileSize;
                  g.y = g.spawnY ?? (rows - 2) * tileSize;
                  g.dirX = 0;
                  g.dirY = 0;
                });

                callbacksRef.current.onEffectsUpdated({ ...curPlayer.activeEffects });
                callbacksRef.current.onPlayerHit();
              }
            }
          }
        });
      }

      // 8. RENDER SCREEN
      ctx.save();

      if (screenShakeRef.current > 0) {
        const shakeX = (Math.random() - 0.5) * screenShakeRef.current;
        const shakeY = (Math.random() - 0.5) * screenShakeRef.current;
        ctx.translate(shakeX, shakeY);
        screenShakeRef.current = Math.max(0, screenShakeRef.current - 1);
      }

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      const palette = getThemePalette(theme);

      // Draw Grid Walls & Floors
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const isWall = grid[r][c] === 1;
          const x = c * tileSize;
          const y = r * tileSize;

          if (isWall) {
            ctx.fillStyle = palette.wallFill;
            ctx.fillRect(x, y, tileSize, tileSize);

            ctx.strokeStyle = palette.wallStroke;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 0.5, y + 0.5, tileSize - 1, tileSize - 1);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(x + 2, y + 2, tileSize - 4, 2);
          } else {
            ctx.fillStyle = palette.floorFill;
            ctx.fillRect(x, y, tileSize, tileSize);

            ctx.fillStyle = palette.gridLine;
            ctx.fillRect(x + tileSize / 2 - 1, y + tileSize / 2 - 1, 2, 2);
          }
        }
      }

      // Draw Coins
      const time = currentTime * 0.003;
      coinsRef.current.forEach((coin) => {
        if (!coin.collected) {
          const bounce = Math.sin(time + coin.x * 0.1) * 1.5;
          const coinColor = coin.isSuper ? '#00ffcc' : '#ffcc00';

          ctx.save();
          ctx.shadowColor = coinColor;
          ctx.shadowBlur = coin.isSuper ? 12 : 6;
          ctx.fillStyle = coinColor;

          ctx.beginPath();
          ctx.arc(coin.x, coin.y + bounce, coin.isSuper ? 6.5 : 4.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(coin.x - 1.5, coin.y + bounce - 1.5, coin.isSuper ? 2 : 1.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
      });

      // Draw Power-Ups
      powerUpsRef.current.forEach((pw) => {
        if (!pw.collected) {
          const pulse = 1 + Math.sin(time * 3 + pw.x) * 0.15;
          let icon = '⚡';
          let glowColor = '#f59e0b';
          let bgColor = '#78350f';

          if (pw.type === 'FREEZE') {
            icon = '❄️';
            glowColor = '#38bdf8';
            bgColor = '#075985';
          } else if (pw.type === 'SHIELD') {
            icon = '🛡️';
            glowColor = '#3b82f6';
            bgColor = '#1e3a8a';
          } else if (pw.type === 'MAGNET') {
            icon = '🧲';
            glowColor = '#c084fc';
            bgColor = '#581c87';
          }

          ctx.save();
          ctx.translate(pw.x, pw.y);
          ctx.scale(pulse, pulse);

          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 10;
          ctx.fillStyle = bgColor;
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = glowColor;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(icon, 0, 1);

          ctx.restore();
        }
      });

      // Draw Exit Portal
      const curPortal = portalRef.current;
      ctx.save();
      if (curPortal.active) {
        const portalAngle = time * 2;
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 18;

        const pulse = 14 + Math.sin(time * 4) * 2.5;
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(curPortal.x, curPortal.y, pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(curPortal.x, curPortal.y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
          const a = portalAngle + (i * Math.PI) / 2;
          ctx.beginPath();
          ctx.moveTo(curPortal.x, curPortal.y);
          ctx.lineTo(curPortal.x + Math.cos(a) * pulse, curPortal.y + Math.sin(a) * pulse);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(curPortal.x, curPortal.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔒', curPortal.x, curPortal.y);
      }
      ctx.restore();

      // Draw Ghosts
      const isGhostFrozen = playerRef.current.activeEffects.freezeRemaining > 0;

      ghostsRef.current.forEach((ghost) => {
        ctx.save();
        ctx.translate(ghost.x, ghost.y);

        const bodyColor = isGhostFrozen ? '#38bdf8' : ghost.color;
        const skirtWiggle = Math.sin(time * 6 + ghost.x) * 1.5;

        ctx.shadowColor = bodyColor;
        ctx.shadowBlur = isGhostFrozen ? 8 : 12;

        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(0, -2, ghost.radius, Math.PI, 0, false);
        ctx.lineTo(ghost.radius, ghost.radius - 2 + skirtWiggle);
        ctx.lineTo(ghost.radius / 2, ghost.radius - 5 - skirtWiggle);
        ctx.lineTo(0, ghost.radius - 2 + skirtWiggle);
        ctx.lineTo(-ghost.radius / 2, ghost.radius - 5 - skirtWiggle);
        ctx.lineTo(-ghost.radius, ghost.radius - 2 + skirtWiggle);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-3.5 + ghost.eyeOffset.x * 0.5, -3 + ghost.eyeOffset.y * 0.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(3.5 + ghost.eyeOffset.x * 0.5, -3 + ghost.eyeOffset.y * 0.5, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isGhostFrozen ? '#0284c7' : '#0f172a';
        ctx.beginPath();
        ctx.arc(-3.5 + ghost.eyeOffset.x, -3 + ghost.eyeOffset.y, 1.3, 0, Math.PI * 2);
        ctx.arc(3.5 + ghost.eyeOffset.x, -3 + ghost.eyeOffset.y, 1.3, 0, Math.PI * 2);
        ctx.fill();

        if (isGhostFrozen) {
          ctx.fillStyle = '#e0f2fe';
          ctx.font = '8px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('❄', 0, 5);
        }

        ctx.restore();
      });

      // Draw Player
      const curPlayer = playerRef.current;
      const isInvulnerable = invulnerableTimerRef.current > 0;
      const isFlickering = isInvulnerable && Math.floor(currentTime / 90) % 2 === 0;

      if (!isFlickering) {
        ctx.save();
        ctx.translate(curPlayer.x, curPlayer.y);

        // Active Shield Forcefield
        if (curPlayer.activeEffects.hasShield) {
          ctx.save();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(0, 0, curPlayer.radius + 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
          ctx.fill();
          ctx.restore();
        }

        // Player Neon Orb
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#00ffcc';
        ctx.beginPath();
        ctx.arc(0, 0, curPlayer.radius, 0, Math.PI * 2);
        ctx.fill();

        // Visor
        ctx.fillStyle = '#0b0c10';
        let vx = 0, vy = 0;
        if (curPlayer.facing === 'RIGHT') vx = 3.5;
        else if (curPlayer.facing === 'LEFT') vx = -3.5;
        else if (curPlayer.facing === 'UP') vy = -3.5;
        else if (curPlayer.facing === 'DOWN') vy = 3.5;

        ctx.beginPath();
        ctx.arc(vx, vy, 3.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(vx + 0.8, vy - 0.8, 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Draw Particles
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        const alpha = Math.max(0, 1 - p.life / p.maxLife);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);

      // Draw Floating Notifications
      floatingTextsRef.current.forEach((ft) => {
        ft.y -= 0.6;
        ft.life++;
        const alpha = Math.max(0, 1 - ft.life / ft.maxLife);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = ft.color;
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 6;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });
      floatingTextsRef.current = floatingTextsRef.current.filter((ft) => ft.life < ft.maxLife);

      ctx.restore();

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [
    levelKey,
    isPlaying,
    isPaused,
    grid,
    rows,
    cols,
    tileSize,
    theme,
    difficulty,
    checkWallCollision,
  ]);

  return (
    <div
      className={`relative rounded-lg arcade-bezel bg-[#0a0a0e] overflow-hidden w-full max-w-[476px] aspect-square mx-auto ${
        crtEffect ? 'crt-scanlines crt-vignette' : ''
      }`}
    >
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="w-full h-full block cursor-crosshair touch-none select-none"
      />
    </div>
  );
};
