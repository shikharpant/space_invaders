import { Entity, EntityType, Position, Size } from './types';

export class Enemy implements Entity {
  id: string;
  type: EntityType;
  pos: Position;
  size: Size;
  hp: number;
  maxHp: number;
  speed: number;
  isDead = false;

  direction: number = 1; // Left or Right
  moveTimer: number = 0;
  fireTimer: number = 0;
  isIndestructible: boolean = false;

  isFalling: boolean = false;
  fallVelocity: { x: number; y: number } = { x: 0, y: 0 };
  rotation: number = 0;
  rotationSpeed: number = 0;

  constructor(id: string, type: EntityType, x: number, y: number, sizeOverride?: Size) {
    this.id = id;
    this.type = type;
    this.pos = { x, y };

    switch (type) {
      case EntityType.ENEMY_SHIP:
        this.size = sizeOverride || { width: 50, height: 40 };
        this.hp = 3;
        this.maxHp = 3;
        this.speed = 1.2;
        break;
      case EntityType.MONSTER:
        this.size = sizeOverride || { width: 60, height: 60 };
        this.hp = 5;
        this.maxHp = 5;
        this.speed = 0.8;
        break;
      case EntityType.METEOR:
        this.size = sizeOverride || { width: 40 + Math.random() * 40, height: 40 + Math.random() * 40 };
        this.hp = 1000; // Effectively indestructible
        this.maxHp = 1000;
        this.speed = 1.5 + Math.random() * 1.5;
        this.isIndestructible = true;
        break;
      default:
        this.size = { width: 40, height: 40 };
        this.hp = 1;
        this.maxHp = 1;
        this.speed = 1;
    }
  }

  update(canvasSize: Size, deltaTime: number) {
    const speedMultiplier = 60 * deltaTime;

    if (this.isFalling) {
        this.pos.x += this.fallVelocity.x * speedMultiplier;
        this.pos.y += this.fallVelocity.y * speedMultiplier;
        this.rotation += this.rotationSpeed * speedMultiplier;
    } else if (this.type === EntityType.METEOR) {
      // Meteors just fall straight down
      this.pos.y += this.speed * speedMultiplier;
    } else {
      // Ships and Monsters move side to side and steadily down
      this.pos.x += this.speed * this.direction * speedMultiplier;
      this.pos.y += 0.3 * speedMultiplier; 
      this.moveTimer += deltaTime;

      if (this.pos.x < 50 || this.pos.x > canvasSize.width - this.size.width - 50) {
        this.direction *= -1;
        this.pos.y += 30; 
        
        if (this.pos.x < 50) this.pos.x = 51;
        if (this.pos.x > canvasSize.width - this.size.width - 50) {
            this.pos.x = canvasSize.width - this.size.width - 51;
        }
      }
    }

    // Check if out of bounds (extended for falling debris)
    if (this.pos.y > canvasSize.height + 100 || this.pos.x < -100 || this.pos.x > canvasSize.width + 100) {
      this.isDead = true;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const { width, height } = this.size;

    ctx.save();
    ctx.translate(this.pos.x + width / 2, this.pos.y + height / 2);
    
    if (this.isFalling || this.type === EntityType.METEOR) {
        ctx.rotate(this.rotation);
    }

    if (this.type === EntityType.ENEMY_SHIP) {
      // Draw technical angular ship
      ctx.fillStyle = '#FF4444';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#F00';
      ctx.beginPath();
      ctx.moveTo(0, height / 2); // Front
      ctx.lineTo(width / 2, -height / 2);
      ctx.lineTo(width / 4, 0);
      ctx.lineTo(-width / 4, 0);
      ctx.lineTo(-width / 2, -height / 2);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === EntityType.MONSTER) {
      // Draw organic bioluminescent monster
      ctx.fillStyle = '#CC44FF';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#80F';
      ctx.beginPath();
      ctx.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tentacles or Eyes
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(-width / 6, -height / 8, 4, 0, Math.PI * 2);
      ctx.arc(width / 6, -height / 8, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === EntityType.METEOR) {
      // Draw irregular rocky meteor
      ctx.fillStyle = '#888';
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Simple irregular shape
      ctx.moveTo(0, -height / 2);
      ctx.lineTo(width / 2, -height / 4);
      ctx.lineTo(width / 3, height / 2);
      ctx.lineTo(-width / 3, height / 3);
      ctx.lineTo(-width / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}
