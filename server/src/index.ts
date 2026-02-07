import { GameEngine } from './game/GameEngine.js';
import { WebSocketHandler } from './websocket/WebSocketServer.js';
import type { Room } from './types/index.js';
import * as fs from 'fs';
import * as path from 'path';

const PORT = parseInt(process.env.PORT || '8080', 10);
// Resolve data directory - check multiple possible locations
function resolveDataDir(): string {
  const possiblePaths = [
    path.resolve(process.cwd(), 'data'),           // Running from project root
    path.resolve(process.cwd(), '..', 'data'),     // Running from server directory
    path.resolve(__dirname, '..', '..', '..', '..', 'data'), // Relative to compiled file
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log('Found data directory at:', p);
      return p;
    }
  }
  
  // Default fallback
  return possiblePaths[0];
}

const DATA_DIR = process.env.DATA_DIR || resolveDataDir();

async function loadRooms(): Promise<Room[]> {
  const roomsDir = path.join(DATA_DIR, 'rooms');
  const rooms: Room[] = [];

  try {
    if (fs.existsSync(roomsDir)) {
      const files = fs.readdirSync(roomsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = fs.readFileSync(path.join(roomsDir, file), 'utf-8');
          const roomData = JSON.parse(content);
          
          // Handle both single room and array of rooms
          if (Array.isArray(roomData)) {
            rooms.push(...roomData);
          } else if (roomData.room) {
            rooms.push(roomData.room);
          } else {
            rooms.push(roomData);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error loading rooms:', error);
  }

  // If no rooms loaded, create a default starting room
  if (rooms.length === 0) {
    console.log('No room data found, creating default starting room');
    rooms.push(createDefaultStartingRoom());
  }

  return rooms;
}

function createDefaultStartingRoom(): Room {
  try {
    // Try to load ROOM_001 from station_area.json
    const stationAreaPath = path.join(DATA_DIR, 'rooms', 'station_area.json');
    console.log(stationAreaPath)
    if (fs.existsSync(stationAreaPath)) {
      const content = fs.readFileSync(stationAreaPath, 'utf-8');
      const roomData = JSON.parse(content);
      
      // Handle both single room and array of rooms
      let rooms: any[] = [];
      if (Array.isArray(roomData)) {
        rooms = roomData;
      } else if (roomData.room) {
        rooms = [roomData.room];
      } else {
        rooms = [roomData];
      }
      
      // Find ROOM_001
      const room001 = rooms.find(room => room.identity?.id === 'ROOM_001');
      if (room001) {
        console.log('Loaded ROOM_001 from station_area.json');
        return room001;
      }
    }
  } catch (error) {
    console.warn('Failed to load ROOM_001 from station_area.json, using fallback:', error);
  }

  // Return a minimal fallback room if file loading fails
  throw new Error('Could not load room data from station_area.json');
}

async function main() {
  console.log('========================================');
  console.log('  SHADOW CHRONICLES - Game Server');
  console.log('========================================');
  console.log('');

  // Initialize game engine
  const engine = new GameEngine();

  // Load room data
  const rooms = await loadRooms();
  await engine.loadRooms(rooms);

  // Start WebSocket server
  const wsHandler = new WebSocketHandler(PORT, engine, 'ROOM_001');

  // Periodic cleanup of inactive sessions
  setInterval(() => {
    wsHandler.cleanupInactiveSessions();
  }, 300000); // Every 5 minutes

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await wsHandler.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nShutting down...');
    await wsHandler.close();
    process.exit(0);
  });

  console.log(`Server ready. Listening on ws://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop.');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
