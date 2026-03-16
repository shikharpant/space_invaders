/**
 * GravityWell.ts - Temporary environmental hazards
 * 
 * Gravity wells spawn randomly and create a gravitational field that:
 * - Deflects projectiles (player bullets leave trails when curved)
 * - Pulls enemies toward center (destroyed at exact center for bonus points)
 * - Does NOT affect the player ship directly (skill-based indirect mechanic)
 * 
 * Visual effects include rotating rings, spiral particles, and implosion on despawn.
 */

import { Entity, EntityType, Position, Size, SpiralParticle } from './types';

export class GravityWell implements Entity {
  id: string;
  type = EntityType.GRAVITY_WELL;
  pos: Position;
  size: Size;
  hp = 1;
  maxHp = 1;
  speed = 0;
  isDead = false;

  // Gravity well properties
  readonly radius: number = 150;        // Gravitational influence radius (px)
  readonly strength: number = 8000;     // Base gravitational strength
  readonly maxForce: number = 200;      // Clamp to prevent teleportation
  
  // Lifecycle timing
  private readonly fadeInDuration: number = 1.0;   // seconds
  private readonly activeDuration: number = 10.0;  // seconds (randomized 8-12)
  private readonly fadeOutDuration: number = 1.0;  // seconds
  
  private lifetime: number = 0;
  private totalDuration: number;
  
  // Visual state
  private opacity: number = 0;
  private rotationAngle: number = 0;     // For rotating rings
  private spiralParticles: SpiralParticle[] = [];
  private isImploding: boolean = false;  // Final collapse animation

  constructor(id: string, x: number, y: number) {
    this.id = id;
    this.pos = { x, y };
    this.size = { width: this.radius * 2, height: this.radius * 2 };
    
    // Randomize active duration between 8-12 seconds
    this.totalDuration = this.fadeInDuration + 
                        (8.0 + Math.random() * 4.0) + 
                        this.fadeOutDuration;
    
    // Initialize spiral particles for visual effect
    this.initSpiralParticles();
  }

  /**
   * Initialize decorative spiral particles that orbit the well
   */
  private initSpiralParticles(): void {
    const particleCount = 12 + Math.floor(Math.random() * 8); // 12-20 particles
    
    for (let i = 0; i < particleCount; i++) {
      this.spiralParticles.push({
        angle: (i / particleCount) * Math.PI * 2,
        radius: 30 + Math.random() * 100,  // Start at various distances
        speed: 0.5 + Math.random() * 1.0,   // Orbital speed
        size: 1 + Math.random() * 2,        // Particle size
        lifeTime: Math.random()             // Offset lifetimes for variety
      });
    }
  }

  /**
   * Update the gravity well state and apply gravitational forces to entities
   */
  update(canvasSize: Size, deltaTime: number): void {
    this.lifetime += deltaTime;
    
    // Calculate opacity based on lifecycle phase
    if (this.lifetime < this.fadeInDuration) {
      // Fade in phase
      this.opacity = this.lifetime / this.fadeInDuration;
    } else if (this.lifetime >= this.totalDuration - this.fadeOutDuration) {
      // Fade out / implosion phase
      this.isImploding = true;
      const implodeProgress = (this.lifetime - (this.totalDuration - this.fadeOutDuration)) 
                             / this.fadeOutDuration;
      this.opacity = 1 - implodeProgress;
    } else {
      // Active phase
      this.opacity = 1.0;
    }

    // Check if well should despawn
    if (this.lifetime >= this.totalDuration) {
      this.isDead = true;
    }

    // Update rotation for visual rings
    const rotationSpeed = this.isImploding ? 15 : 2; // Spin faster during implosion
    this.rotationAngle += rotationSpeed * deltaTime;

    // Update spiral particles
    this.updateSpiralParticles(deltaTime);
  }

  /**
   * Update orbital spiral particles
   */
  private updateSpiralParticles(deltaTime: number): void {
    const implodeMultiplier = this.isImploding ? 5 : 1;
    
    this.spiralParticles.forEach(particle => {
      // Orbital movement
      particle.angle += particle.speed * deltaTime * implodeMultiplier;
      
      // Spiral inward during implosion
      if (this.isImploding) {
        particle.radius *= 0.95; // Rapid spiral in
      } else {
        // Slight natural drift
        particle.radius = Math.max(20, particle.radius - 0.5 * deltaTime);
      }
      
      particle.lifeTime += deltaTime;
    });
  }

  /**
   * Apply gravitational force to an entity's velocity vector.
   * 
   * Uses inverse-square law: F = strength / distance²
   * Clamped to maxForce to prevent extreme deflections.
   * 
   * @param entityPos Position of the entity being affected
   * @param entityVelocity Current velocity (will be modified in place)
   * @returns Modified velocity vector
   */
  applyGravity(
    entityPos: Position, 
    entityVelocity: { x: number; y: number }
  ): { x: number; y: number } {
    // Calculate vector from entity to well center
    const dx = this.pos.x - entityPos.x;
    const dy = this.pos.y - entityPos.y;
    
    // Use squared distance for performance (avoid sqrt when possible)
    const distSquared = dx * dx + dy * dy;
    
    // Skip if outside radius (with small buffer)
    if (distSquared > this.radius * this.radius) {
      return entityVelocity;
    }

    // Calculate distance (need actual value for normalization)
    const distance = Math.sqrt(distSquared);
    
    // Prevent division by zero and extreme forces at center
    const clampedDistance = Math.max(distance, 5);
    
    // Inverse-square law: force decreases with square of distance
    // F = strength / d²
    let forceMagnitude = this.strength / distSquared;
    
    // Clamp to maximum force to prevent teleportation
    forceMagnitude = Math.min(forceMagnitude, this.maxForce);

    // Normalize direction vector and apply force
    const nx = dx / clampedDistance;
    const ny = dy / clampedDistance;

    // Apply gravitational acceleration to velocity
    entityVelocity.x += nx * forceMagnitude * 0.16; // 0.16 ≈ 1/60 for frame-rate independence
    entityVelocity.y += ny * forceMagnitude * 0.16;

    return entityVelocity;
  }

  /**
   * Check if an entity has been pulled into the center (destroy zone)
   * Returns true if entity should be destroyed with bonus points
   */
  checkCenterCollision(entityPos: Position, entitySize: Size): boolean {
    // Calculate distance from entity center to well center
    const entityCenterX = entityPos.x + entitySize.width / 2;
    const entityCenterY = entityPos.y + entitySize.height / 2;
    
    const dx = this.pos.x - entityCenterX;
    const dy = this.pos.y - entityCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Destroy zone is a small circle at the center (15px radius)
    return distance < 15;
  }

  /**
   * Draw the gravity well with visual effects
   */
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    
    const centerX = this.pos.x;
    const centerY = this.pos.y;

    // Apply overall opacity
    ctx.globalAlpha = this.opacity;

    // 1. Dark center circle with radial gradient (purple to transparent)
    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,           // Inner circle
      centerX, centerY, this.radius  // Outer radius
    );
    
    gradient.addColorStop(0, 'rgba(80, 20, 120, 0.9)');   // Deep purple center
    gradient.addColorStop(0.3, 'rgba(120, 40, 160, 0.6)'); // Medium purple
    gradient.addColorStop(0.7, 'rgba(80, 20, 120, 0.2)');  // Fading purple
    gradient.addColorStop(1, 'rgba(80, 20, 120, 0)');      // Transparent edge

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Rotating concentric rings (thin white arcs with low opacity)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    
    for (let i = 1; i <= 4; i++) {
      const ringRadius = this.radius * (i / 5); // Rings at 20%, 40%, 60%, 80%
      
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(this.rotationAngle * (i % 2 === 0 ? 1 : -1)); // Alternate rotation direction
      
      ctx.beginPath();
      // Draw partial arcs for more dynamic look
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 1.5);
      ctx.stroke();
      
      ctx.restore();
    }

    // 3. Spiral particles (small dots orbiting inward)
    this.spiralParticles.forEach(particle => {
      const px = centerX + Math.cos(particle.angle) * particle.radius;
      const py = centerY + Math.sin(particle.angle) * particle.radius;
      
      ctx.fillStyle = `rgba(200, 150, 255, ${0.4 * this.opacity})`;
      ctx.beginPath();
      ctx.arc(px, py, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Implosion flash effect (when collapsing)
    if (this.isImploding) {
      const implodeProgress = 1 - this.opacity;
      
      ctx.strokeStyle = `rgba(255, 200, 255, ${implodeProgress * 0.8})`;
      ctx.lineWidth = 3;
      
      ctx.beginPath();
      const implodeRadius = this.radius * implodeProgress;
      ctx.arc(centerX, centerY, implodeRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}