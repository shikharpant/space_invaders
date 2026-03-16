import { Entity, EntityType, Position, Size } from './types';
import { Player } from './Player';
import { Projectile, ProjectileType } from './Projectile';
import { Enemy } from './Enemy';
import { ShockBlast } from './ShockBlast';

export class GameManager {
  player: Player;
  entities: Entity[] = [];
  score: number = 0;
  isGameOver: boolean = false;
  isPaused: boolean = false;
  canvasSize: Size;

  private spawnTimer: number = 0;
  private projectileCounter: number = 0;
  private playerFireTimer: number = 0;
  private readonly PLAYER_FIRE_RATE: number = 0.2; // 5 shots per second

  constructor(width: number, height: number) {
    this.canvasSize = { width, height };
    this.player = new Player(width, height);
  }

  spawnEnemy() {
    const types = [EntityType.ENEMY_SHIP, EntityType.MONSTER, EntityType.METEOR];
    const type = types[Math.floor(Math.random() * types.length)];
    const x = 50 + Math.random() * (this.canvasSize.width - 100);
    const id = `enemy-${Date.now()}-${Math.random()}`;
    
    // Spawn just slightly above the screen
    const enemy = new Enemy(id, type, x, -40);
    this.entities.push(enemy);
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
                }
            }
          }
        });
      } else if (p.projType === ProjectileType.ENEMY_BULLET || p.projType === ProjectileType.FIRE_PARTICLE) {
        if (this.isColliding(p, this.player)) {
          p.isDead = true;
          this.player.hp -= p.projType === ProjectileType.FIRE_PARTICLE ? 5 : 10;
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

    this.spawnTimer += deltaTime;
    this.playerFireTimer += deltaTime;
    
    if (this.spawnTimer > 0.8) { // Every 0.8 seconds
      this.spawnEnemy();
      this.spawnTimer = 0;
    }

    this.player.update(this.canvasSize, deltaTime);

    this.entities.forEach(e => {
      e.update(this.canvasSize, deltaTime);
      
      // Enemy firing logic
      if (e instanceof Enemy) {
        e.fireTimer += deltaTime;
        const fireRate = e.type === EntityType.MONSTER ? 3 : 2;
        if (e.fireTimer > fireRate) {
          this.fireEnemyBullet(e);
          e.fireTimer = 0;
        }
      }
    });

    this.checkCollisions();

    // Remove dead entities
    this.entities = this.entities.filter(e => !e.isDead);
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.player.draw(ctx);
    this.entities.forEach(e => e.draw(ctx));

    // UI
    ctx.fillStyle = '#FFF';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${this.score}`, 20, 30);
    ctx.fillText(`Health: ${this.player.hp}`, 20, 60);

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

  reset() {
    this.score = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.entities = [];
    this.player.hp = 100;
    this.player.pos.x = this.canvasSize.width / 2 - this.player.size.width / 2;
  }
}
