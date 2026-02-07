# Shadow Chronicles

A text-based adventure game set in a post-nuclear dystopian world with supernatural elements.

## Project Structure

```
ShadowChronicles/
├── server/              # Node.js/TypeScript WebSocket backend
│   ├── src/
│   │   ├── index.ts           # Entry point
│   │   ├── websocket/         # WebSocket handling
│   │   ├── game/              # Game engine
│   │   ├── parser/            # Command parser
│   │   └── types/             # TypeScript interfaces
│   └── package.json
├── client/              # Web frontend
│   ├── src/
│   │   ├── index.html         # Main HTML
│   │   ├── styles/            # CSS styles
│   │   └── scripts/           # TypeScript client code
│   └── package.json
├── shared/              # Shared types between client/server
├── data/                # Game content (rooms, items, etc.)
│   └── rooms/           # Room definitions
├── schemas/             # JSON schemas for content validation
├── GAME.md              # Game design specification
└── package.json         # Root package.json (workspace)
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm 9+

### Installation

```bash
# Install all dependencies
npm run install:all

# Or manually:
cd server && npm install
cd ../client && npm install
```

### Development

```bash
# Run both server and client in development mode
npm run dev

# Or run separately:
npm run dev:server   # Starts WebSocket server on port 8080
npm run dev:client   # Starts Vite dev server on port 3000
```

### Production Build

```bash
npm run build
npm start
```

## Game Features

### UI Layout
- **Status Bar** (sticky top): Player name, location, HP/MP bars, gold, level
- **Main Game Area**: Scrollable text output with formatted responses
- **Command Input**: Text input with command history (up/down arrows)
- **Sidebar**: Stats, inventory, equipment, quick actions, status effects
- **Modals**: Map view, item details, hints, help

### Commands

#### Movement
- `go [direction]` or just `north`, `south`, `east`, `west`, `up`, `down`
- Shortcuts: `n`, `s`, `e`, `w`, `u`, `d`

#### Looking
- `look` - Examine surroundings
- `examine [object]` or `x [object]` - Look at something specific

#### Items
- `take [item]` - Pick up an item
- `drop [item]` - Drop an item
- `inventory` or `i` - Show inventory
- `use [item]` - Use an item

#### Combat
- `attack` - Attack an enemy
- `cast [spell]` - Cast a psionic spell

#### Other
- `rest` - Recover HP and MP
- `help` - Show help

## Technical Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **WebSocket**: ws library for real-time communication
- **Architecture**: Session-based game state, command parser, game engine

### Frontend
- **Build Tool**: Vite
- **Styling**: Custom CSS with CSS variables for theming
- **State Management**: Custom StateManager with localStorage persistence
- **WebSocket Client**: Native WebSocket API

### Data Storage
- **Game Content**: JSON files in `/data` directory
- **Player State**: Managed server-side, synced to client
- **Save Games**: Stored in browser localStorage

## Extending the Game

### Adding Rooms

Create JSON files in `/data/rooms/` following the schema in `/schemas/room_schema.json`.

### Adding Items

Items are defined within room objects. See the room schema for the full structure.

### Adding Verbs

Extend the `CommandParser` in `/server/src/parser/CommandParser.ts` to add new verbs and their handlers in the `GameEngine`.

---

## Story Overview

**Opening Location:**
A sealed, partially collapsed **pre-war research bunker** beneath a dead city's ruins.

**Player State at Start:**

* Alone; no party.
* Minimal equipment.
* Incomplete memories due to prolonged cryogenic or induced stasis.
* Latent psionic ability not yet understood or controlled.

**Inciting Event:**
The bunker's long-failing containment system catastrophically shuts down, forcing evacuation. During escape, the player triggers an old neural archive that partially restores memory and unlocks rudimentary mental magic.

**Core Revelation (Early Plot Hook):**
Before the nuclear war, the player was part of a classified program studying **human cognition as a reality-shaping force**. The war did not merely destroy civilization; it destabilized the boundary between mind and matter. Undead and supernatural phenomena are side effects of this rupture.

**Primary Long-Term Mission / End Goal:**
The world cannot be saved without **re-stabilizing reality itself**. This requires locating and activating a set of ancient/pre-war psionic artifacts scattered across the wasteland. Each artifact is locked behind a critical subquest chain tied to factions, ruins, or anomalies. The final artifact is unreachable unless all required subquests are completed.

**End State (Game Completion):**
Activation of the final artifact permanently alters the world state—either restoring balance, reshaping reality, or sealing it at great personal cost—depending on subquest outcomes and player choices.

## Design Philosophy

See [GAME.md](./GAME.md) for the complete game design specification.

## License

MIT

