"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const GameEngine_js_1 = require("./game/GameEngine.js");
const WebSocketServer_js_1 = require("./websocket/WebSocketServer.js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const PORT = parseInt(process.env.PORT || '8080', 10);
// Resolve data directory - check multiple possible locations
function resolveDataDir() {
    const possiblePaths = [
        path.resolve(process.cwd(), 'data'), // Running from project root
        path.resolve(process.cwd(), '..', 'data'), // Running from server directory
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
async function loadRooms() {
    const roomsDir = path.join(DATA_DIR, 'rooms');
    const rooms = [];
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
                    }
                    else if (roomData.room) {
                        rooms.push(roomData.room);
                    }
                    else {
                        rooms.push(roomData);
                    }
                }
            }
        }
    }
    catch (error) {
        console.error('Error loading rooms:', error);
    }
    // If no rooms loaded, create a default starting room
    if (rooms.length === 0) {
        console.log('No room data found, creating default starting room');
        rooms.push(createDefaultStartingRoom());
    }
    return rooms;
}
function createDefaultStartingRoom() {
    try {
        // Try to load ROOM_001 from station_area.json
        const stationAreaPath = path.join(DATA_DIR, 'rooms', 'station_area.json');
        console.log(stationAreaPath);
        if (fs.existsSync(stationAreaPath)) {
            const content = fs.readFileSync(stationAreaPath, 'utf-8');
            const roomData = JSON.parse(content);
            // Handle both single room and array of rooms
            let rooms = [];
            if (Array.isArray(roomData)) {
                rooms = roomData;
            }
            else if (roomData.room) {
                rooms = [roomData.room];
            }
            else {
                rooms = [roomData];
            }
            // Find ROOM_001
            const room001 = rooms.find(room => room.identity?.id === 'ROOM_001');
            if (room001) {
                console.log('Loaded ROOM_001 from station_area.json');
                return room001;
            }
        }
    }
    catch (error) {
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
    const engine = new GameEngine_js_1.GameEngine();
    // Load room data
    const rooms = await loadRooms();
    await engine.loadRooms(rooms);
    // Start WebSocket server
    const wsHandler = new WebSocketServer_js_1.WebSocketHandler(PORT, engine, 'ROOM_001');
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
//# sourceMappingURL=index.js.map