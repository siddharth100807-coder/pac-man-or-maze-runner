import React, { useEffect, useRef, useCallback } from 'react';
import { Coin, Difficulty, FloatingNotification, Ghost, Particle, Player, Portal, PowerUp } from '../types/game';
import { getThemePalette } from '../utils/mazeGenerator';
import { sound } from '../audio/soundEngine';

interface ArcadeScreenProps {
  grid: number[][];
  rows: number;
  cols: number;
  tileSize: number;
  theme: any;
  difficulty: Difficulty;
  player: Player;
  ghosts: Ghost[];
  coins: Coin[];
  powerUps: PowerUp[];
  portal: Portal;
  isPlaying: boolean;
  isPaused: boolean;
  inputDirection: { x: number; y: number };
  onCoinCollected: (coin: Coin) => void;
  onPowerUpCollected: (pw: PowerUp) => void;
  onPortalReached: () => void;
  onPlayerHit: () => void;
  onCoinsDepleted: () => void;
  onUpdatePlayerPos: (p: Player) => void;
  crtEffect: boolean;
}

export const ArcadeScreen: React.FC<ArcadeScreenProps> = ({
  grid,
  rows,
  cols,
  tileSize,
  theme,
  difficulty,
  player,
  ghosts,
  coins,
  powerUps,
  portal,
  isPlaying,
  isPaused,
  inputDirection,
  onCoinCollected,
  onPowerUpCollected,
  onPortalReached,
  onPlayerHit,
  onCoinsDepleted,
  onUpdatePlayerPos,
  crtEffect,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // References for continuous animation loop
  const playerRef = useRef<Player>(player);
  playerRef.current = player;

  const ghostsRef = useRef<Ghost[]>(ghosts);
  ghostsRef.current = ghosts;

  const coinsRef = useRef<Coin[]>(coins);
  coinsRef.current = coins;

  const powerUpsRef = useRef<PowerUp[]>(powerUps);
  powerUpsRef.current = powerUps;

  const portalRef = useRef<Portal>(portal);
  portalRef.current = portal;

  const inputRef = useRef<{ x: number; y: number }>(inputDirection);
  inputRef.current = inputDirection;

  // Effects & transient state
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingNotification[]>([]);
  const screenShakeRef = useRef<number>(0);
  const portalUnlockedAnnouncedRef = useRef<boolean>(false);
  const invulnerableTimerRef = useRef<number>(0);

  const canvasWidth = cols * tileSize;
  const canvasHeight = rows * tileSize;

  // Collision detection between circle and grid walls
  const checkWallCollision = useCallback(
    (x: number, y: number, radius: number): boolean => {
      // Check 8 perimeter points on circle bounding circumference
      const numChecks = 8;
      for (let i = 0; i < numChecks; i++) {
        const angle = (i * 2 * Math.PI) / numChecks;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;

        const c = Math.floor(px / tileSize);
        const r = Math.floor(py / tileSize);

        if (r < 0 || r >= rows || c < 0 || c >= cols) {
          return true;
        }
        if (grid[r] && grid[r][c] === 1) {
          return true;
        }
      }
      return false;
    },
    [grid, rows, cols, tileSize]
  );

  // Spawn particle helper
  const addParticles = (x: number, y: number, color: string, count = 8, speed = 2.5) => {
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
        maxLife: 20 + Math.random() * 15,
      });
    }
  };

  // Add floating message text (+10, +50, etc.)
  const addFloatingText = (x: number, y: number, text: string, color: string) => {
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

  // Reset portal announcement flag when level reloads
  useEffect(() => {
    portalUnlockedAnnouncedRef.current = false;
  }, [portal.x, portal.y, grid]);

  // Main game update & render loop
  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const deltaTime = Math.min(currentTime - lastTime, 50); // Clamp to prevent jumping
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

      if (isPlaying && !isPaused) {
        const curPlayer = playerRef.current;
        const curGhosts = ghostsRef.current;
        const curCoins = coinsRef.current;
        const curPowerUps = powerUpsRef.current;
        const curPortal = portalRef.current;
        const input = inputRef.current;

        // Decrement invulnerability
        if (invulnerableTimerRef.current > 0) {
          invulnerableTimerRef.current -= deltaTime;
        }

        // --- 1. UPDATE PLAYER POWER-UP TIMERS ---
        const activeEffects = { ...curPlayer.activeEffects };
        let speedMultiplier = 1.0;

        if (activeEffects.speedBoostRemaining > 0) {
          activeEffects.speedBoostRemaining = Math.max(0, activeEffects.speedBoostRemaining - deltaTime);
          speedMultiplier = 1.45;
          // Spawn speed sparks
          if (Math.random() < 0.3) {
            particlesRef.current.push({
              x: curPlayer.x + (Math.random() - 0.5) * 6,
              y: curPlayer.y + (Math.random() - 0.5) * 6,
              vx: -input.x * 0.5,
              vy: -input.y * 0.5,
              size: 2,
              color: '#f59e0b',
              life: 0,
              maxLife: 15,
            });
          }
        }

        if (activeEffects.freezeRemaining > 0) {
          activeEffects.freezeRemaining = Math.max(0, activeEffects.freezeRemaining - deltaTime);
        }

        if (activeEffects.magnetRemaining > 0) {
          activeEffects.magnetRemaining = Math.max(0, activeEffects.magnetRemaining - deltaTime);
        }

        // --- 2. UPDATE PLAYER POSITION & CORNER SLIDING ---
        const effectiveSpeed = curPlayer.baseSpeed * speedMultiplier;
        let dx = input.x * effectiveSpeed;
        let dy = input.y * effectiveSpeed;

        if (dx !== 0 && dy !== 0) {
          // Normalize diagonal movement
          dx *= 0.7071;
          dy *= 0.7071;
        }

        let newX = curPlayer.x;
        let newY = curPlayer.y;
        let moved = false;

        // Smooth X-axis collision & slide
        if (dx !== 0) {
          if (!checkWallCollision(curPlayer.x + dx, curPlayer.y, curPlayer.radius)) {
            newX += dx;
            moved = true;
          } else {
            // Attempt smart corner nudging: if slightly offset from tile center, nudge into lane
            const currentTileY = Math.floor(curPlayer.y / tileSize);
            const tileCenterY = currentTileY * tileSize + tileSize / 2;
            const diffY = tileCenterY - curPlayer.y;
            if (Math.abs(diffY) > 1.5 && Math.abs(diffY) < tileSize * 0.35) {
              const nudge = Math.sign(diffY) * Math.min(Math.abs(diffY), 1.2);
              if (!checkWallCollision(curPlayer.x + dx * 0.4, curPlayer.y + nudge, curPlayer.radius)) {
                newY += nudge;
                newX += dx * 0.6;
                moved = true;
              }
            }
          }
        }

        // Smooth Y-axis collision & slide
        if (dy !== 0) {
          if (!checkWallCollision(newX, curPlayer.y + dy, curPlayer.radius)) {
            newY += dy;
            moved = true;
          } else {
            // Corner nudging in X direction
            const currentTileX = Math.floor(newX / tileSize);
            const tileCenterX = currentTileX * tileSize + tileSize / 2;
            const diffX = tileCenterX - newX;
            if (Math.abs(diffX) > 1.5 && Math.abs(diffX) < tileSize * 0.35) {
              const nudge = Math.sign(diffX) * Math.min(Math.abs(diffX), 1.2);
              if (!checkWallCollision(newX + nudge, curPlayer.y + dy * 0.4, curPlayer.radius)) {
                newX += nudge;
                newY += dy * 0.6;
                moved = true;
              }
            }
          }
        }

        // Determine facing direction
        let facing = curPlayer.facing;
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) facing = 'RIGHT';
          else if (dx < 0) facing = 'LEFT';
        } else if (Math.abs(dy) > 0.1) {
          if (dy > 0) facing = 'DOWN';
          else if (dy < 0) facing = 'UP';
        }

        // Notify state of updated player
        if (newX !== curPlayer.x || newY !== curPlayer.y || facing !== curPlayer.facing || moved !== curPlayer.moving) {
          onUpdatePlayerPos({
            ...curPlayer,
            x: newX,
            y: newY,
            facing,
            moving: moved,
            activeEffects,
          });
        }

        // --- 3. COIN ATTRACTION & PICKUP ---
        const isMagnetActive = activeEffects.magnetRemaining > 0;
        const magnetRadius = tileSize * 4;

        curCoins.forEach((coin) => {
          if (!coin.collected) {
            const dist = Math.hypot(newX - coin.x, newY - coin.y);

            // Magnet pulling
            if (isMagnetActive && dist < magnetRadius) {
              const pullSpeed = 3.5;
              const angle = Math.atan2(newY - coin.y, newX - coin.x);
              coin.x += Math.cos(angle) * pullSpeed;
              coin.y += Math.sin(angle) * pullSpeed;
            }

            // Collection check
            if (dist < curPlayer.radius + 7) {
              coin.collected = true;
              onCoinCollected(coin);
              addParticles(coin.x, coin.y, coin.isSuper ? '#00ffcc' : '#ffcc00', coin.isSuper ? 12 : 7);
              addFloatingText(coin.x, coin.y, `+${coin.value}`, coin.isSuper ? '#00ffcc' : '#ffcc00');
            }
          }
        });

        // Check if all coins collected to open exit portal
        const uncollectedCoinsCount = curCoins.filter((c) => !c.collected).length;
        if (uncollectedCoinsCount === 0 && !curPortal.active) {
          curPortal.active = true;
          if (!portalUnlockedAnnouncedRef.current) {
            portalUnlockedAnnouncedRef.current = true;
            sound.playPortalOpenSound();
            addFloatingText(curPortal.x, curPortal.y - 12, 'PORTAL OPEN!', '#00ffcc');
            addParticles(curPortal.x, curPortal.y, '#00ffcc', 25, 4);
          }
          onCoinsDepleted();
        }

        // --- 4. POWER-UP PICKUP ---
        curPowerUps.forEach((pw) => {
          if (!pw.collected) {
            const dist = Math.hypot(newX - pw.x, newY - pw.y);
            if (dist < curPlayer.radius + 8) {
              pw.collected = true;
              onPowerUpCollected(pw);
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

        // --- 5. PORTAL VICTORY CHECK ---
        if (curPortal.active) {
          const distToPortal = Math.hypot(newX - curPortal.x, newY - curPortal.y);
          if (distToPortal < curPlayer.radius + 10) {
            sound.playLevelClearSound();
            addParticles(curPortal.x, curPortal.y, '#00ffcc', 35, 5);
            onPortalReached();
          }
        }

        // --- 6. GHOST AI MOVEMENT & PLAYER ENCOUNTERS ---
        const isFrozen = activeEffects.freezeRemaining > 0;

        curGhosts.forEach((ghost) => {
          if (isFrozen) {
            ghost.isFrozen = true;
            return;
          }
          ghost.isFrozen = false;

          // Ghost AI Target computation
          let targetX = newX;
          let targetY = newY;

          if (ghost.type === 'AMBUSHER') {
            // Predict ahead of player direction
            const lookAhead = tileSize * 3;
            if (curPlayer.facing === 'UP') targetY -= lookAhead;
            else if (curPlayer.facing === 'DOWN') targetY += lookAhead;
            else if (curPlayer.facing === 'LEFT') targetX -= lookAhead;
            else if (curPlayer.facing === 'RIGHT') targetX += lookAhead;
          } else if (ghost.type === 'PATROLLER') {
            // Roams between corners based on time
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

          // Steer towards target with collision sliding
          const edx = targetX - ghost.x;
          const edy = targetY - ghost.y;
          const dist = Math.hypot(edx, edy);

          if (dist > 1) {
            const stepX = (edx / dist) * ghost.speed;
            const stepY = (edy / dist) * ghost.speed;

            // Try X step
            if (!checkWallCollision(ghost.x + stepX, ghost.y, ghost.radius)) {
              ghost.x += stepX;
            }
            // Try Y step
            if (!checkWallCollision(ghost.x, ghost.y + stepY, ghost.radius)) {
              ghost.y += stepY;
            }

            // Eye direction
            ghost.eyeOffset = {
              x: Math.max(-2, Math.min(2, edx / (dist || 1) * 2)),
              y: Math.max(-2, Math.min(2, edy / (dist || 1) * 2)),
            };
          }

          // Check collision with player
          const ghostPlayerDist = Math.hypot(newX - ghost.x, newY - ghost.y);
          if (ghostPlayerDist < curPlayer.radius + ghost.radius - 2) {
            if (invulnerableTimerRef.current <= 0) {
              if (activeEffects.hasShield) {
                // Shield absorbs hit!
                activeEffects.hasShield = false;
                invulnerableTimerRef.current = 1000;
                sound.playShieldPopSound();
                screenShakeRef.current = 6;
                addParticles(curPlayer.x, curPlayer.y, '#3b82f6', 20, 4);
                addFloatingText(curPlayer.x, curPlayer.y - 10, 'SHIELD SAVED!', '#38bdf8');
                // Push ghost back
                ghost.x += (ghost.x - newX) * 2;
                ghost.y += (ghost.y - newY) * 2;
              } else {
                // Player lost life!
                invulnerableTimerRef.current = 1500;
                screenShakeRef.current = 14;
                sound.playHitSound();
                addParticles(curPlayer.x, curPlayer.y, '#ef4444', 25, 4.5);
                addFloatingText(curPlayer.x, curPlayer.y - 10, '-1 LIFE', '#ef4444');
                onPlayerHit();
              }
            }
          }
        });
      }

      // --- 7. RENDER SCREEN ---
      ctx.save();

      // Screen Shake
      if (screenShakeRef.current > 0) {
        const shakeX = (Math.random() - 0.5) * screenShakeRef.current;
        const shakeY = (Math.random() - 0.5) * screenShakeRef.current;
        ctx.translate(shakeX, shakeY);
        screenShakeRef.current = Math.max(0, screenShakeRef.current - 1);
      }

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      const palette = getThemePalette(theme);

      // Draw Grid & Walls
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

            // Subtle inner pixel brick bevel
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(x + 2, y + 2, tileSize - 4, 2);
          } else {
            ctx.fillStyle = palette.floorFill;
            ctx.fillRect(x, y, tileSize, tileSize);

            // Subtle floor grid dots
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

          // Shiny highlight center
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

          // Icon text inside badge
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
        // Glowing active vortex
        const portalAngle = time * 2;
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 18;

        // Outer pulsing ring
        const pulse = 14 + Math.sin(time * 4) * 2.5;
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(curPortal.x, curPortal.y, pulse, 0, Math.PI * 2);
        ctx.stroke();

        // Inner vortex
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(curPortal.x, curPortal.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Swirling rays
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
        // Inactive locked gate
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(curPortal.x, curPortal.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Lock icon
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

        // Ghost dome head
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(0, -2, ghost.radius, Math.PI, 0, false);
        // Ghost tentacle skirt
        ctx.lineTo(ghost.radius, ghost.radius - 2 + skirtWiggle);
        ctx.lineTo(ghost.radius / 2, ghost.radius - 5 - skirtWiggle);
        ctx.lineTo(0, ghost.radius - 2 + skirtWiggle);
        ctx.lineTo(-ghost.radius / 2, ghost.radius - 5 - skirtWiggle);
        ctx.lineTo(-ghost.radius, ghost.radius - 2 + skirtWiggle);
        ctx.closePath();
        ctx.fill();

        // Eyes
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        // Left Eye
        ctx.beginPath();
        ctx.arc(-3.5 + ghost.eyeOffset.x * 0.5, -3 + ghost.eyeOffset.y * 0.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Right Eye
        ctx.beginPath();
        ctx.arc(3.5 + ghost.eyeOffset.x * 0.5, -3 + ghost.eyeOffset.y * 0.5, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Pupils
        ctx.fillStyle = isGhostFrozen ? '#0284c7' : '#0f172a';
        ctx.beginPath();
        ctx.arc(-3.5 + ghost.eyeOffset.x, -3 + ghost.eyeOffset.y, 1.3, 0, Math.PI * 2);
        ctx.arc(3.5 + ghost.eyeOffset.x, -3 + ghost.eyeOffset.y, 1.3, 0, Math.PI * 2);
        ctx.fill();

        if (isGhostFrozen) {
          // Frost snowflake symbol on ghost
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
      const isFlickering = isInvulnerable && Math.floor(currentTime / 100) % 2 === 0;

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

        // Player Body (Retro Cyber Runner / Neon Orb with Visor)
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#00ffcc';
        ctx.beginPath();
        ctx.arc(0, 0, curPlayer.radius, 0, Math.PI * 2);
        ctx.fill();

        // Player Visor facing direction
        ctx.fillStyle = '#0b0c10';
        let vx = 0,
          vy = 0;
        if (curPlayer.facing === 'RIGHT') vx = 3.5;
        else if (curPlayer.facing === 'LEFT') vx = -3.5;
        else if (curPlayer.facing === 'UP') vy = -3.5;
        else if (curPlayer.facing === 'DOWN') vy = 3.5;

        ctx.beginPath();
        ctx.arc(vx, vy, 3.2, 0, Math.PI * 2);
        ctx.fill();

        // Visor core shine
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(vx + 0.8, vy - 0.8, 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Draw Particles
      particlesRef.current.forEach((p, idx) => {
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
      // Filter out dead particles
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
    isPlaying,
    isPaused,
    grid,
    rows,
    cols,
    tileSize,
    theme,
    difficulty,
    checkWallCollision,
    onCoinCollected,
    onPowerUpCollected,
    onPortalReached,
    onPlayerHit,
    onCoinsDepleted,
    onUpdatePlayerPos,
  ]);

  return (
    <div
      className={`relative rounded-lg arcade-bezel bg-[#0a0a0e] overflow-hidden ${
        crtEffect ? 'crt-scanlines crt-vignette' : ''
      }`}
      style={{ width: canvasWidth, height: canvasHeight, maxWidth: '100%' }}
    >
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="block mx-auto cursor-crosshair touch-none"
      />
    </div>
  );
};
