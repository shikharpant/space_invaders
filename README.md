# Space Invaders - React TypeScript Game

A modern take on the classic Space Invaders arcade game built with React and TypeScript. Features smooth canvas-based rendering, multiple enemy types, shockwave mechanics, and dynamic particle effects.

![Space Invaders](https://img.shields.io/badge/React-19.2.4-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-blue.svg)
![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)

---

## 🚀 Features

### Core Gameplay
- **Smooth Canvas Rendering** - 60 FPS game loop with requestAnimationFrame
- **Dynamic Starfield Background** - 200 animated stars with varying speeds and opacity
- **Multiple Enemy Types** - Ships, Monsters, and Meteors with unique behaviors
- **Shockwave Mechanics** - Chain reactions when destroying monsters
- **Particle Effects** - Fire particles on enemy destruction

### Player Ship "SHIVANSH"
- Sleek white design with cyan glow effects
- Rotating turret that follows mouse position (±60° range)
- 100 HP health system
- Rapid-fire capability (5 shots/second)

---

## 🎮 Controls

| Action | Control |
|--------|---------|
| Move Left | ArrowLeft or A |
| Move Right | ArrowRight or D |
| Fire Weapon | Spacebar |
| Aim Turret | Mouse movement |

---

## 👾 Enemy Types

| Type | HP | Speed | Behavior | Points |
|------|----|-------|----------|--------|
| **Enemy Ship** | 3 | 1.2 | Moves side-to-side, descends slowly | +10 |
| **Monster** | 5 | 0.8 | Larger, slower, creates shockwave on death | +20 |
| **Meteor** | ∞ | 1.5-3.0 | Falls straight down, indestructible by bullets | - |

### Special Mechanics

#### Shock Blast (Monster Death)
When a Monster is destroyed:
- Creates an expanding explosion effect with purple/white gradient
- **Chain Reactions:** Nearby monsters are also destroyed
- **Debris Physics:** Enemy ships knocked into rotating falling debris
- **Meteor Splitting:** Meteors split into 3-4 smaller pieces

#### Falling Debris Physics
Enemies affected by shockwaves gain:
- Random horizontal velocity
- Gravity-based descent
- Rotation animation

---

## 🛠️ Tech Stack

- **React** 19.2.4 - UI framework
- **TypeScript** 4.9.5 - Type-safe development
- **Canvas API** - High-performance rendering
- **Create React App** 5.0.1 - Build tooling

---

## 📁 Project Structure

```
space-invaders/
├── public/
│   ├── index.html          # HTML template
│   ├── favicon.ico         # App icon
│   └── manifest.json       # PWA manifest
├── src/
│   ├── components/
│   │   └── GameCanvas.tsx  # Canvas rendering & game loop
│   ├── game/
│   │   ├── types.ts        # TypeScript interfaces/enums
│   │   ├── GameManager.ts  # Core game logic & collision detection
│   │   ├── Player.ts       # Player ship class
│   │   ├── Enemy.ts        # Enemy entities (ships, monsters, meteors)
│   │   ├── Projectile.ts   # Bullets & fire particles
│   │   └── ShockBlast.ts   # Explosion effect class
│   ├── App.tsx             # Main app component
│   ├── index.tsx           # Entry point
│   └── reportWebVitals.ts  # Performance monitoring
├── package.json            # Dependencies & scripts
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

---

## 🚦 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
# Clone or navigate to the project directory
cd space-invaders

# Install dependencies
npm install
```

### Running the Game

```bash
# Start development server
npm start
```

The game will open at [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
```

Creates an optimized production bundle in `/build` folder.

---

## 🎯 Game Mechanics Deep Dive

### Player Movement
- Smooth acceleration with friction (velocity *= 0.9 per frame)
- Clamped to screen boundaries
- Turret independently rotates toward mouse position

### Projectile System
- **Player Bullets:** Cyan (#00FFFF) with glow effect, travel upward at angle
- **Enemy Bullets:** Red projectiles fired downward
- **Fire Particles:** Orange/yellow particles spawned on enemy death, fade over 1 second

### Collision Detection
The GameManager handles:
- Bullet vs Enemy collisions (reduces HP, spawns effects)
- Enemy bullet vs Player (10 damage per hit)
- Entity cleanup when out of bounds
- Shockblast radius calculations for chain reactions

### Scoring System
| Action | Points |
|--------|--------|
| Destroy Enemy Ship | +10 |
| Destroy Monster | +20 |
| Chain Reaction Kill | Bonus |

---

## 🎨 Visual Design

- **Background:** Deep space (#050510)
- **Player Ship:** White with cyan glow accents
- **Enemy Ships:** Red/pink color scheme
- **Monsters:** Purple/dark theme
- **Meteors:** Gray rocky appearance
- **Shock Blast:** White-to-purple gradient explosion

---

## 📝 Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Runs the app in development mode with hot reload |
| `npm test` | Launches the test runner in interactive watch mode |
| `npm run build` | Builds the app for production to the `build` folder |
| `npm run eject` | Ejects from Create React App (one-way operation) |

---

## 🔮 Future Enhancements

Potential features to add:
- [ ] Power-ups and weapon upgrades
- [ ] Boss battles with unique patterns
- [ ] Sound effects and background music
- [ ] High score tracking with localStorage
- [ ] Multiple difficulty levels
- [ ] Mobile touch controls
- [ ] Pause menu and game over screens

---

## 📄 License

Licensed under the [Apache License 2.0](LICENSE). Feel free to use this project for learning, modification, or as a base for your own games!

---

**Built by Shivansh** | Powered by React & TypeScript
