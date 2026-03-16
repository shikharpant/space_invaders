import { Entity, EntityType, Position, Size, TrailPoint } from './types';

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
  
  // Trail for gravity well visualization (only used by player bullets)
  trail: TrailPoint[] = [];
  readonly maxTrailLength: number = 5;

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

  /**
   * Add current position to trail (for gravity well visualization)
   */
  updateTrail(): void {
    // Only track trails for player bullets
    if (this.projType !== ProjectileType.PLAYER_BULLET) return;
    
    this.trail.push({
      x: this.pos.x,
      y: this.pos.y,
      opacity: 1.0
    });
    
    // Limit trail length and fade old points
    while (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }
    
    // Fade older trail points
    for (let i = 0; i < this.trail.length - 1; i++) {
      this.trail[i].opacity *= 0.85;
    }
  }

  /**
   * Clear the trail when projectile dies or resets
   */
  clearTrail(): void {
    this.trail = [];
  }

  update(canvasSize: Size, deltaTime: number) {
    const speedMultiplier = 60 * deltaTime;
    
    // Update trail before moving (captures position history)
    this.updateTrail();
    
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
    
    // Draw trail first (so it appears behind the bullet)
    if (this.trail.length > 1 && this.projType === ProjectileType.PLAYER_BULLET) {
      this.drawTrail(ctx);
    }

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

  /**
   * Draw the bullet trail as a fading line connecting previous positions
   */
  private drawTrail(ctx: CanvasRenderingContext2D): void {
    if (this.trail.length < 2) return;
    
    ctx.beginPath();
    ctx.moveTo(this.trail[0].x, this.trail[0].y);
    
    // Draw lines between trail points with decreasing opacity
    for (let i = 1; i < this.trail.length; i++) {
      const point = this.trail[i];
      ctx.lineTo(point.x, point.y);
      
      // Stroke each segment individually with its own opacity
      ctx.strokeStyle = this.color;
      ctx.globalAlpha = point.opacity * 0.6;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    }
    
    // Also draw a smooth curve through all points
    ctx.beginPath();
    ctx.moveTo(this.trail[0].x, this.trail[0].y);
    
    for (let i = 1; i < this.trail.length - 1; i++) {
      const p0 = this.trail[i];
      const p1 = this.trail[i + 1];
      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;
      ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
    }
    
    if (this.trail.length > 1) {
      const last = this.trail[this.trail.length - 1];
      const secondLast = this.trail[this.trail.length - 2];
      ctx.quadraticCurveTo(
        secondLast.x, 
        secondLast.y, 
        last.x, 
        last.y
      );
    }
    
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}