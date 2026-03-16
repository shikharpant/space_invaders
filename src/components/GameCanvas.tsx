import React, { useRef, useEffect } from 'react';
import { GameManager } from '../game/GameManager';

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animationRef = useRef<number>(0);
  const gameManagerRef = useRef<GameManager | null>(null);
  const lastTimeRef = useRef<number>(0);
  const keysPressed = useRef<Set<string>>(new Set());
  const mousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Initialize Stars
  const initStars = (width: number, height: number) => {
    const stars: Star[] = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.5,
        speed: Math.random() * 2 + 0.5,
        opacity: Math.random(),
      });
    }
    starsRef.current = stars;
  };

  const updateStars = (height: number) => {
    starsRef.current.forEach((star) => {
      star.y += star.speed;
      if (star.y > height) {
        star.y = 0;
        star.x = Math.random() * window.innerWidth;
      }
    });
  };

  const drawStars = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = 'white';
    starsRef.current.forEach((star) => {
      ctx.globalAlpha = star.opacity;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;
  };

  const handleInput = () => {
    if (!gameManagerRef.current || gameManagerRef.current.isPaused) return;
    const player = gameManagerRef.current.player;

    if (keysPressed.current.has('ArrowLeft') || keysPressed.current.has('a')) {
        player.velocityX = -player.speed;
    }
    if (keysPressed.current.has('ArrowRight') || keysPressed.current.has('d')) {
        player.velocityX = player.speed;
    }

    // Always update turret angle based on mouse position
    player.setTurretAngle(mousePos.current.x, mousePos.current.y);

    if (keysPressed.current.has(' ')) {
        // Debounce firing if needed, but for now just fire
        // In a real game we'd add a fire cooldown
        gameManagerRef.current.firePlayerBullet();
    }
  };

  const gameLoop = (time: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !gameManagerRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const deltaTime = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    handleInput();

    // Clear canvas
    ctx.fillStyle = '#050510'; // Deep dark space
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    updateStars(canvas.height);
    drawStars(ctx);

    // Update and Draw Game
    gameManagerRef.current.update(deltaTime);
    gameManagerRef.current.draw(ctx);

    animationRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        initStars(window.innerWidth, window.innerHeight);
        if (!gameManagerRef.current) {
          gameManagerRef.current = new GameManager(window.innerWidth, window.innerHeight);
        } else {
          gameManagerRef.current.canvasSize = { width: window.innerWidth, height: window.innerHeight };
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseDown = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      
      if (e.button === 1) { // Middle Mouse Button
        e.preventDefault();
        gameManagerRef.current?.togglePause();
        return;
      }

      if (gameManagerRef.current && !gameManagerRef.current.isGameOver && !gameManagerRef.current.isPaused) {
        gameManagerRef.current.firePlayerBullet();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        keysPressed.current.add(e.key);
        if (e.key === 'r' || e.key === 'R') {
            gameManagerRef.current?.reset();
        }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        keysPressed.current.delete(e.key);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        backgroundColor: '#000',
        width: '100vw',
        height: '100vh',
        cursor: 'crosshair'
      }}
    />
  );
};

export default GameCanvas;
