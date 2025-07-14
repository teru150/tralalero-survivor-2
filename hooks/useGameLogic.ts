import { useState, useEffect, useReducer, useCallback, useRef } from 'react';
import type { PlayerState, EnemyState, ProjectileState, PickupState, Upgrade, Weapon, DevConfig, GameLogicState } from '../types';
import { GameStatus, EnemyType, PickupType, ProjectileType } from '../types';
import { 
    PLAYER_INITIAL_STATE, GAME_WIDTH, GAME_HEIGHT, WORLD_WIDTH, ENEMY_STATS, SPAWN_INTERVAL, MAX_ENEMIES, IFRAME_DURATION, WEAPONS, UPGRADES, 
    PLAYER_SNEAKER_OFFSETS, FREEZE_DURATION, BOSS_SPAWN_TIME, BOSS_ATTACK_COOLDOWN, BOSS_MISSILE_DAMAGE, BOSS_MISSILE_SPEED, BOSS_WARNING_TIME,
    PICKUP_DROP_RATE_CHANGE_TIME, BASE_MAGNET_DROP_CHANCE, BASE_FREEZE_BOMB_DROP_CHANCE, LATE_GAME_MAGNET_DROP_CHANCE, LATE_GAME_FREEZE_BOMB_DROP_CHANCE,
    MINI_BOSS_SPAWN_START_TIME, MINI_BOSS_SPAWN_INTERVAL, MINI_BOSS_ATTACK_COOLDOWN, MINI_BOSS_PROJECTILE_DAMAGE, MINI_BOSS_PROJECTILE_SPEED, MINI_BOSS_PROJECTILE_LIFESPAN,
    BOSS_MISSILE_EXPLOSION_RADIUS, BOSS_MISSILE_EXPLOSION_TRIGGER_RADIUS, BOSS_MISSILE_EXPLOSION_DAMAGE_MULTIPLIER, EXPLOSION_DURATION
} from '../constants';

type GameAction =
  | { type: 'GAME_TICK'; payload: { deltaTime: number; keys: Set<string>; time: number } }
  | { type: 'PROCESS_LEVEL_UPS' }
  | { type: 'LEVEL_UP'; payload: Upgrade }
  | { type: 'RESET'; payload?: GameLogicState }
  | { type: 'SPAWN_BOSS' }
  | { type: 'ADD_ENEMIES'; payload: EnemyState[] };

const baseInitialState: GameLogicState = {
  player: {
    ...PLAYER_INITIAL_STATE,
    id: 'player',
    position: { x: WORLD_WIDTH / 2, y: GAME_HEIGHT / 2 },
    weapons: [{ ...WEAPONS.FORK, id: `weapon_${crypto.randomUUID()}`, lastFired: 0, level: 1, firePointIndex: 0, projectileCount: 1 }],
  },
  enemies: [],
  projectiles: [],
  pickups: [],
  explosions: [],
  freezeTimer: 0,
  bossAttackTimer: 0,
};

function getInitialState(devConfig?: DevConfig): GameLogicState {
    let state: GameLogicState = JSON.parse(JSON.stringify(baseInitialState));
    if (devConfig) {
        if (devConfig.disableFork) {
            state.player.weapons = state.player.weapons.filter(w => w.name !== "Spinning Fork");
        }
        if (devConfig.invincible) {
            state.player.invincible = true;
        }
        if (devConfig.playerSpeed) {
            state.player.speed = devConfig.playerSpeed;
        }
        if (typeof devConfig.playerRegenRate === 'number') {
            state.player.regenRate = devConfig.playerRegenRate;
        }
        
        const fork = state.player.weapons.find((w: Weapon) => w.name === "Spinning Fork");
        if (fork) {
            if (devConfig.forkCooldown) {
                fork.cooldown = devConfig.forkCooldown;
            }
            if (devConfig.forkProjectileCount) {
                fork.projectileCount = devConfig.forkProjectileCount;
            }
        }

        if (devConfig.garlicArea) {
            const garlicExists = state.player.weapons.some((w: Weapon) => w.name === "Garlic Aura");
            if (!garlicExists) {
                 state.player.weapons.push({ ...WEAPONS.GARLIC, id: `weapon_${crypto.randomUUID()}`, lastFired: 0, level: 1 });
            }
            const garlic = state.player.weapons.find((w: Weapon) => w.name === "Garlic Aura");
            if(garlic) {
                garlic.area = devConfig.garlicArea;
            }
        }
        
        if (devConfig.startAtBoss) {
            const stats = ENEMY_STATS[EnemyType.BOSS];
            const cameraX = Math.max(0, Math.min(WORLD_WIDTH - GAME_WIDTH, state.player.position.x - GAME_WIDTH / 2));
            const boss: EnemyState = {
                ...stats,
                id: `enemy_BOSS`,
                position: { x: cameraX + GAME_WIDTH / 2, y: -stats.size },
                velocity: { x: 0, y: 0 },
            };
            state.enemies = [boss];
        }
    }
    return state;
}

function gameReducer(state: GameLogicState, action: GameAction): GameLogicState {
  switch (action.type) {
    case 'GAME_TICK': {
      const { deltaTime, keys, time } = action.payload;
      const now = time; // Use game time for consistency

      let player = JSON.parse(JSON.stringify(state.player));
      let freezeTimer = state.freezeTimer;
      let bossAttackTimer = state.bossAttackTimer;
      
      if (freezeTimer > 0) {
        freezeTimer = Math.max(0, freezeTimer - deltaTime);
      }
      const boss = state.enemies.find(e => e.type === EnemyType.BOSS);
      if (boss) {
        bossAttackTimer = Math.max(0, bossAttackTimer - deltaTime);
      }

      if (player.regenRate && player.regenRate > 0) {
          player.health = Math.min(player.maxHealth, player.health + player.maxHealth * player.regenRate * deltaTime);
      }
      
      const speed = player.speed * deltaTime;
      const newPos = { ...player.position };
      if (keys.has('w')) newPos.y -= speed;
      if (keys.has('s')) newPos.y += speed;
      if (keys.has('a')) newPos.x -= speed;
      if (keys.has('d')) newPos.x += speed;

      player.position.x = Math.max(player.size / 2, Math.min(WORLD_WIDTH - player.size / 2, newPos.x));
      player.position.y = Math.max(player.size / 2, Math.min(GAME_HEIGHT - player.size / 2, newPos.y));
      
      if (player.iFrames > 0) {
        player.iFrames = Math.max(0, player.iFrames - deltaTime);
      }
      
      const isBossEnraged = boss ? boss.health < boss.maxHealth / 3 : false;
      let nextExplosions = state.explosions
          .map(e => ({ ...e, duration: e.duration - deltaTime }))
          .filter(e => e.duration > 0);

      const projectilesToProcess = state.projectiles.filter(p => {
          if (p.type === ProjectileType.BOSS && isBossEnraged) {
              const distToPlayer = Math.hypot(p.position.x - player.position.x, p.position.y - player.position.y);
              if (distToPlayer < BOSS_MISSILE_EXPLOSION_TRIGGER_RADIUS) {
                  nextExplosions.push({ id: `explosion_${crypto.randomUUID()}`, position: p.position, size: BOSS_MISSILE_EXPLOSION_RADIUS * 2, duration: EXPLOSION_DURATION });
                  if (distToPlayer < (player.size/2 + BOSS_MISSILE_EXPLOSION_RADIUS) && player.iFrames <= 0 && !player.invincible) {
                      player.health -= BOSS_MISSILE_DAMAGE * BOSS_MISSILE_EXPLOSION_DAMAGE_MULTIPLIER;
                      player.iFrames = IFRAME_DURATION;
                  }
                  return false; // Remove missile
              }
          }
          return true;
      });

      let xpGained = 0;
      let magnetCollected = false;
      let pickupsAfterCollection = state.pickups.filter(pickup => {
        const dist = Math.hypot(player.position.x - pickup.position.x, player.position.y - pickup.position.y);
        if (dist < player.size / 2) {
          if (pickup.type === PickupType.XP) {
            xpGained += pickup.value || 0;
          } else if (pickup.type === PickupType.MAGNET) {
            magnetCollected = true;
          } else if (pickup.type === PickupType.FREEZE_BOMB) {
            freezeTimer = FREEZE_DURATION;
          }
          return false;
        }
        return true;
      });

      if (xpGained > 0) player.xp += xpGained;

      let nextPickups = magnetCollected
        ? pickupsAfterCollection.map(p => p.type === PickupType.XP ? { ...p, magnetized: true } : p)
        : pickupsAfterCollection;

      nextPickups = nextPickups.map(orb => {
        const dx = player.position.x - orb.position.x;
        const dy = player.position.y - orb.position.y;
        const dist = Math.hypot(dx, dy);
        
        let newOrbPos = {...orb.position};
        if (dist < player.pickupRadius || orb.magnetized) {
            if (dist > 1) {
              newOrbPos.x += (dx / dist) * 800 * deltaTime;
              newOrbPos.y += (dy / dist) * 800 * deltaTime;
            }
        }
        return {...orb, position: newOrbPos};
      });
      
      // --- WEAPON AND DAMAGE LOGIC ---
      const newProjectiles: ProjectileState[] = [];
      const damageToEnemies = new Map<string, number>();

      const updatedWeapons = player.weapons.map((weapon: Weapon) => {
        if (now - weapon.lastFired <= weapon.cooldown) {
          return weapon;
        }
        const newWeaponState = { ...weapon, lastFired: now };
        
        if (weapon.name === "Spinning Fork") {
          const closestEnemy = [...state.enemies].sort((a, b) => {
              const distA = Math.hypot(a.position.x - player.position.x, a.position.y - player.position.y);
              const distB = Math.hypot(b.position.x - player.position.x, b.position.y - player.position.y);
              return distA - distB;
          })[0];
          
          let angle = Math.random() * 2 * Math.PI;
          if(closestEnemy) {
              angle = Math.atan2(closestEnemy.position.y - player.position.y, closestEnemy.position.x - player.position.x);
          }
          const projectileCount = weapon.projectileCount || 1;
          const spreadAngle = Math.PI / 16;
          const firePointIndex = weapon.firePointIndex || 0;
          const offset = PLAYER_SNEAKER_OFFSETS[firePointIndex];
          const startPosition = {
              x: player.position.x + offset.x,
              y: player.position.y + offset.y,
          };
          
          for (let i = 0; i < projectileCount; i++) {
            const currentAngle = angle - (spreadAngle * (projectileCount - 1) / 2) + (i * spreadAngle);
            newProjectiles.push({
                id: `proj_${crypto.randomUUID()}`, type: ProjectileType.PLAYER, weaponId: weapon.id, position: startPosition, size: 30,
                velocity: { x: Math.cos(currentAngle) * (weapon.projectileSpeed || 500), y: Math.sin(currentAngle) * (weapon.projectileSpeed || 500) },
                damage: weapon.damage || 10, lifespan: weapon.projectileLifespan || 1, angle: (currentAngle * 180) / Math.PI,
            });
          }
          newWeaponState.firePointIndex = (firePointIndex + 1) % PLAYER_SNEAKER_OFFSETS.length;
        }
        
        if (weapon.name === "Garlic Aura" && weapon.auraActive) {
          for (const e of state.enemies) {
              if (Math.hypot(player.position.x - e.position.x, player.position.y - e.position.y) < (weapon.area || 100)) {
                  damageToEnemies.set(e.id, (damageToEnemies.get(e.id) || 0) + (weapon.damage || 5));
              }
          }
        }
        return newWeaponState;
      });
      player.weapons = updatedWeapons;
      
      let enemiesWithAttacks = state.enemies.map(e => {
        if (e.type === EnemyType.MINI_BOSS && now - (e.lastAttackTime || 0) > MINI_BOSS_ATTACK_COOLDOWN) {
            const angle = Math.atan2(player.position.y - e.position.y, player.position.x - e.position.x);
            newProjectiles.push({
                id: `proj_${crypto.randomUUID()}`,
                type: ProjectileType.MINI_BOSS_AURA,
                weaponId: 'miniboss_aura',
                position: { ...e.position },
                size: 60,
                velocity: { x: Math.cos(angle) * MINI_BOSS_PROJECTILE_SPEED, y: Math.sin(angle) * MINI_BOSS_PROJECTILE_SPEED },
                damage: MINI_BOSS_PROJECTILE_DAMAGE,
                lifespan: MINI_BOSS_PROJECTILE_LIFESPAN,
                angle: (angle * 180) / Math.PI + 90,
            });
            return {...e, lastAttackTime: now };
        }
        return e;
      });

      if (boss && bossAttackTimer <= 0) {
        bossAttackTimer = BOSS_ATTACK_COOLDOWN;
        const angle = Math.atan2(player.position.y - boss.position.y, player.position.x - boss.position.x);
        newProjectiles.push({
            id: `proj_${crypto.randomUUID()}`,
            type: ProjectileType.BOSS,
            weaponId: 'boss_missile',
            position: { ...boss.position },
            size: 40,
            velocity: { x: Math.cos(angle) * BOSS_MISSILE_SPEED, y: Math.sin(angle) * BOSS_MISSILE_SPEED },
            damage: BOSS_MISSILE_DAMAGE,
            lifespan: 4,
            angle: (angle * 180) / Math.PI,
        });
      }
      
      let nextProjectiles = [...projectilesToProcess, ...newProjectiles];
      
      nextProjectiles = nextProjectiles
        .map(p => ({
          ...p,
          position: { x: p.position.x + p.velocity.x * deltaTime, y: p.position.y + p.velocity.y * deltaTime },
          lifespan: p.lifespan - deltaTime,
          angle: p.type === ProjectileType.PLAYER ? p.angle + 360 * deltaTime : p.angle,
        }))
        .filter(p => p.lifespan > 0);

      nextProjectiles = nextProjectiles.filter(p => {
        if (p.type !== ProjectileType.PLAYER) return true;
        let hit = false;
        for (const e of enemiesWithAttacks) {
          if (Math.hypot(p.position.x - e.position.x, p.position.y - e.position.y) < (p.size / 2 + e.size / 2)) {
            damageToEnemies.set(e.id, (damageToEnemies.get(e.id) || 0) + p.damage);
            hit = true;
          }
        }
        return !hit;
      });


      if (!player.invincible && player.iFrames <= 0) {
        for (const e of enemiesWithAttacks) {
          if (Math.hypot(player.position.x - e.position.x, player.position.y - e.position.y) < (player.size / 2 + e.size / 2)) {
            player.health -= e.damage;
            player.iFrames = IFRAME_DURATION;
            break; 
          }
        }
        if (player.iFrames <= 0) {
            for (const p of nextProjectiles) {
                if ((p.type === ProjectileType.BOSS && !isBossEnraged) || p.type === ProjectileType.MINI_BOSS_AURA) {
                    if (Math.hypot(player.position.x - p.position.x, player.position.y - p.position.y) < (player.size/2 + p.size/2)) {
                        player.health -= p.damage;
                        player.iFrames = IFRAME_DURATION;
                        p.lifespan = 0; // remove projectile on hit
                        break;
                    }
                }
            }
        }
      }
      nextProjectiles = nextProjectiles.filter(p => p.lifespan > 0);

      const newPickupsFromDeaths: PickupState[] = [];
      let nextEnemies = enemiesWithAttacks.map(e => ({
          ...e,
          health: e.health - (damageToEnemies.get(e.id) || 0)
      })).filter(e => {
        if (e.health <= 0) {
          if (e.type === EnemyType.BOSS) return false;

          const isLateGame = time > PICKUP_DROP_RATE_CHANGE_TIME;
          const freezeChance = isLateGame ? LATE_GAME_FREEZE_BOMB_DROP_CHANCE : BASE_FREEZE_BOMB_DROP_CHANCE;
          const magnetChance = isLateGame ? LATE_GAME_MAGNET_DROP_CHANCE : BASE_MAGNET_DROP_CHANCE;
          
          const rand = Math.random();
          if (rand < freezeChance) {
            newPickupsFromDeaths.push({ id: `pickup_${crypto.randomUUID()}`, type: PickupType.FREEZE_BOMB, position: e.position, size: 32 });
          } else if (rand < freezeChance + magnetChance) {
            newPickupsFromDeaths.push({ id: `pickup_${crypto.randomUUID()}`, type: PickupType.MAGNET, position: e.position, size: 32 });
          } else {
            newPickupsFromDeaths.push({ id: `pickup_${crypto.randomUUID()}`, type: PickupType.XP, position: e.position, size: 24, value: e.xpValue });
          }
          return false;
        }
        return true;
      });
      nextPickups.push(...newPickupsFromDeaths);
      
      nextEnemies = nextEnemies.map(e => {
        if (e.type === EnemyType.BOSS) {
            const cameraX = Math.max(0, Math.min(WORLD_WIDTH - GAME_WIDTH, player.position.x - GAME_WIDTH / 2));
            const targetX = cameraX + GAME_WIDTH / 2;
            const dy = (player.position.y / 2) - e.position.y;
            const dist = Math.hypot(targetX - e.position.x, dy);
            if (dist > 1) {
              const newPos = {
                x: e.position.x + ((targetX - e.position.x)/dist) * e.speed * deltaTime,
                y: e.position.y + (dy/dist) * e.speed * deltaTime,
              };
              return {...e, position: newPos};
            }
            return e;
        }

        if (freezeTimer > 0 && e.type !== EnemyType.MINI_BOSS) return e;

        const dx = player.position.x - e.position.x;
        const dy = player.position.y - e.position.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1) {
            return {
              ...e,
              velocity: { x: (dx / dist) * e.speed, y: (dy / dist) * e.speed },
              position: { x: e.position.x + (dx / dist) * e.speed * deltaTime, y: e.position.y + (dy / dist) * e.speed * deltaTime }
            };
        }
        return e;
      });

      return { player, enemies: nextEnemies, projectiles: nextProjectiles, pickups: nextPickups, explosions: nextExplosions, freezeTimer, bossAttackTimer };
    }
    case 'PROCESS_LEVEL_UPS': {
      let playerCopy = { ...state.player };
      if (playerCopy.xp < playerCopy.xpToNextLevel) {
          return state;
      }

      while (playerCopy.xp >= playerCopy.xpToNextLevel) {
          playerCopy.xp -= playerCopy.xpToNextLevel;
          playerCopy.level += 1;
          
          if (playerCopy.level < 4) {
            playerCopy.xpToNextLevel = Math.floor(playerCopy.xpToNextLevel * 1.5);
          } else {
            playerCopy.xpToNextLevel = Math.floor(playerCopy.xpToNextLevel * 1.2 + 3);
          }
      }
      return { ...state, player: playerCopy };
    }
    case 'LEVEL_UP': {
      const newPlayerState = action.payload.apply(state.player);
      // Ensure weapon level is incremented on upgrade
      const upgradedWeaponName = action.payload.title.includes("Fork") ? "Spinning Fork" : action.payload.title.includes("Garlic") ? "Garlic Aura" : null;
      if (upgradedWeaponName) {
        newPlayerState.weapons = newPlayerState.weapons.map(w => {
            if (w.name === upgradedWeaponName && !action.payload.id.startsWith("add_")) {
                // Don't increment level for adding a new weapon
                return { ...w, level: w.level + 1 };
            }
            return w;
        });
      }
      return { ...state, player: newPlayerState };
    }
      
    case 'SPAWN_BOSS': {
        const stats = ENEMY_STATS[EnemyType.BOSS];
        const cameraX = Math.max(0, Math.min(WORLD_WIDTH - GAME_WIDTH, state.player.position.x - GAME_WIDTH / 2));
        const boss: EnemyState = {
            ...stats,
            id: `enemy_BOSS`,
            position: { x: cameraX + GAME_WIDTH / 2, y: -stats.size },
            velocity: { x: 0, y: 0 },
        };
        return { ...state, enemies: [...state.enemies, boss]};
    }

    case 'ADD_ENEMIES': {
      if (state.enemies.length >= MAX_ENEMIES) {
        return state;
      }
      const enemiesToAdd = action.payload.slice(0, MAX_ENEMIES - state.enemies.length);
      return {
        ...state,
        enemies: [...state.enemies, ...enemiesToAdd],
      };
    }

    case 'RESET':
      return getInitialState(action.payload ? (action.payload as any).devConfig : undefined);
      
    default:
      return state;
  }
}

export const useGameLogic = (devConfig?: DevConfig) => {
  const [gameState, dispatch] = useReducer(gameReducer, devConfig, getInitialState);
  const [status, setStatus] = useState<GameStatus>(GameStatus.PLAYING);
  const keysPressedRef = useRef<Set<string>>(new Set());
  const [time, setTime] = useState(devConfig?.startAtBoss ? BOSS_SPAWN_TIME - BOSS_WARNING_TIME - 0.1 : 0);
  const [spawnTimer, setSpawnTimer] = useState(0);
  const lastMiniBossSpawnTimeRef = useRef(0);
  const [levelUpOptions, setLevelUpOptions] = useState<Upgrade[]>([]);
  const [bossActive, setBossActive] = useState(devConfig?.startAtBoss || false);
  const [bossWarningActive, setBossWarningActive] = useState(false);
  
  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  
  useEffect(() => {
    dispatch({ type: 'RESET', payload: { ...getInitialState(devConfig), devConfig } as any });
  }, [JSON.stringify(devConfig)]);

  const chooseUpgrade = useCallback((upgrade: Upgrade) => {
    dispatch({ type: 'LEVEL_UP', payload: upgrade });
    setLevelUpOptions([]);
    setStatus(GameStatus.PLAYING);
  }, [dispatch]);

  const skipUpgrade = useCallback(() => {
    setLevelUpOptions([]);
    setStatus(GameStatus.PLAYING);
  }, []);
  
  const gameLoop = useCallback((currentTime: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = currentTime;
      gameLoopRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const deltaTime = (currentTime - lastTimeRef.current) / 1000;
    lastTimeRef.current = currentTime;

    if (status === GameStatus.PLAYING) {
        const newTime = time + deltaTime;
        setTime(newTime);
        setSpawnTimer(st => st + deltaTime);

        if (!bossActive && !bossWarningActive && newTime >= BOSS_SPAWN_TIME - BOSS_WARNING_TIME) {
            setBossWarningActive(true);
        }

        dispatch({ type: 'GAME_TICK', payload: { deltaTime, keys: keysPressedRef.current, time: newTime } });
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [status, time, bossActive, bossWarningActive, dispatch]);

  useEffect(() => {
    if (status !== GameStatus.PLAYING) return;
    
    // Regular enemy spawning
    if (spawnTimer > SPAWN_INTERVAL && !bossActive) {
      setSpawnTimer(0);
      const numToSpawn = 1 + Math.floor(time / 12.5);
      const newEnemies: EnemyState[] = [];
      const cameraX = Math.max(0, Math.min(WORLD_WIDTH - GAME_WIDTH, gameState.player.position.x - GAME_WIDTH / 2));

      for(let i=0; i < numToSpawn; i++) {
        const edge = Math.floor(Math.random() * 4);
        let pos = { x: 0, y: 0 };
        switch (edge) {
          case 0: pos = { x: cameraX + Math.random() * GAME_WIDTH, y: -50 }; break;
          case 1: pos = { x: cameraX + Math.random() * GAME_WIDTH, y: GAME_HEIGHT + 50 }; break;
          case 2: pos = { x: cameraX - 50, y: Math.random() * GAME_HEIGHT }; break;
          case 3: pos = { x: cameraX + GAME_WIDTH + 50, y: Math.random() * GAME_HEIGHT }; break;
        }
        
        const enemyType = Math.random() > 0.7 ? EnemyType.OCTOPUS : EnemyType.PUFFERFISH;
        const stats = ENEMY_STATS[enemyType];
        const health = stats.health + Math.floor(time / 20) * 8; // Buffed health scaling
        const enemy: EnemyState = {
          ...stats,
          id: `enemy_${crypto.randomUUID()}`,
          position: pos,
          velocity: { x: 0, y: 0 },
          health: health,
          maxHealth: health,
        };
        newEnemies.push(enemy);
      }
      dispatch({ type: 'ADD_ENEMIES', payload: newEnemies });
    }

    // Mini-boss spawning
    if (!bossActive && time >= MINI_BOSS_SPAWN_START_TIME && time - lastMiniBossSpawnTimeRef.current >= MINI_BOSS_SPAWN_INTERVAL) {
        lastMiniBossSpawnTimeRef.current = time;
        const stats = ENEMY_STATS[EnemyType.MINI_BOSS];
        const cameraX = Math.max(0, Math.min(WORLD_WIDTH - GAME_WIDTH, gameState.player.position.x - GAME_WIDTH / 2));
        const edge = Math.floor(Math.random() * 4);
        let pos = { x: 0, y: 0 };
        switch (edge) {
          case 0: pos = { x: cameraX + Math.random() * GAME_WIDTH, y: -50 }; break;
          case 1: pos = { x: cameraX + Math.random() * GAME_WIDTH, y: GAME_HEIGHT + 50 }; break;
          case 2: pos = { x: cameraX - 50, y: Math.random() * GAME_HEIGHT }; break;
          case 3: pos = { x: cameraX + GAME_WIDTH + 50, y: Math.random() * GAME_HEIGHT }; break;
        }
        
        const health = 300 + ((Math.max(0, time - 120) / (BOSS_SPAWN_TIME - MINI_BOSS_SPAWN_START_TIME)) * 700);
        const miniBoss: EnemyState = {
            ...stats,
            id: `enemy_mini_boss_${crypto.randomUUID()}`,
            position: pos,
            velocity: { x: 0, y: 0 },
            health: health,
            maxHealth: health,
            lastAttackTime: 0,
        };
        dispatch({ type: 'ADD_ENEMIES', payload: [miniBoss] });
    }

  }, [spawnTimer, status, time, gameState.player.position.x, bossActive]);

  useEffect(() => {
    if (status === GameStatus.PLAYING && !bossActive && time >= BOSS_SPAWN_TIME) {
        setBossActive(true);
        setBossWarningActive(false);
        dispatch({ type: 'SPAWN_BOSS' });
    }
  }, [time, status, bossActive]);
  
  useEffect(() => {
    if (status === GameStatus.PLAYING && gameState.player.xp >= gameState.player.xpToNextLevel) {
        dispatch({ type: 'PROCESS_LEVEL_UPS' });
        setStatus(GameStatus.LEVEL_UP);
    }
  }, [status, gameState.player.xp, gameState.player.xpToNextLevel]);

  useEffect(() => {
      if (status === GameStatus.LEVEL_UP) {
          const { player } = gameState;
          const availableUpgrades = UPGRADES.filter(u => {
              if (u.isMaxed && u.isMaxed(player)) {
                  return false;
              }
              if (u.id.includes("_") && !u.id.startsWith("player_")) {
                  const weaponName = u.id.split("_")[0];
                  const friendlyName = Object.values(WEAPONS).find(w => w.name.toLowerCase().includes(weaponName))?.name;
                  if (!friendlyName) return true; // player stat upgrades don't have weapons
                  return player.weapons.some(w => w.name === friendlyName);
              }
              return true;
          });

          const options: Upgrade[] = [];
          if (availableUpgrades.length > 0) {
            const shuffled = [...availableUpgrades].sort(() => 0.5 - Math.random());
            for (const upgrade of shuffled) {
                if (options.length < 5) {
                    options.push(upgrade);
                }
            }
          }
          
          if (options.length > 0) {
            setLevelUpOptions(options);
          } else {
            setStatus(GameStatus.PLAYING);
          }
      }
  }, [status, gameState]);

  useEffect(() => {
    if (status !== GameStatus.PLAYING) return;
    
    if (gameState.player.health <= 0) {
      setStatus(GameStatus.GAME_OVER);
    } else if (bossActive && !gameState.enemies.some(e => e.type === EnemyType.BOSS)) {
      setStatus(GameStatus.GAME_CLEAR);
    }
  }, [status, gameState.player.health, gameState.enemies, bossActive]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    const keys = ['w', 'a', 's', 'd'];
    if (keys.includes(key)) {
      e.preventDefault();
      keysPressedRef.current.add(key);
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    const keys = ['w', 'a', 's', 'd'];
    if (keys.includes(key)) {
      e.preventDefault();
      keysPressedRef.current.delete(key);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    lastTimeRef.current = performance.now();
    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameLoop, handleKeyDown, handleKeyUp]);

  const cameraX = Math.max(0, Math.min(WORLD_WIDTH - GAME_WIDTH, gameState.player.position.x - GAME_WIDTH / 2));

  return { gameState, status, time, levelUpOptions, chooseUpgrade, skipUpgrade, cameraX, bossWarningActive };
};