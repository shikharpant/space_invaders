import { Entity, EntityType, Position, Size } from './types';

export class ShockBlast implements Entity {
  id: string;
  type = EntityType.SHOCK_BLAST;
  pos: Position;
  size: Size;
  hp = 1;
  maxHp = 1;
  speed = 0;
  isDead = false;

  maxRadius: number;
  currentRadius: number = 0;
  duration: number = 0.5; // seconds
  elapsed: number = 0;

  constructor(id: string, x: number, y: number, radius: number) {
    this.id = id;
    this.pos = { x, y };
    this.maxRadius = radius;
    this.size = { width: radius * 2, height: radius * 2 };
  }

  update(canvasSize: Size, deltaTime: number) {
    this.elapsed += deltaTime;
    this.currentRadius = (this.elapsed / this.duration) * this.maxRadius;
    
    if (this.elapsed >= this.duration) {
      this.isDead = true;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.currentRadius, 0, Math.PI * 2);
    
    // Gradient for the blast
    const gradient = ctx.createRadialGradient(
      this.pos.x, this.pos.y, 0,
      this.pos.x, this.pos.y, this.currentRadius
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.5, 'rgba(200, 50, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(100, 0, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Outer ring
    ctx.strokeStyle = 'rgba(200, 50, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
  }
}
