export enum GameStatus {
  START_SCREEN,
  PLAYING,
  LEVEL_UP,
  GAME_OVER,
  GAME_CLEAR,
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface GameObject {
  id: string;
  position: Vector2D;
  size: number;
}

export interface PlayerState extends GameObject {
  health: number;
  maxHealth: number;
  speed: number;
  xp: number;
  level: number;
  xpToNextLevel: number;
  iFrames: number; // Invincibility frames
  pickupRadius: number;
  weapons: Weapon[];
  regenRate?: number; // Percentage of maxHealth per second
  invincible: boolean;
}

export enum EnemyType {
  PUFFERFISH,
  OCTOPUS,
  MINI_BOSS,
  BOSS,
}

export interface EnemyState extends GameObject {
  type: EnemyType;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  xpValue: number;
  velocity: Vector2D;
  lastAttackTime?: number;
}

export enum ProjectileType {
  PLAYER,
  BOSS,
  MINI_BOSS_AURA,
}

export interface ProjectileState extends GameObject {
  type: ProjectileType;
  weaponId: string;
  velocity: Vector2D;
  damage: number;
  lifespan: number;
  angle: number;
}

export enum PickupType {
  XP,
  MAGNET,
  FREEZE_BOMB,
}

export interface PickupState extends GameObject {
  type: PickupType;
  value?: number; // For XP orbs
  magnetized?: boolean; // For XP orbs when a magnet is picked up
}

export interface ExplosionState extends GameObject {
    duration: number;
}


export interface Weapon {
  id: string;
  level: number;
  name: string;
  cooldown: number;
  lastFired: number;
  // Weapon-specific properties
  projectileSpeed?: number;
  projectileLifespan?: number;
  damage?: number;
  area?: number;
  projectileCount?: number;
  // For aura weapons
  auraActive?: boolean;
  firePointIndex?: number;
}

export interface Upgrade {
  id: string;
  title: string;
  description: string;
  apply: (player: PlayerState) => PlayerState;
  isMaxed?: (player: PlayerState) => boolean;
}

export interface DevConfig {
    startAtBoss?: boolean;
    playerSpeed?: number;
    forkProjectileCount?: number;
    forkCooldown?: number;
    garlicArea?: number;
    playerRegenRate?: number;
    invincible?: boolean;
    disableFork?: boolean;
}

export interface GameLogicState {
  player: PlayerState;
  enemies: EnemyState[];
  projectiles: ProjectileState[];
  pickups: PickupState[];
  explosions: ExplosionState[];
  freezeTimer: number;
  bossAttackTimer: number;
}