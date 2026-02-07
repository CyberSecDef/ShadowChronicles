# 🚇 Shadow Chronicles - Codebase Subway Map

A detailed visualization of the Shadow Chronicles codebase architecture presented as an interactive subway map.

![Subway Map Preview](https://github.com/user-attachments/assets/49026eb2-a995-4e4b-bcf7-1a9c0aa8d826)

## Overview

This subway map visualization transforms the complex architecture of Shadow Chronicles into an intuitive, transit-style diagram where:

- **🚉 Stations** = Classes, modules, and functions
- **🚇 Lines** = Execution flows and data paths (color-coded)
- **🔄 Intersections** = Points where different flows meet (data sharing or function calls)
- **🏷️ Labels** = Key data types, variables, and structures
- **🗺️ Routes** = Program logic paths from entry to output

## Features

### Interactive Visualization
- **Zoom Controls**: Zoom in/out to explore details
- **Pan & Scroll**: Click and drag to navigate the map
- **Mouse Wheel Zoom**: Hold Ctrl + scroll for precise zooming
- **Download SVG**: Export the map for documentation

### Subway Lines (Execution Flows)

| Line | Color | Represents |
|------|-------|------------|
| **Command Flow Line** | 🔴 Red | User input → WebSocket → Parser → Game Engine |
| **State Synchronization Line** | 🔵 Blue | Game state updates → Client → UI rendering |
| **Game Initialization Line** | 🟡 Yellow | App startup → WebSocket connection → Player restore |
| **Room & Environment Line** | 🟢 Green | Room data loading → Descriptions → Exit/Object systems |
| **Combat & NPC Line** | 🟣 Purple | NPC spawning → Combat triggers → Attack handlers |
| **Light & Darkness Line** | 🩷 Pink | Light checks → Room lighting → Flashlight mechanics |

### Station Types

- **Entry Points**: User interaction points (Browser, main.ts)
- **Core Logic**: Central processing units (GameEngine, CommandParser)
- **Transport/Communication**: Network layers (WebSocket, Message routing)
- **Data Storage**: Persistence mechanisms (localStorage, Room JSON)
- **UI Display**: Visual rendering (UIManager, DOM updates)
- **Event Handlers**: Action processors (Command handlers, Combat system)

### Interchange Stations (Key Integration Points)

- **Game Engine**: Hub connecting Command Flow, State Sync, Combat, and Light systems
- **WebSocket Server**: Transfer point for Command Flow and State Sync
- **GameClient**: Orchestrator connecting Command Flow and Game Initialization
- **Room Loader**: Integration of Game Init and Room System

## How to Use

### Viewing the Map

1. **Interactive HTML Viewer** (Recommended):
   ```bash
   # Open subway-map.html in your browser
   open subway-map.html
   # or
   python3 -m http.server 8888
   # Then visit: http://localhost:8888/subway-map.html
   ```

2. **SVG File**:
   ```bash
   # View the raw SVG in any browser or SVG editor
   open subway-map.svg
   ```

### Generating the Map

To regenerate the map after code changes:

```bash
node subway-map-generator.js
```

This creates:
- `subway-map.svg` - Standalone SVG visualization
- `subway-map.html` - Interactive HTML viewer with controls

## Understanding the Architecture

### 1. Command Flow (Red Line)
```
User Input → GameClient → WebSocket → Server → Parser → Engine → Handlers
```

The primary user interaction path. When a player types a command, it travels through:
1. Browser input field
2. GameClient.sendCommand()
3. WebSocket client send
4. WebSocket server receive
5. CommandParser.parse()
6. GameEngine.processCommand()
7. Specific command handler

### 2. State Synchronization (Blue Line)
```
GameEngine → StateUpdate → WebSocket → StateManager → localStorage → UIManager
```

After processing, state changes flow back to update the client:
1. Game Engine modifies player/room state
2. Creates StateUpdateMessage
3. Sends via WebSocket
4. StateManager updates browser storage
5. UIManager renders visual changes

### 3. Game Initialization (Yellow Line)
```
main.ts → GameClient.init() → UI Setup → WebSocket Connect → Server Init → Room Loader
```

Application startup sequence:
1. main.ts entry point
2. GameClient initialization
3. UI setup (panels, buttons, event listeners)
4. WebSocket connection established
5. Server initializes game session
6. Loads room definitions from JSON
7. Restores or creates player state

### 4. Room System (Green Line)
```
Room JSON → Loader → Room State → Descriptions → Exit/Object Systems
```

Environment and world management:
1. JSON files define rooms with exits, objects, NPCs
2. Room Loader parses and stores room data
3. Room State tracks dynamic changes
4. Descriptions generated based on lighting, visits
5. Exit System handles movement validation
6. Object System manages item interactions

### 5. Combat System (Purple Line)
```
NPC Spawn → Combat Trigger → Combat State → Attack Handler → Combat Message
```

Battle mechanics flow:
1. NPCs spawn based on room conditions
2. Entering room with hostile NPC triggers combat
3. GameSession.inCombat flag set
4. Attack handler processes combat commands
5. Combat messages sent to client

### 6. Light & Darkness (Pink Line)
```
Light Check → Room Lighting → Light Source Item → Flashlight Flag → Dark Description
```

Visibility mechanics:
1. hasLight() checks if player can see
2. Room.lighting.isLit indicates natural lighting
3. Light source items (flashlight) in inventory
4. player.flags[flashlight_on] tracks active state
5. Dark descriptions shown when no light available

## Data Flow Examples

### Example 1: Player Types "go north"

1. **User Input** (Entry)
2. **GameClient** captures input
3. **WebSocket Send** transmits CommandMessage
4. **WebSocket Server** receives message
5. **Command Parser** parses to {verb: "go", noun: "north"}
6. **Game Engine** routes to go() handler
7. **Game Engine** validates exit, updates player.location
8. **State Update Message** created
9. **WebSocket Response** sends updates
10. **State Manager** saves new location
11. **UI Manager** displays room description

### Example 2: Combat Encounter

1. **Room Loader** loads room with hostile NPC
2. **NPC Spawn** creates enemy based on conditions
3. **Combat Trigger** fires on room entry
4. **Combat State** sets session.inCombat = true
5. **Combat Message** notifies client
6. **UI Manager** shows combat UI
7. Player types "attack"
8. **Attack Handler** processes combat
9. **State Update** sends HP changes
10. **UI Manager** updates health bars

## Extending the Map

To add new systems to the visualization:

1. **Edit `subway-map-generator.js`**
2. **Add new line to `SUBWAY_LINES`**:
   ```javascript
   NEW_SYSTEM: {
     name: 'New System Line',
     color: '#HEXCOLOR',
     stations: [
       { id: 'station-1', name: 'Station Name', module: 'file/path', type: 'type' }
     ]
   }
   ```
3. **Add intersections if needed**:
   ```javascript
   {
     stations: ['existing-station', 'new-station'],
     lines: ['EXISTING_LINE', 'NEW_SYSTEM'],
     type: 'transfer',
     description: 'Integration point'
   }
   ```
4. **Regenerate the map**:
   ```bash
   node subway-map-generator.js
   ```

## Technical Details

### Generator Script
- **Language**: Node.js (ES Modules)
- **Output**: SVG 1.1 with embedded styles
- **Dimensions**: 1800x1400px viewport
- **Colors**: Based on London Underground color scheme

### HTML Viewer
- **Features**: Zoom, pan, drag-to-scroll, downloadable
- **Compatibility**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **Storage**: No backend required, runs entirely client-side

### SVG Structure
```
<svg>
  ├── <defs> - Gradients, markers, reusable elements
  ├── <rect> - Background with gradient
  ├── <g id="grid"> - Subway grid pattern
  ├── <g id="subway-lines"> - Colored line paths
  ├── <g id="stations"> - Station circles and labels
  ├── <g id="legend"> - Color key and symbols
  └── <g id="data-labels"> - Data type annotations
</svg>
```

## Design Philosophy

The subway map metaphor was chosen because:

1. **Familiarity**: Everyone understands subway maps intuitively
2. **Clarity**: Complex systems simplified into lines and stations
3. **Navigation**: Easy to trace execution paths visually
4. **Interconnection**: Shows how components relate spatially
5. **Scalability**: Can grow to accommodate new systems
6. **Aesthetic**: Professional, clean, and engaging

## Use Cases

- **Onboarding**: Help new developers understand architecture
- **Documentation**: Visual supplement to technical docs
- **Planning**: Identify integration points for new features
- **Debugging**: Trace execution paths to find issues
- **Presentations**: Explain system design to stakeholders
- **Code Reviews**: Understand impact of proposed changes

## License

This visualization tool is part of the Shadow Chronicles project and follows the same MIT license.

---

**Generated by**: subway-map-generator.js  
**Last Updated**: 2026-02-07
