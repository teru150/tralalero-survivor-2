
import type { PlayerState, Upgrade, Weapon, EnemyState } from './types';
import { EnemyType } from './types';

export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;
export const WORLD_WIDTH = GAME_WIDTH * 3; // World is 3x wider than the screen

// Player
export const PLAYER_INITIAL_STATE: Omit<PlayerState, 'id' | 'position' | 'weapons'> = {
  size: 96, // Increased size for new sprite
  health: 100,
  maxHealth: 100,
  speed: 450, // pixels per second (Increased from 400)
  xp: 0,
  level: 1,
  xpToNextLevel: 2, // Lowered for a faster first level up
  iFrames: 0,
  pickupRadius: 150,
  regenRate: 0,
  invincible: false,
};

export const IFRAME_DURATION = 1; // 1 second of invincibility

export const PLAYER_SNEAKER_OFFSETS = [
  { x: -24, y: 35 }, // Left sneaker
  { x: 24, y: 35 },  // Right sneaker
];


// Enemies
export const ENEMY_STATS: Record<EnemyType, Omit<EnemyState, 'id' | 'position' | 'velocity' | 'lastAttackTime'>> = {
  [EnemyType.PUFFERFISH]: {
    type: EnemyType.PUFFERFISH,
    size: 40,
    health: 10,
    maxHealth: 10,
    speed: 150,
    damage: 12, // Increased from 10
    xpValue: 2,
  },
  [EnemyType.OCTOPUS]: {
    type: EnemyType.OCTOPUS,
    size: 55,
    health: 30,
    maxHealth: 30,
    speed: 100,
    damage: 20, // Increased from 15
    xpValue: 10, // Increased XP for stronger mob
  },
  [EnemyType.MINI_BOSS]: {
    type: EnemyType.MINI_BOSS,
    size: 128,
    health: 300,
    maxHealth: 300,
    speed: 100,
    damage: 100,
    xpValue: 150,
  },
  [EnemyType.BOSS]: {
    type: EnemyType.BOSS,
    size: 256,
    health: 3500,
    maxHealth: 3500,
    speed: 150,
    damage: 70, // Collision damage
    xpValue: 0, // No XP, beating it wins the game
  }
};

export const SPAWN_INTERVAL = 2;
export const MAX_ENEMIES = 150;

export const MINI_BOSS_SPAWN_START_TIME = 120; // 2 minutes
export const MINI_BOSS_SPAWN_INTERVAL = 30; // seconds
export const MINI_BOSS_ATTACK_COOLDOWN = 1;
export const MINI_BOSS_PROJECTILE_DAMAGE = 40;
export const MINI_BOSS_PROJECTILE_SPEED = 450;
export const MINI_BOSS_PROJECTILE_LIFESPAN = 4;


export const BOSS_SPAWN_TIME = 270; // 4.5 minutes
export const BOSS_WARNING_TIME = 5; // 5 seconds before boss appears
export const BOSS_ATTACK_COOLDOWN = 0.3;
export const BOSS_MISSILE_DAMAGE = 65;
export const BOSS_MISSILE_SPEED = 800;
export const BOSS_MISSILE_EXPLOSION_TRIGGER_RADIUS = 120;
export const BOSS_MISSILE_EXPLOSION_RADIUS = 180;
export const BOSS_MISSILE_EXPLOSION_DAMAGE_MULTIPLIER = 0.6; // 3/5
export const EXPLOSION_DURATION = 0.5; // in seconds


// Pickups
export const PICKUP_DROP_RATE_CHANGE_TIME = 210; // 3.5 minutes
export const BASE_MAGNET_DROP_CHANCE = 0.004; // 0.4% chance (was 5%)
export const BASE_FREEZE_BOMB_DROP_CHANCE = 0.004; // 0.4% chance
export const LATE_GAME_MAGNET_DROP_CHANCE = 0.002; // 0.2% chance (was 2%)
export const LATE_GAME_FREEZE_BOMB_DROP_CHANCE = 0.002; // 0.2% chance
export const FREEZE_DURATION = 4; // 4 seconds


// Weapons
export const WEAPONS: Record<string, Omit<Weapon, 'id' | 'lastFired' | 'level'>> = {
  FORK: {
    name: "Spinning Fork",
    cooldown: 0.75,
    projectileSpeed: 600,
    projectileLifespan: 1.5,
    damage: 10,
    projectileCount: 1,
  },
  GARLIC: {
    name: "Garlic Aura",
    cooldown: 0.33, // Approx. 3 times per second
    damage: 35, // Buffed from 15
    area: 120, // radius
    auraActive: true,
  },
};

// Upgrades
export const UPGRADES: Upgrade[] = [
  // New Weapons
  {
    id: "add_garlic",
    title: "Mamma's Garlic",
    description: "A pungent aura damages nearby enemies.",
    apply: (player) => ({ ...player, weapons: [...player.weapons, { ...WEAPONS.GARLIC, id: `weapon_${crypto.randomUUID()}`, lastFired: 0, level: 1 }] }),
    isMaxed: (player) => player.weapons.some(w => w.name === "Garlic Aura"),
  },
  // Fork Upgrades
  {
    id: "fork_multishot",
    title: "More Forks!",
    description: "Fires an additional fork projectile.",
    apply: (player) => ({ ...player, weapons: player.weapons.map(w => w.name === "Spinning Fork" ? { ...w, projectileCount: (w.projectileCount || 1) + 1, level: w.level + 1 } : w) }),
    isMaxed: (player) => (player.weapons.find(w => w.name === "Spinning Fork")?.projectileCount || 0) >= 5,
  },
  {
    id: "fork_damage",
    title: "Sharper Fork",
    description: "Increases fork damage by 5.",
    apply: (player) => ({ ...player, weapons: player.weapons.map(w => w.name === "Spinning Fork" ? { ...w, damage: (w.damage || 0) + 5, level: w.level + 1 } : w) }),
  },
  {
    id: "fork_cooldown",
    title: "Faster Fork",
    description: "Reduces fork cooldown by 15%.",
    apply: (player) => ({ ...player, weapons: player.weapons.map(w => w.name === "Spinning Fork" ? { ...w, cooldown: w.cooldown * 0.85, level: w.level + 1 } : w) }),
  },
  // Garlic Upgrades
  {
    id: "garlic_damage",
    title: "Extra Stinky",
    description: "Garlic aura deals more damage.",
    apply: (player) => ({ ...player, weapons: player.weapons.map(w => w.name === "Garlic Aura" ? { ...w, damage: (w.damage || 0) + 8, level: w.level + 1 } : w) }),
  },
  {
    id: "garlic_cooldown",
    title: "Garlic Press",
    description: "Garlic aura attacks 20% faster.",
    apply: (player) => ({ ...player, weapons: player.weapons.map(w => w.name === "Garlic Aura" ? { ...w, cooldown: w.cooldown * 0.8, level: w.level + 1 } : w) }),
  },
  {
    id: "garlic_area",
    title: "Bigger Stink",
    description: "Increases garlic aura area of effect.",
    apply: (player) => ({ ...player, weapons: player.weapons.map(w => w.name === "Garlic Aura" ? { ...w, area: (w.area || 0) + 40, level: w.level + 1 } : w) }),
  },
  // Player Stats
  {
    id: "player_speed",
    title: "Speedy Sneakers",
    description: "Increases movement speed by 15%.",
    apply: (player) => ({ ...player, speed: player.speed * 1.15 }),
  },
  {
    id: "player_health",
    title: "Extra Anchovies",
    description: "Increases max health by 20.",
    apply: (player) => ({ ...player, maxHealth: player.maxHealth + 20, health: player.health + 20 }),
  },
  {
    id: "player_pickup",
    title: "Ravioli Magnet",
    description: "Increases item pickup radius.",
    apply: (player) => ({ ...player, pickupRadius: player.pickupRadius + 50 }),
  },
  {
    id: "player_regen",
    title: "Self-Repair Nanites",
    description: "Regenerate 2.5% of max HP per second. Can be stacked.",
    apply: (player) => ({ ...player, regenRate: (player.regenRate || 0) + 0.025 }),
    isMaxed: (player) => (player.regenRate || 0) >= 0.05, // Max at 5%
  },
];