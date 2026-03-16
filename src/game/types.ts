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
