# Quick Start: Subway Map Visualization

## What is this?

The Shadow Chronicles Subway Map is an interactive visualization that shows how the codebase works using a familiar subway/metro map metaphor.

## How to View

### Option 1: Open the HTML File (Recommended)

Simply double-click or open `subway-map.html` in any modern web browser.

### Option 2: Use a Local Server

```bash
# Navigate to the project directory
cd /path/to/ShadowChronicles

# Start a simple HTTP server
python3 -m http.server 8888

# Open in browser
# Visit: http://localhost:8888/subway-map.html
```

### Option 3: View the SVG

Open `subway-map.svg` directly in a browser or any SVG viewer.

## How to Navigate

- **Zoom**: Click the "🔍 Zoom In" and "🔍 Zoom Out" buttons
- **Pan**: Click and drag anywhere on the map
- **Scroll**: Use your mouse wheel to scroll
- **Zoom with Wheel**: Hold `Ctrl` (or `Cmd` on Mac) + mouse wheel
- **Reset**: Click "↺ Reset View" to return to default zoom
- **Info**: Click "ℹ️ About" to see the help panel
- **Download**: Click "💾 Download SVG" to save the map

## Understanding the Map

### Lines (Execution Flows)
Each colored line represents a different execution flow through the code:

- **🔴 Red** = Command Flow (user input → processing)
- **🔵 Blue** = State Sync (data updates)
- **🟡 Yellow** = Game Initialization (startup)
- **🟢 Green** = Room System (environment)
- **🟣 Purple** = Combat System (battles)
- **🩷 Pink** = Light System (visibility)

### Stations
Circles on the lines represent:
- Classes (e.g., GameEngine, CommandParser)
- Modules (e.g., WebSocketServer)
- Functions (e.g., hasLight(), spawnNPCs())

### Interchanges
Larger circles show where multiple lines meet - these are integration points where different systems interact.

### Data Labels
Yellow boxes show important data types and structures that flow through the system.

## Common Questions

**Q: Can I edit the map?**  
A: Yes! Edit `subway-map-generator.js` and run `node subway-map-generator.js` to regenerate.

**Q: The map looks cluttered. Can I focus on one system?**  
A: Use the zoom controls to focus on specific areas. Each line/system is organized spatially.

**Q: How do I trace a specific feature?**  
A: Follow a colored line from start to end. For example, trace the red Command Flow line to see how user input is processed.

**Q: Can I use this in presentations?**  
A: Absolutely! Download the SVG or take screenshots. The visualization is MIT licensed.

## Next Steps

For detailed information about the architecture, see:
- [SUBWAY_MAP.md](./SUBWAY_MAP.md) - Full documentation
- [README.md](./README.md) - Project overview
- [GAME.md](./GAME.md) - Game design

## Regenerating the Map

If you modify the codebase and want to update the map:

```bash
node subway-map-generator.js
```

This will regenerate both `subway-map.svg` and `subway-map.html`.

---

**Happy exploring! 🚇**
