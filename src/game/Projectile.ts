import { Entity, EntityType, Position, Size } from './types';

export enum ProjectileType {
  PLAYER_BULLET = 'PLAYER_BULLET',
  ENEMY_BULLET = 'ENEMY_BULLET',
  FIRE_PARTICLE = 'FIRE_PARTICLE',
}

export class Projectile implements Entity {
  id: string;
  type = EntityType.PROJECTILE;
  pos: Position;
  size: Size;
  hp = 1;
  maxHp = 1;
  speed: number;
  isDead = false;

  velocity: { x: number; y: number };
  projType: ProjectileType;
  color: string;
  glowColor: string;
  lifeTime: number = 0; // For fire particles

  constructor(
    id: string,
    x: number,
    y: number,
    angle: number,
    speed: number,
    projType: ProjectileType,
    color: string = '#00FFFF'
  ) {
    this.id = id;
    this.pos = { x, y };
    this.projType = projType;
    this.speed = speed;
    this.color = color;
    this.glowColor = color;
    
    // Calculate velocity based on angle
    this.velocity = {
      x: Math.sin(angle) * speed,
      y: -Math.cos(angle) * speed,
    };

    this.size = projType === ProjectileType.FIRE_PARTICLE ? { width: 4, height: 4 } : { width: 4, height: 12 };
  }

  update(canvasSize: Size, deltaTime: number) {
    const speedMultiplier = 60 * deltaTime;
    this.pos.x += this.velocity.x * speedMultiplier;
    this.pos.y += this.velocity.y * speedMultiplier;
    this.lifeTime += deltaTime;

    // Check if out of bounds
    if (
      this.pos.x < 0 ||
      this.pos.x > canvasSize.width ||
      this.pos.y < 0 ||
      this.pos.y > canvasSize.height
    ) {
      this.isDead = true;
    }

    // Fire particles fade out
    if (this.projType === ProjectileType.FIRE_PARTICLE && this.lifeTime > 1.0) {
        this.isDead = true;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);

    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.glowColor;

    if (this.projType === ProjectileType.FIRE_PARTICLE) {
        // Draw fire circle
        const opacity = 1.0 - Math.min(this.lifeTime, 1.0);
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(0, 0, this.size.width, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Draw bullet rectangle
        const angle = Math.atan2(this.velocity.x, -this.velocity.y);
        ctx.rotate(angle);
        ctx.fillRect(-this.size.width / 2, -this.size.height / 2, this.size.width, this.size.height);
    }

    ctx.restore();
  }
}
