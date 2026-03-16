export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export enum EntityType {
  PLAYER = 'PLAYER',
  ENEMY_SHIP = 'ENEMY_SHIP',
  MONSTER = 'MONSTER',
  METEOR = 'METEOR',
  PROJECTILE = 'PROJECTILE',
  SHOCK_BLAST = 'SHOCK_BLAST',
  GRAVITY_WELL = 'GRAVITY_WELL',
}

export interface Entity {
  id: string;
  type: EntityType;
  pos: Position;
  size: Size;
  hp: number;
  maxHp: number;
  speed: number;
  isDead: boolean;
  update: (canvasSize: Size, deltaTime: number) => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

// AIDirector interfaces
export interface PlayerStats {
  shotsFired: number;
  shotsHit: number;
  damageTaken: number;
  kills: number;
  lastKillTime: number;
  scoreGained: number;
}

export interface SpawnConfig {
  spawnInterval: number;      // ms between waves
  enemyDensity: number;       // enemies per wave
  monsterRatio: number;       // % of enemies that are monsters (0-1)
  meteorFrequency: number;    // chance of meteor spawn (0-1)
  enemyFireRate: number;      // how often enemies fire (shots per second)
}

// GravityWell interfaces
export interface TrailPoint {
  x: number;
  y: number;
  opacity: number;
}

export interface SpiralParticle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  lifeTime: number;
}