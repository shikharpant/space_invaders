import { Entity, EntityType, Position, Size, SpawnConfig } from './types';
import { Player } from './Player';
import { Projectile, ProjectileType } from './Projectile';
import { Enemy } from './Enemy';
import { ShockBlast } from './ShockBlast';
import { AIDirector } from './AIDirector';
import { GravityWell } from './GravityWell';

export class GameManager {
  player: Player;
  entities: Entity[] = [];
  score: number = 0;
  isGameOver: boolean = false;
  isPaused: boolean = false;
  canvasSize: Size;

  // AIDirector for adaptive difficulty
  director: AIDirector;
  
  // Gravity wells array
  gravityWells: GravityWell[] = [];
  
  // Gravity well spawning
  private gravityWellTimer: number = 0;
  private readonly GRAVITY_WELL_MIN_INTERVAL: number = 20.0;  // seconds
  private readonly GRAVITY_WELL_MAX_INTERVAL: number = 40.0; // seconds
  private nextGravityWellSpawn: number = 0;

  private spawnTimer: number = 0;
  private projectileCounter: number = 0;
  private playerFireTimer: number = 0;
  private readonly PLAYER_FIRE_RATE: number = 0.2; // 5 shots per second
  
  // Current spawn configuration from director
  private currentSpawnConfig: SpawnConfig;

  constructor(width: number, height: number) {
    this.canvasSize = { width, height };
    this.player = new Player(width, height);
    this.director = new AIDirector();
    this.currentSpawnConfig = this.director.getSpawnConfig();
    
    // Schedule first gravity well
    this.nextGravityWellSpawn = 5 + Math.random() * 10; // 5-15 seconds initially
  }

  /**
   * Spawn enemies based on current director configuration
   */
  spawnEnemyWave(): void {
    const config = this.currentSpawnConfig;
    
    // Spawn multiple enemies per wave based on density
    for (let i = 0; i < config.enemyDensity; i++) {
      let type: EntityType;
      
      // Determine enemy type based on configured ratios
      const rand = Math.random();
      if (rand < config.meteorFrequency) {
        type = EntityType.METEOR;
      } else if (rand < config.meteorFrequency + config.monsterRatio) {
        type = EntityType.MONSTER;
      } else {
        type = EntityType.ENEMY_SHIP;
      }
      
      const x = 50 + Math.random() * (this.canvasSize.width - 100);
      const id = `enemy-${Date.now()}-${Math.random()}`;
      
      // Spawn just slightly above the screen
      const enemy = new Enemy(id, type, x, -40);
      this.entities.push(enemy);
    }
  }

  /**
   * Spawn a gravity well at a random position in the middle 60% of screen
   */
  spawnGravityWell(): void {
    // Keep wells away from edges (middle 60% of screen)
    const minX = this.canvasSize.width * 0.2;
    const maxX = this.canvasSize.width * 0.8;
    const minY = this.canvasSize.height * 0.25;
    const maxY = this.canvasSize.height * 0.7;
    
    const x = minX + Math.random() * (maxX - minX);
    const y = minY + Math.random() * (maxY - minY);
    const id = `gravity-well-${Date.now()}`;
    
    const well = new GravityWell(id, x, y);
    this.gravityWells.push(well);
  }

  handleMonsterDeath(monster: Enemy) {
    monster.isDead = true;
    const radius = monster.size.width * 2.5; // Blast radius is 5 times monster size (width * 2.5 * 2)
    const blast = new ShockBlast(`blast-${monster.id}`, monster.pos.x + monster.size.width / 2, monster.pos.y + monster.size.height / 2, radius);
    this.entities.push(blast);

    // Blast area effect check
    this.entities.forEach(e => {
        if (e.id === monster.id || e.isDead || (e instanceof Enemy && e.isFalling)) return;
        
        // Check distance to other entities
        const dx = (monster.pos.x + monster.size.width / 2) - (e.pos.x + e.size.width / 2);
        const dy = (monster.pos.y + monster.size.height / 2) - (e.pos.y + e.size.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= radius + Math.max(e.size.width, e.size.height) / 2) {
            if (e.type === EntityType.MONSTER) {
                // Chain reaction!
                this.handleMonsterDeath(e as Enemy);
                this.score += 20;
            } else if (e.type === EntityType.ENEMY_SHIP) {
                const ship = e as Enemy;
                ship.isFalling = true;
                ship.fallVelocity = { 
                    x: (Math.random() - 0.5) * 15, 
                    y: Math.random() * 5 + 5 
                };
                ship.rotationSpeed = (Math.random() - 0.5) * 0.4;
                this.score += 10;
            } else if (e.type === EntityType.METEOR) {
                const meteor = e as Enemy;
                meteor.isDead = true;
                // Split into 3 or 4 smaller pieces
                const pieces = 3 + Math.floor(Math.random() * 2);
                for (let i = 0; i < pieces; i++) {
                    const smallMeteor = new Enemy(
                        `meteor-piece-${meteor.id}-${i}`,
                        EntityType.METEOR,
                        meteor.pos.x + Math.random() * meteor.size.width,
                        meteor.pos.y + Math.random() * meteor.size.height,
                        { width: meteor.size.width / 2.5, height: meteor.size.height / 2.5 }
                    );
                    smallMeteor.isFalling = true; // Use falling logic for random direction
                    smallMeteor.fallVelocity = { 
                        x: (Math.random() - 0.5) * 10, 
                        y: Math.random() * 5 + 3 
                    };
                    smallMeteor.rotationSpeed = (Math.random() - 0.5) * 0.3;
                    this.entities.push(smallMeteor);
                }
            } else if (e.type === EntityType.PROJECTILE) {
                e.isDead = true;
            }
        }
    });
  }

  firePlayerBullet() {
    if (this.playerFireTimer < this.PLAYER_FIRE_RATE) return;

    const id = `p-bullet-${this.projectileCounter++}`;
    const startX = this.player.pos.x + this.player.size.width / 2;
    const startY = this.player.pos.y + 10;
    
    const bullet = new Projectile(
      id,
      startX,
      startY,
      this.player.turretAngle,
      10,
      ProjectileType.PLAYER_BULLET,
      '#00FFFF'
    );
    this.entities.push(bullet);
    this.playerFireTimer = 0;
    
    // Record shot for AIDirector
    this.director.recordShotFired();
  }

  fireEnemyBullet(enemy: Enemy) {
    const id = `e-bullet-${this.projectileCounter++}`;
    const startX = enemy.pos.x + enemy.size.width / 2;
    const startY = enemy.pos.y + enemy.size.height;
    
    if (enemy.type === EntityType.ENEMY_SHIP) {
      const bullet = new Projectile(
        id,
        startX,
        startY,
        Math.PI, // Straight down
        5,
        ProjectileType.ENEMY_BULLET,
        '#FF0000'
      );
      this.entities.push(bullet);
    } else if (enemy.type === EntityType.MONSTER) {
      // "Breathe Fire" - Cluster of fire particles in an arc
      for (let i = 0; i < 5; i++) {
        const angle = Math.PI + (Math.random() * 0.6 - 0.3); // Downwards arc
        const fire = new Projectile(
          `${id}-${i}`,
          startX,
          startY,
          angle,
          3 + Math.random() * 3,
          ProjectileType.FIRE_PARTICLE,
          '#FF8800'
        );
        this.entities.push(fire);
      }
    }
  }

  checkCollisions() {
    // Basic Circle/AABB collision
    const projectiles = this.entities.filter(e => e.type === EntityType.PROJECTILE) as Projectile[];
    const enemies = this.entities.filter(e => 
        e.type !== EntityType.PROJECTILE && 
        e.type !== EntityType.PLAYER && 
        e.type !== EntityType.SHOCK_BLAST &&
        !(e instanceof Enemy && e.isFalling)
    ) as Enemy[];

    projectiles.forEach(p => {
      if (p.projType === ProjectileType.PLAYER_BULLET) {
        enemies.forEach(e => {
          if (!e.isDead && this.isColliding(p, e)) {
            p.isDead = true;
            
            // Record hit for AIDirector
            this.director.recordHit();
            
            if (!e.isIndestructible) {
                e.hp -= 1;
                if (e.hp <= 0) {
                    if (e.type === EntityType.MONSTER) {
                        this.handleMonsterDeath(e as Enemy);
                        this.score += 20;
                    } else {
                        e.isDead = true;
                        this.score += 10;
                    }
                    
                    // Record kill and score for AIDirector
                    this.director.recordKill();
                }
            }
          }
        });
      } else if (p.projType === ProjectileType.ENEMY_BULLET || p.projType === ProjectileType.FIRE_PARTICLE) {
        if (this.isColliding(p, this.player)) {
          p.isDead = true;
          const damage = p.projType === ProjectileType.FIRE_PARTICLE ? 5 : 10;
          this.player.hp -= damage;
          
          // Record damage for AIDirector
          this.director.recordDamageTaken(damage);
          
          if (this.player.hp <= 0) {
            this.isGameOver = true;
          }
        }
      }
    });

    // Enemy/Player collision
    enemies.forEach(e => {
        if (!e.isDead && this.isColliding(e, this.player)) {
            this.isGameOver = true;
        }
    });
  }

  /**
   * Check for gravity well center collisions (bonus kills)
   */
  checkGravityWellCollisions() {
    const enemies = this.entities.filter(e => 
      e.type === EntityType.ENEMY_SHIP || e.type === EntityType.MONSTER || e.type === EntityType.METEOR
    ) as Enemy[];

    this.gravityWells.forEach(well => {
      enemies.forEach(enemy => {
        if (!enemy.isDead && well.checkCenterCollision(enemy.pos, enemy.size)) {
          // Enemy destroyed by gravity well - bonus points!
          enemy.isDead = true;
          this.score += 15; // Bonus for gravity well kill
          this.director.recordKill();
          this.director.recordScore(15);
        }
      });
    });
  }

  isColliding(a: Entity, b: Entity): boolean {
    return (
      a.pos.x < b.pos.x + b.size.width &&
      a.pos.x + a.size.width > b.pos.x &&
      a.pos.y < b.pos.y + b.size.height &&
      a.pos.y + a.size.height > b.pos.y
    );
  }

  togglePause() {
    if (this.isGameOver) return;
    this.isPaused = !this.isPaused;
  }

  update(deltaTime: number) {
    if (this.isGameOver || this.isPaused) return;

    // Update AIDirector with current game state
    this.director.update(deltaTime);
    
    // Get updated spawn config from director
    this.currentSpawnConfig = this.director.getSpawnConfig();
    
    // Record score changes for director
    const scoreDelta = this.score - (this.director as any)._lastScore || 0;
    if (scoreDelta > 0) {
      this.director.recordScore(scoreDelta);
    }

    // Spawn enemies based on adaptive difficulty
    this.spawnTimer += deltaTime;
    this.playerFireTimer += deltaTime;
    
    if (this.spawnTimer > this.currentSpawnConfig.spawnInterval / 1000) {
      this.spawnEnemyWave();
      this.spawnTimer = 0;
    }

    // Spawn gravity wells periodically
    this.gravityWellTimer += deltaTime;
    if (this.gravityWellTimer >= this.nextGravityWellSpawn && this.gravityWells.length === 0) {
      this.spawnGravityWell();
      // Schedule next spawn (20-40 seconds from now)
      this.nextGravityWellSpawn = this.GRAVITY_WELL_MIN_INTERVAL + 
                                  Math.random() * (this.GRAVITY_WELL_MAX_INTERVAL - this.GRAVITY_WELL_MIN_INTERVAL);
      this.gravityWellTimer = 0;
    }

    // Update player
    this.player.update(this.canvasSize, deltaTime);

    // Apply gravity well forces to projectiles and enemies BEFORE updating their positions
    this.applyGravityWells();

    // Update all entities
    this.entities.forEach(e => {
      e.update(this.canvasSize, deltaTime);
      
      // Enemy firing logic (adjusted by director config)
      if (e instanceof Enemy && !e.isFalling) {
        e.fireTimer += deltaTime;
        const fireRate = 1.0 / this.currentSpawnConfig.enemyFireRate;
        if (e.fireTimer > fireRate) {
          this.fireEnemyBullet(e);
          e.fireTimer = 0;
        }
      }
    });

    // Update gravity wells
    this.gravityWells.forEach(well => well.update(this.canvasSize, deltaTime));

    // Check collisions
    this.checkCollisions();
    this.checkGravityWellCollisions();

    // Remove dead entities and expired gravity wells
    this.entities = this.entities.filter(e => !e.isDead);
    this.gravityWells = this.gravityWells.filter(well => !well.isDead);
  }

  /**
   * Apply gravitational forces from all active wells to affected entities
   */
  applyGravityWells(): void {
    if (this.gravityWells.length === 0) return;

    this.gravityWells.forEach(well => {
      // Apply gravity to projectiles (player bullets, enemy bullets, fire particles)
      const projectiles = this.entities.filter(e => e.type === EntityType.PROJECTILE);
      projectiles.forEach(p => {
        well.applyGravity((p as any).pos, (p as any).velocity);
      });

      // Apply gravity to falling enemies (debris from shockwaves)
      const fallingEnemies = this.entities.filter(e => 
        e instanceof Enemy && (e as Enemy).isFalling
      );
      fallingEnemies.forEach(e => {
        if (e instanceof Enemy && e.isFalling) {
          // Apply gravity to fallVelocity instead of regular velocity
          well.applyGravity(e.pos, e.fallVelocity);
        }
      });
    });
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Draw gravity wells first (below enemies but above starfield)
    this.gravityWells.forEach(well => well.draw(ctx));
    
    // Draw player and entities
    this.player.draw(ctx);
    this.entities.forEach(e => e.draw(ctx));

    // UI - Score and Health
    ctx.fillStyle = '#FFF';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${this.score}`, 20, 30);
    ctx.fillText(`Health: ${this.player.hp}`, 20, 60);

    // Draw pressure bar at top of screen (thin colored indicator)
    this.drawPressureBar(ctx);

    if (this.isPaused) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, this.canvasSize.width, this.canvasSize.height);
      ctx.fillStyle = '#FFF';
      ctx.font = '50px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', this.canvasSize.width / 2, this.canvasSize.height / 2);
      ctx.font = '20px Arial';
      ctx.fillText('Middle-Click to Resume', this.canvasSize.width / 2, this.canvasSize.height / 2 + 50);
    }

    if (this.isGameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, this.canvasSize.width, this.canvasSize.height);
      ctx.fillStyle = '#F00';
      ctx.font = '50px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', this.canvasSize.width / 2, this.canvasSize.height / 2);
      ctx.font = '20px Arial';
      ctx.fillText(`Final Score: ${this.score}`, this.canvasSize.width / 2, this.canvasSize.height / 2 + 50);
      ctx.fillText('Press R to Restart', this.canvasSize.width / 2, this.canvasSize.height / 2 + 100);
    }
  }

  /**
   * Draw the adaptive difficulty pressure bar at top of screen
   * Blue (easy) -> White (balanced) -> Red (intense)
   */
  private drawPressureBar(ctx: CanvasRenderingContext2D): void {
    const barWidth = this.canvasSize.width;
    const barHeight = 4; // Thin bar
    const barY = 8; // Near top of screen
    
    const pressureColor = this.director.getPressureColor();
    
    ctx.fillStyle = pressureColor;
    ctx.fillRect(0, barY, barWidth, barHeight);
    
    // Optional: Add a subtle glow effect
    ctx.shadowBlur = 5;
    ctx.shadowColor = pressureColor;
    ctx.fillRect(0, barY, barWidth, barHeight);
    ctx.shadowBlur = 0; // Reset for other drawing
  }

  reset() {
    this.score = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.entities = [];
    this.gravityWells = [];
    this.player.hp = 100;
    this.player.pos.x = this.canvasSize.width / 2 - this.player.size.width / 2;
    
    // Reset director and timers
    this.director = new AIDirector();
    this.currentSpawnConfig = this.director.getSpawnConfig();
    this.spawnTimer = 0;
    this.gravityWellTimer = 0;
    this.nextGravityWellSpawn = 5 + Math.random() * 10;
  }
}