/**
 * AIDirector.ts - Adaptive Difficulty System
 * 
 * This system tracks player performance over a rolling 30-second window
 * and dynamically adjusts spawn parameters to maintain optimal challenge.
 * Uses exponential smoothing for gradual transitions (no abrupt difficulty spikes).
 */

import { PlayerStats, SpawnConfig } from './types';

export class AIDirector {
  // Rolling stats tracking (last 30 seconds)
  private shotsFired: number = 0;
  private shotsHit: number = 0;
  private damageTaken: number = 0;
  private kills: number = 0;
  private lastKillTime: number = 0;
  private scoreGained: number = 0;
  
  // Combo tracking (kills within 1 second of each other)
  private currentCombo: number = 0;
  private maxComboThisWindow: number = 0;
  
  // Time window for stats (30 seconds)
  private readonly STATS_WINDOW_MS: number = 30000;
  private readonly COMBO_WINDOW_MS: number = 1000;
  private windowStartTime: number = Date.now();
  private windowStats: PlayerStats = {
    shotsFired: 0, shotsHit: 0, damageTaken: 0, kills: 0, lastKillTime: 0, scoreGained: 0
  };

  // Pressure score (0-1) with exponential smoothing
  private pressureScore: number = 0.5; // Start at balanced
  private readonly SMOOTHING_ALPHA: number = 0.05; // Gradual adjustment
  
  // Current spawn configuration
  private currentConfig: SpawnConfig = this.getDefaultSpawnConfig();

  constructor() {
    this.resetWindow();
  }

  /**
   * Reset the stats window and start fresh tracking
   */
  private resetWindow(): void {
    this.windowStartTime = Date.now();
    this.windowStats = {
      shotsFired: 0, shotsHit: 0, damageTaken: 0, kills: 0, lastKillTime: 0, scoreGained: 0
    };
    this.currentCombo = 0;
    this.maxComboThisWindow = 0;
  }

  /**
   * Get the default spawn configuration (balanced difficulty)
   */
  private getDefaultSpawnConfig(): SpawnConfig {
    return {
      spawnInterval: 2000,      // 2 seconds between waves
      enemyDensity: 3,          // 3 enemies per wave
      monsterRatio: 0.25,       // 25% chance of monster
      meteorFrequency: 0.15,    // 15% chance of meteor
      enemyFireRate: 0.8        // Enemies fire ~once per second
    };
  }

  /**
   * Record a shot fired by the player
   */
  recordShotFired(): void {
    this.shotsFired++;
    this.windowStats.shotsFired++;
  }

  /**
   * Record a successful hit on an enemy
   */
  recordHit(): void {
    this.shotsHit++;
    this.windowStats.shotsHit++;
  }

  /**
   * Record damage taken by the player
   */
  recordDamageTaken(amount: number): void {
    this.damageTaken += amount;
    this.windowStats.damageTaken += amount;
  }

  /**
   * Record an enemy kill - handles combo tracking
   */
  recordKill(): void {
    const now = Date.now();
    
    // Check if this kill continues a combo (within 1 second)
    if (now - this.lastKillTime <= this.COMBO_WINDOW_MS) {
      this.currentCombo++;
    } else {
      // New combo streak
      this.currentCombo = 1;
    }
    
    this.lastKillTime = now;
    this.kills++;
    this.windowStats.kills++;
    this.windowStats.lastKillTime = now;
    
    // Track max combo in current window
    if (this.currentCombo > this.maxComboThisWindow) {
      this.maxComboThisWindow = this.currentCombo;
    }
  }

  /**
   * Record score gained
   */
  recordScore(points: number): void {
    this.scoreGained += points;
    this.windowStats.scoreGained += points;
  }

  /**
   * Update the director with current game state.
   * Call this every frame (or at least once per second).
   */
  update(deltaTime: number): void {
    const now = Date.now();
    const elapsedSinceWindowStart = now - this.windowStartTime;
    
    // Reset window if 30 seconds have passed
    if (elapsedSinceWindowStart >= this.STATS_WINDOW_MS) {
      this.resetWindow();
    }

    // Calculate raw pressure score from current stats
    const rawPressure = this.calculateRawPressure();
    
    // Apply exponential smoothing: newScore = alpha * raw + (1 - alpha) * oldScore
    // This prevents abrupt difficulty changes and gives the player time to adapt
    this.pressureScore = this.SMOOTHING_ALPHA * rawPressure + 
                         (1 - this.SMOOTHING_ALPHA) * this.pressureScore;
    
    // Clamp pressure score to valid range
    this.pressureScore = Math.max(0, Math.min(1, this.pressureScore));

    // Update spawn config based on smoothed pressure
    this.currentConfig = this.calculateSpawnConfig(this.pressureScore);
  }

  /**
   * Calculate raw (unsmoothed) pressure score from player stats.
   * 
   * High pressure (>0.7) means player is dominating - increase difficulty
   * Low pressure (<0.3) means player is struggling - decrease difficulty
   * 
   * Factors:
   * - Accuracy: shotsHit / shotsFired (higher = better)
   * - Damage taken rate: damage per second (lower = better)
   * - Kill combo streaks: consecutive kills within 1s (higher = better)
   * - Score velocity: points gained per second (higher = better)
   */
  private calculateRawPressure(): number {
    const elapsedSeconds = Math.max(0.1, (Date.now() - this.windowStartTime) / 1000);
    
    // Factor 1: Accuracy (0-1 scale)
    // Higher accuracy means player is skilled -> higher pressure needed
    let accuracyScore = 0;
    if (this.windowStats.shotsFired > 0) {
      accuracyScore = this.windowStats.shotsHit / this.windowStats.shotsFired;
    }
    
    // Factor 2: Damage taken rate (inverted - less damage = higher pressure needed)
    // Normalize: assume 50 damage/sec is "struggling", 0 is "perfect"
    const damageRate = this.windowStats.damageTaken / elapsedSeconds;
    const damageScore = Math.max(0, 1 - (damageRate / 50));
    
    // Factor 3: Combo streaks (normalized to 0-1)
    // Assume max combo of 10 is "dominating"
    const comboScore = Math.min(1, this.maxComboThisWindow / 10);
    
    // Factor 4: Score velocity (points per second)
    // Normalize: assume 200 points/sec is "dominating"
    const scoreVelocity = this.windowStats.scoreGained / elapsedSeconds;
    const scoreScore = Math.min(1, scoreVelocity / 200);

    // Weighted combination of all factors
    // Accuracy and combos are most important for determining skill level
    const rawPressure = (
      accuracyScore * 0.35 +   // 35% weight on accuracy
      damageScore * 0.25 +     // 25% weight on survivability  
      comboScore * 0.25 +      // 25% weight on kill streaks
      scoreScore * 0.15        // 15% weight on overall performance
    );

    return rawPressure;
  }

  /**
   * Calculate spawn configuration based on pressure score.
   * 
   * Pressure < 0.3 (Easy): Fewer enemies, slower fire rate, fewer meteors
   * Pressure ~ 0.5 (Balanced): Default settings
   * Pressure > 0.7 (Hard): Dense waves, more monsters, frequent meteors, aggressive fire
   */
  private calculateSpawnConfig(pressure: number): SpawnConfig {
    // Interpolate between easy and hard configurations based on pressure
    
    // Easy config (pressure = 0)
    const easyConfig: SpawnConfig = {
      spawnInterval: 3500,      // Longer gaps between waves
      enemyDensity: 2,          // Fewer enemies per wave
      monsterRatio: 0.1,        // Rare monsters
      meteorFrequency: 0.05,    // Very few meteors
      enemyFireRate: 0.4        // Enemies fire slowly
    };

    // Hard config (pressure = 1)
    const hardConfig: SpawnConfig = {
      spawnInterval: 800,       // Rapid waves
      enemyDensity: 6,          // Dense enemy formations
      monsterRatio: 0.45,        // Many monsters for chain reactions
      meteorFrequency: 0.35,    // Frequent meteors
      enemyFireRate: 2.0        // Aggressive firing
    };

    // Linear interpolation between easy and hard based on pressure
    const t = pressure; // Already normalized 0-1
    
    return {
      spawnInterval: this.lerp(easyConfig.spawnInterval, hardConfig.spawnInterval, t),
      enemyDensity: Math.round(this.lerp(easyConfig.enemyDensity, hardConfig.enemyDensity, t)),
      monsterRatio: this.lerp(easyConfig.monsterRatio, hardConfig.monsterRatio, t),
      meteorFrequency: this.lerp(easyConfig.meteorFrequency, hardConfig.meteorFrequency, t),
      enemyFireRate: this.lerp(easyConfig.enemyFireRate, hardConfig.enemyFireRate, t)
    };
  }

  /**
   * Linear interpolation between two values
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Get the current spawn configuration for GameManager to use
   */
  getSpawnConfig(): SpawnConfig {
    return { ...this.currentConfig }; // Return copy to prevent external modification
  }

  /**
   * Get the current pressure score (0-1) for HUD display
   */
  getPressureScore(): number {
    return this.pressureScore;
  }

  /**
   * Get color for pressure bar based on current difficulty level
   * Blue (easy) -> White (balanced) -> Red (intense)
   */
  getPressureColor(): string {
    const p = this.pressureScore;
    
    if (p < 0.5) {
      // Interpolate from blue to white
      const t = p / 0.5; // Normalize to 0-1 for lower half
      return `rgb(${Math.round(0 + 255 * t)}, ${Math.round(100 + 155 * t)}, 255)`;
    } else {
      // Interpolate from white to red
      const t = (p - 0.5) / 0.5; // Normalize to 0-1 for upper half
      return `rgb(255, ${Math.round(255 - 255 * t)}, ${Math.round(255 - 100 * t)})`;
    }
  }

  /**
   * Get debug stats for development/testing
   */
  getDebugStats(): PlayerStats {
    return { ...this.windowStats };
  }
}