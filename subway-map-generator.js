#!/usr/bin/env node

/**
 * Subway Map Generator for Shadow Chronicles Codebase
 * 
 * This tool analyzes the codebase and generates a subway-style map visualization
 * where:
 * - Stations = classes/modules/functions
 * - Lines = execution flows (different colors)
 * - Intersections = data sharing or calls
 * - Labels = data types/variables
 * - Routes = program logic paths
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants for rendering
const CHAR_WIDTH_ESTIMATE = 7; // Estimated pixel width per character for width calculations

// Define subway lines (execution flows)
const SUBWAY_LINES = {
  COMMAND_FLOW: {
    name: 'Command Flow Line',
    color: '#E41E26', // Red - like London Underground Central Line
    stations: [
      { id: 'user-input', name: 'User Input', module: 'Browser', type: 'entry' },
      { id: 'game-client', name: 'GameClient', module: 'client/GameClient.ts', type: 'orchestrator' },
      { id: 'websocket-client', name: 'WebSocket Send', module: 'Browser WebSocket API', type: 'transport' },
      { id: 'websocket-server', name: 'WebSocket Server', module: 'server/WebSocketServer.ts', type: 'transport' },
      { id: 'command-parser', name: 'Command Parser', module: 'server/CommandParser.ts', type: 'processor' },
      { id: 'game-engine', name: 'Game Engine', module: 'server/GameEngine.ts', type: 'core' },
      { id: 'command-handlers', name: 'Command Handlers', module: 'server/GameEngine.ts', type: 'handlers' }
    ]
  },
  STATE_SYNC: {
    name: 'State Synchronization Line',
    color: '#0098D8', // Blue - like London Underground Victoria Line
    stations: [
      { id: 'game-engine', name: 'Game Engine', module: 'server/GameEngine.ts', type: 'core' },
      { id: 'state-update-msg', name: 'State Update Message', module: 'shared/types', type: 'data' },
      { id: 'websocket-response', name: 'WebSocket Response', module: 'server/WebSocketServer.ts', type: 'transport' },
      { id: 'websocket-receive', name: 'WebSocket Receive', module: 'Browser WebSocket API', type: 'transport' },
      { id: 'state-manager', name: 'State Manager', module: 'client/StateManager.ts', type: 'persistence' },
      { id: 'local-storage', name: 'localStorage', module: 'Browser Storage', type: 'storage' },
      { id: 'ui-manager', name: 'UI Manager', module: 'client/UIManager.ts', type: 'display' }
    ]
  },
  GAME_INIT: {
    name: 'Game Initialization Line',
    color: '#FFD300', // Yellow - like London Underground Circle Line
    stations: [
      { id: 'main-entry', name: 'main.ts', module: 'client/main.ts', type: 'entry' },
      { id: 'game-client-init', name: 'GameClient.init()', module: 'client/GameClient.ts', type: 'initialization' },
      { id: 'ui-setup', name: 'UI Setup', module: 'client/UIManager.ts', type: 'initialization' },
      { id: 'websocket-connect', name: 'WebSocket Connect', module: 'Browser WebSocket API', type: 'connection' },
      { id: 'server-init', name: 'Server Init', module: 'server/index.ts', type: 'initialization' },
      { id: 'room-loader', name: 'Room Loader', module: 'server/GameEngine.ts', type: 'data-loader' },
      { id: 'player-restore', name: 'Player Restore', module: 'server/GameEngine.ts', type: 'initialization' }
    ]
  },
  ROOM_SYSTEM: {
    name: 'Room & Environment Line',
    color: '#00A166', // Green - like London Underground District Line
    stations: [
      { id: 'room-data', name: 'Room JSON Data', module: 'data/rooms/*.json', type: 'data' },
      { id: 'room-loader', name: 'Room Loader', module: 'server/GameEngine.ts', type: 'data-loader' },
      { id: 'room-state', name: 'Room State', module: 'shared/types/Room', type: 'state' },
      { id: 'room-descriptions', name: 'Room Descriptions', module: 'GameEngine.getDescription()', type: 'logic' },
      { id: 'exit-system', name: 'Exit System', module: 'GameEngine.processCommand(go)', type: 'logic' },
      { id: 'object-system', name: 'Object System', module: 'GameEngine.processCommand(take/drop)', type: 'logic' }
    ]
  },
  COMBAT_SYSTEM: {
    name: 'Combat & NPC Line',
    color: '#9B0058', // Purple - like London Underground Metropolitan Line
    stations: [
      { id: 'npc-spawn', name: 'NPC Spawn', module: 'GameEngine.spawnNPCs()', type: 'logic' },
      { id: 'combat-trigger', name: 'Combat Trigger', module: 'GameEngine.processCommand()', type: 'event' },
      { id: 'combat-state', name: 'Combat State', module: 'GameSession.inCombat', type: 'state' },
      { id: 'attack-handler', name: 'Attack Handler', module: 'GameEngine.attack()', type: 'handler' },
      { id: 'combat-message', name: 'Combat Message', module: 'shared/types/CombatMessage', type: 'data' }
    ]
  },
  LIGHT_SYSTEM: {
    name: 'Light & Darkness Line',
    color: '#F386A1', // Pink - custom color for magical theme
    stations: [
      { id: 'light-check', name: 'Light Check', module: 'GameEngine.hasLight()', type: 'logic' },
      { id: 'room-lighting', name: 'Room Lighting', module: 'Room.lighting', type: 'state' },
      { id: 'light-source-item', name: 'Light Source Item', module: 'InventoryItem', type: 'data' },
      { id: 'flashlight-flag', name: 'Flashlight Flag', module: 'player.flags[flashlight_on]', type: 'state' },
      { id: 'darkness-description', name: 'Darkness Description', module: 'Room.descriptions.dark', type: 'content' }
    ]
  }
};

// Define intersections (where lines meet - shared data/calls)
const INTERSECTIONS = [
  {
    stations: ['game-engine', 'game-engine'],
    lines: ['COMMAND_FLOW', 'STATE_SYNC'],
    type: 'hub',
    description: 'Central game logic hub'
  },
  {
    stations: ['websocket-server', 'websocket-response'],
    lines: ['COMMAND_FLOW', 'STATE_SYNC'],
    type: 'transfer',
    description: 'Message routing'
  },
  {
    stations: ['game-client', 'game-client-init'],
    lines: ['COMMAND_FLOW', 'GAME_INIT'],
    type: 'transfer',
    description: 'Client orchestration'
  },
  {
    stations: ['room-loader', 'room-loader'],
    lines: ['GAME_INIT', 'ROOM_SYSTEM'],
    type: 'transfer',
    description: 'Room data loading'
  },
  {
    stations: ['game-engine', 'combat-trigger'],
    lines: ['COMMAND_FLOW', 'COMBAT_SYSTEM'],
    type: 'conditional',
    description: 'Combat entry point'
  },
  {
    stations: ['game-engine', 'light-check'],
    lines: ['COMMAND_FLOW', 'LIGHT_SYSTEM'],
    type: 'conditional',
    description: 'Light system integration'
  }
];

// Generate SVG subway map
function generateSubwayMap() {
  const width = 1800;
  const height = 1400;
  const margin = 80;
  
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="background: #f5f5f5;">
  <defs>
    <!-- Define gradients and patterns -->
    <linearGradient id="paperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#fafafa;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e8e8e8;stop-opacity:1" />
    </linearGradient>
    
    <!-- Station marker -->
    <circle id="stationMarker" r="8" fill="white" stroke-width="3"/>
    
    <!-- Interchange marker -->
    <circle id="interchangeMarker" r="10" fill="white" stroke-width="4"/>
    
    <!-- Arrow marker for flow direction -->
    <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#666" />
    </marker>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#paperGrad)"/>
  
  <!-- Grid pattern for subway aesthetic -->
  ${generateGrid(width, height)}
  
  <!-- Title -->
  <text x="${width/2}" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#1a1a1a">
    Shadow Chronicles - Codebase Subway Map
  </text>
  <text x="${width/2}" y="65" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#666">
    Architecture Visualization - Stations represent modules, Lines show execution flows
  </text>
  
  <!-- Draw subway lines -->
  ${drawSubwayLines()}
  
  <!-- Draw stations -->
  ${drawStations()}
  
  <!-- Draw legend -->
  ${drawLegend(width, height, margin)}
  
  <!-- Draw data type labels -->
  ${drawDataLabels()}
</svg>`;
  
  return svg;
}

function generateGrid(width, height) {
  let grid = '<g id="grid" opacity="0.1">\n';
  const gridSize = 50;
  
  // Vertical lines
  for (let x = 0; x < width; x += gridSize) {
    grid += `  <line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="#999" stroke-width="0.5"/>\n`;
  }
  
  // Horizontal lines
  for (let y = 0; y < height; y += gridSize) {
    grid += `  <line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#999" stroke-width="0.5"/>\n`;
  }
  
  grid += '</g>\n';
  return grid;
}

function calculateStationPositions() {
  const positions = {};
  const startX = 150;
  const startY = 120;
  const lineSpacing = 200;
  const stationSpacing = 150;
  
  let lineIndex = 0;
  for (const [lineKey, line] of Object.entries(SUBWAY_LINES)) {
    const isHorizontal = lineIndex % 2 === 0;
    
    line.stations.forEach((station, idx) => {
      const key = station.id;
      
      if (positions[key]) {
        // Station already positioned (intersection)
        return;
      }
      
      if (isHorizontal) {
        positions[key] = {
          x: startX + idx * stationSpacing,
          y: startY + lineIndex * lineSpacing,
          station: station,
          line: lineKey
        };
      } else {
        positions[key] = {
          x: startX + lineIndex * 100,
          y: startY + idx * 120,
          station: station,
          line: lineKey
        };
      }
    });
    
    lineIndex++;
  }
  
  return positions;
}

function drawSubwayLines() {
  const positions = calculateStationPositions();
  let svg = '<g id="subway-lines">\n';
  
  for (const [lineKey, line] of Object.entries(SUBWAY_LINES)) {
    svg += `  <!-- ${line.name} -->\n`;
    svg += `  <g id="line-${lineKey}">\n`;
    
    // Draw line segments between consecutive stations
    for (let i = 0; i < line.stations.length - 1; i++) {
      const from = positions[line.stations[i].id];
      const to = positions[line.stations[i + 1].id];
      
      if (from && to) {
        // Draw thick line for subway aesthetic
        svg += `    <line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" 
          stroke="${line.color}" stroke-width="6" stroke-linecap="round" opacity="0.9"/>\n`;
        
        // Add subtle shadow
        svg += `    <line x1="${from.x}" y1="${from.y + 2}" x2="${to.x}" y2="${to.y + 2}" 
          stroke="#00000020" stroke-width="6" stroke-linecap="round"/>\n`;
      }
    }
    
    svg += `  </g>\n`;
  }
  
  svg += '</g>\n';
  return svg;
}

function drawStations() {
  const positions = calculateStationPositions();
  let svg = '<g id="stations">\n';
  
  // Count how many lines pass through each station
  const stationCounts = {};
  for (const [lineKey, line] of Object.entries(SUBWAY_LINES)) {
    line.stations.forEach(station => {
      stationCounts[station.id] = (stationCounts[station.id] || 0) + 1;
    });
  }
  
  for (const [id, pos] of Object.entries(positions)) {
    const isInterchange = stationCounts[id] > 1;
    const lineColor = SUBWAY_LINES[pos.line].color;
    
    // Station circle
    if (isInterchange) {
      // Larger circle for interchanges
      svg += `  <circle cx="${pos.x}" cy="${pos.y}" r="11" fill="white" stroke="${lineColor}" stroke-width="5" opacity="0.95"/>\n`;
      svg += `  <circle cx="${pos.x}" cy="${pos.y}" r="6" fill="${lineColor}" opacity="0.8"/>\n`;
    } else {
      svg += `  <circle cx="${pos.x}" cy="${pos.y}" r="8" fill="white" stroke="${lineColor}" stroke-width="3" opacity="0.95"/>\n`;
    }
    
    // Station name
    const nameY = pos.y - 18;
    svg += `  <text x="${pos.x}" y="${nameY}" text-anchor="middle" font-family="Arial, sans-serif" 
      font-size="11" font-weight="600" fill="#1a1a1a">${pos.station.name}</text>\n`;
    
    // Module path (smaller text)
    const moduleY = pos.y + 25;
    svg += `  <text x="${pos.x}" y="${moduleY}" text-anchor="middle" font-family="Arial, sans-serif" 
      font-size="8" fill="#666">${pos.station.module}</text>\n`;
  }
  
  svg += '</g>\n';
  return svg;
}

function drawLegend(width, height, margin) {
  const legendX = width - 350;
  const legendY = height - 480;
  
  let svg = `<g id="legend">\n`;
  
  // Legend box
  svg += `  <rect x="${legendX - 15}" y="${legendY - 15}" width="330" height="460" 
    fill="white" stroke="#333" stroke-width="2" rx="5" opacity="0.95"/>\n`;
  
  svg += `  <text x="${legendX}" y="${legendY + 5}" font-family="Arial, sans-serif" 
    font-size="16" font-weight="bold" fill="#1a1a1a">Legend</text>\n`;
  
  let y = legendY + 30;
  
  // Draw each line in legend
  svg += `  <text x="${legendX}" y="${y}" font-family="Arial, sans-serif" 
    font-size="12" font-weight="bold" fill="#333">Subway Lines (Execution Flows):</text>\n`;
  y += 20;
  
  for (const [lineKey, line] of Object.entries(SUBWAY_LINES)) {
    svg += `  <line x1="${legendX}" y1="${y - 5}" x2="${legendX + 30}" y2="${y - 5}" 
      stroke="${line.color}" stroke-width="5" stroke-linecap="round"/>\n`;
    svg += `  <text x="${legendX + 40}" y="${y}" font-family="Arial, sans-serif" 
      font-size="10" fill="#333">${line.name}</text>\n`;
    y += 18;
  }
  
  y += 10;
  
  // Station types
  svg += `  <text x="${legendX}" y="${y}" font-family="Arial, sans-serif" 
    font-size="12" font-weight="bold" fill="#333">Station Types:</text>\n`;
  y += 20;
  
  const stationTypes = [
    { type: 'entry', desc: 'Entry Points' },
    { type: 'core', desc: 'Core Logic' },
    { type: 'transport', desc: 'Transport/Communication' },
    { type: 'storage', desc: 'Data Storage' },
    { type: 'display', desc: 'UI Display' },
    { type: 'handler', desc: 'Event Handlers' }
  ];
  
  stationTypes.forEach(st => {
    svg += `  <circle cx="${legendX + 8}" cy="${y - 5}" r="6" fill="white" stroke="#666" stroke-width="2"/>\n`;
    svg += `  <text x="${legendX + 20}" y="${y}" font-family="Arial, sans-serif" 
      font-size="10" fill="#333">${st.desc}</text>\n`;
    y += 18;
  });
  
  y += 10;
  
  // Symbols
  svg += `  <text x="${legendX}" y="${y}" font-family="Arial, sans-serif" 
    font-size="12" font-weight="bold" fill="#333">Symbols:</text>\n`;
  y += 20;
  
  svg += `  <circle cx="${legendX + 8}" cy="${y - 5}" r="9" fill="white" stroke="#E41E26" stroke-width="4"/>\n`;
  svg += `  <text x="${legendX + 20}" y="${y}" font-family="Arial, sans-serif" 
    font-size="10" fill="#333">Interchange Station</text>\n`;
  y += 18;
  
  svg += `  <circle cx="${legendX + 8}" cy="${y - 5}" r="6" fill="white" stroke="#0098D8" stroke-width="3"/>\n`;
  svg += `  <text x="${legendX + 20}" y="${y}" font-family="Arial, sans-serif" 
    font-size="10" fill="#333">Regular Station</text>\n`;
  
  svg += `</g>\n`;
  return svg;
}

function drawDataLabels() {
  let svg = '<g id="data-labels">\n';
  
  // Add some key data type annotations
  const dataLabels = [
    { x: 400, y: 250, text: 'CommandMessage', subtext: 'type: "command"' },
    { x: 900, y: 350, text: 'StateUpdateMessage', subtext: 'player: PlayerState' },
    { x: 600, y: 550, text: 'Room', subtext: 'exits, objects, NPCs' },
    { x: 1100, y: 750, text: 'PlayerState', subtext: 'hp, mp, inventory' },
    { x: 400, y: 950, text: 'GameSession', subtext: 'socket, player, inCombat' }
  ];
  
  dataLabels.forEach(label => {
    svg += `  <g opacity="0.7">\n`;
    svg += `    <rect x="${label.x - 5}" y="${label.y - 15}" width="${label.text.length * CHAR_WIDTH_ESTIMATE + 10}" height="40" 
      fill="#FFF9E6" stroke="#D4A017" stroke-width="1" rx="3" stroke-dasharray="2,2"/>\n`;
    svg += `    <text x="${label.x}" y="${label.y}" font-family="Courier New, monospace" 
      font-size="10" font-weight="bold" fill="#8B6914">${label.text}</text>\n`;
    svg += `    <text x="${label.x}" y="${label.y + 12}" font-family="Courier New, monospace" 
      font-size="8" fill="#A0826D">${label.subtext}</text>\n`;
    svg += `  </g>\n`;
  });
  
  svg += '</g>\n';
  return svg;
}

// Generate the map
const svgContent = generateSubwayMap();

// Write to file
const outputPath = path.join(__dirname, 'subway-map.svg');
fs.writeFileSync(outputPath, svgContent);

console.log(`✓ Subway map generated: ${outputPath}`);

// Also generate an HTML viewer
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shadow Chronicles - Codebase Subway Map</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      background: #1a1a1a;
      color: #f5f5f5;
      overflow: hidden;
    }
    
    .container {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    
    header {
      background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
      padding: 20px 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      z-index: 10;
    }
    
    h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #fff;
    }
    
    .subtitle {
      font-size: 14px;
      color: #bbb;
      font-weight: 400;
    }
    
    .controls {
      margin-top: 15px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    
    button {
      background: #3498db;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
      font-weight: 500;
    }
    
    button:hover {
      background: #2980b9;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
    }
    
    button:active {
      transform: translateY(0);
    }
    
    .map-container {
      flex: 1;
      overflow: auto;
      background: #f5f5f5;
      padding: 20px;
      position: relative;
    }
    
    #subway-map {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0 auto;
      transition: transform 0.3s ease;
      cursor: grab;
    }
    
    #subway-map:active {
      cursor: grabbing;
    }
    
    .info-panel {
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(255, 255, 255, 0.95);
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 350px;
      display: none;
    }
    
    .info-panel.visible {
      display: block;
    }
    
    .info-panel h3 {
      color: #2c3e50;
      margin-bottom: 10px;
      font-size: 18px;
    }
    
    .info-panel p {
      color: #555;
      line-height: 1.6;
      font-size: 14px;
      margin-bottom: 8px;
    }
    
    .info-panel .close-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      background: #e74c3c;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;
      padding: 0;
    }
    
    .zoom-level {
      position: absolute;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 8px 12px;
      border-radius: 5px;
      font-size: 12px;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🚇 Shadow Chronicles - Codebase Subway Map</h1>
      <p class="subtitle">Interactive architecture visualization where stations represent modules and lines show execution flows</p>
      
      <div class="controls">
        <button onclick="zoomIn()">🔍 Zoom In</button>
        <button onclick="zoomOut()">🔍 Zoom Out</button>
        <button onclick="resetZoom()">↺ Reset View</button>
        <button onclick="toggleInfo()">ℹ️ About</button>
        <button onclick="downloadSVG()">💾 Download SVG</button>
      </div>
    </header>
    
    <div class="map-container" id="mapContainer">
      <div class="info-panel" id="infoPanel">
        <button class="close-btn" onclick="toggleInfo()">×</button>
        <h3>How to Read This Map</h3>
        <p><strong>Stations:</strong> Represent classes, modules, and functions in the codebase</p>
        <p><strong>Lines:</strong> Show execution flows and data paths, each color represents a different flow</p>
        <p><strong>Interchange Stations:</strong> Larger circles where multiple execution paths meet</p>
        <p><strong>Data Labels:</strong> Yellow boxes show key data types and structures</p>
        <p><strong>Navigation:</strong> Click and drag to pan, use zoom controls or mouse wheel</p>
      </div>
      
      <div id="subway-map">${svgContent}</div>
      
      <div class="zoom-level" id="zoomLevel">Zoom: 100%</div>
    </div>
  </div>
  
  <script>
    let currentZoom = 1;
    const mapElement = document.getElementById('subway-map');
    const zoomLevelDisplay = document.getElementById('zoomLevel');
    
    function updateZoom() {
      mapElement.style.transform = \`scale(\${currentZoom})\`;
      zoomLevelDisplay.textContent = \`Zoom: \${Math.round(currentZoom * 100)}%\`;
    }
    
    function zoomIn() {
      currentZoom = Math.min(currentZoom + 0.2, 3);
      updateZoom();
    }
    
    function zoomOut() {
      currentZoom = Math.max(currentZoom - 0.2, 0.5);
      updateZoom();
    }
    
    function resetZoom() {
      currentZoom = 1;
      updateZoom();
      document.getElementById('mapContainer').scrollTo(0, 0);
    }
    
    function toggleInfo() {
      document.getElementById('infoPanel').classList.toggle('visible');
    }
    
    function downloadSVG() {
      const svgData = document.querySelector('#subway-map svg').outerHTML;
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'shadow-chronicles-subway-map.svg';
      link.click();
      URL.revokeObjectURL(url);
    }
    
    // Mouse wheel zoom
    document.getElementById('mapContainer').addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          zoomIn();
        } else {
          zoomOut();
        }
      }
    });
    
    // Drag to pan
    let isDragging = false;
    let startX, startY, scrollLeft, scrollTop;
    const container = document.getElementById('mapContainer');
    
    container.addEventListener('mousedown', (e) => {
      if (e.target === container || e.target === mapElement || e.target.tagName === 'svg') {
        isDragging = true;
        startX = e.pageX - container.offsetLeft;
        startY = e.pageY - container.offsetTop;
        scrollLeft = container.scrollLeft;
        scrollTop = container.scrollTop;
      }
    });
    
    container.addEventListener('mouseleave', () => {
      isDragging = false;
    });
    
    container.addEventListener('mouseup', () => {
      isDragging = false;
    });
    
    container.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const y = e.pageY - container.offsetTop;
      const walkX = (x - startX) * 1.5;
      const walkY = (y - startY) * 1.5;
      container.scrollLeft = scrollLeft - walkX;
      container.scrollTop = scrollTop - walkY;
    });
    
    // Show info panel on first load
    setTimeout(() => {
      toggleInfo();
    }, 500);
  </script>
</body>
</html>`;

const htmlPath = path.join(__dirname, 'subway-map.html');
fs.writeFileSync(htmlPath, htmlContent);

console.log(`✓ Interactive HTML viewer generated: ${htmlPath}`);
console.log('\n🚇 Subway Map Generated Successfully!');
console.log('\nOpen subway-map.html in your browser to view the interactive map.');
console.log('Or view the SVG file directly: subway-map.svg');
