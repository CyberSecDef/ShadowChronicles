# Shadow Chronicles

A browser-based old-school RPG with turn-based combat, character progression, and dungeon exploration.

## Features

- **WebSocket-based multiplayer server** - Server supports multiple independent game sessions
- **4 Character Classes** - Warrior, Mage, Cleric, and Rogue with unique stats
- **Turn-based Battle System** - Strategic combat with menu-driven actions
- **Character Progression** - XP earning, leveling up, and stat improvements
- **Overworld Exploration** - Navigate between towns, dungeons, and the overworld
- **Canvas-based Graphics** - JavaScript-drawn sprites and tile-based maps
- **Save/Load System** - Local storage for JSON-based game saves
- **Single-player Mode** - Complete solo adventure

## Installation

```bash
npm install
```

## Running the Game

```bash
npm start
```

Then open your browser to `http://localhost:8080`

## Controls

- **Arrow Keys** - Move character
- **E** - Enter/Interact with locations
- **Mouse** - Select battle actions and targets

## Game Mechanics

### Party Characters
- **Warrior** - High HP and Attack, tanky frontline fighter
- **Mage** - High MP and Magic, powerful spells
- **Cleric** - Balanced stats, healing abilities
- **Rogue** - High Speed, quick attacks

### Locations
- **Town** - Visit the Inn to rest (heals party) or Shop
- **Overworld** - Travel between locations
- **Dungeon** - Battle enemies and gain XP

### Battle System
- Select a character from your party
- Choose an action (Attack, Magic, Item, Flee)
- Select enemy target
- Earn XP and Gold from victories
- Characters level up automatically when reaching XP thresholds

## Technical Architecture

### Server (`server/gameserver.js`)
- WebSocket server on port 8080
- HTTP server for static file serving
- Game state management for multiple sessions
- Battle logic and character progression

### Client (`public/`)
- `index.html` - Game UI structure
- `style.css` - Old-school RPG styling
- `game.js` - Client-side game logic, rendering, and WebSocket communication

## Save System

Game progress is automatically saved to browser localStorage. Use the "Save Game" button to manually save, and "Load Game" from the main menu to continue.
