import { Entity, EntityType, Position, Size } from './types';

export class Player implements Entity {
  id = 'player';
  type = EntityType.PLAYER;
  pos: Position;
  size: Size = { width: 60, height: 40 };
  hp = 100;
  maxHp = 100;
  speed = 10;
  isDead = false;
  velocityX = 0;

  turretAngle = 0; // In radians, 0 is straight up
  readonly maxRotation = (60 * Math.PI) / 180; // 60 degrees in each direction

  constructor(canvasWidth: number, canvasHeight: number) {
    this.pos = {
      x: canvasWidth / 2 - this.size.width / 2,
      y: canvasHeight - this.size.height - 40,
    };
  }

  setTurretAngle(targetX: number, targetY: number) {
    const centerX = this.pos.x + this.size.width / 2;
    const centerY = this.pos.y + 10; // Turret pivot point

    const dx = targetX - centerX;
    const dy = targetY - centerY;

    let angle = Math.atan2(dx, -dy); // -dy because Y increases downwards

    // Clamp angle to -60 to 60 degrees (±1.047 radians)
    if (angle < -this.maxRotation) angle = -this.maxRotation;
    if (angle > this.maxRotation) angle = this.maxRotation;

    this.turretAngle = angle;
  }

  update(canvasSize: Size, deltaTime: number) {
    this.pos.x += this.velocityX;
    
    // Friction
    this.velocityX *= 0.9;

    // Basic clamping to screen
    if (this.pos.x < 0) {
        this.pos.x = 0;
        this.velocityX = 0;
    }
    if (this.pos.x > canvasSize.width - this.size.width) {
      this.pos.x = canvasSize.width - this.size.width;
      this.velocityX = 0;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const { x, y } = this.pos;
    const { width, height } = this.size;

    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);

    // Draw Ship Body (White, sleek)
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';

    // Main hull
    ctx.beginPath();
    ctx.moveTo(0, -height / 2); // Top tip
    ctx.lineTo(width / 2, height / 2); // Right bottom
    ctx.lineTo(-width / 2, height / 2); // Left bottom
    ctx.closePath();
    ctx.fill();

    // Wings/Details
    ctx.strokeStyle = '#AAF';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Turret (Rotating part)
    ctx.rotate(this.turretAngle);
    ctx.fillStyle = '#DDD';
    ctx.fillRect(-4, -height / 2 - 10, 8, 20); // Gun barrel
    
    // Gun Tip Glow
    ctx.fillStyle = '#AAF';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#44F';
    ctx.beginPath();
    ctx.arc(0, -height / 2 - 10, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Draw "Shivansh" text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SHIVANSH', x + width / 2, y + height + 15);
  }
}
