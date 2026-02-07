"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketHandler = void 0;
const ws_1 = require("ws");
const uuid_1 = require("uuid");
class WebSocketHandler {
    wss;
    sessions = new Map();
    engine;
    startingRoom;
    constructor(port, engine, startingRoom = 'ROOM_001') {
        this.engine = engine;
        this.startingRoom = startingRoom;
        this.wss = new ws_1.WebSocketServer({ port });
        this.wss.on('connection', (socket) => this.handleConnection(socket));
        this.wss.on('error', (error) => this.handleServerError(error));
        console.log(`WebSocket server listening on port ${port}`);
    }
    handleConnection(socket) {
        const sessionId = (0, uuid_1.v4)();
        console.log(`New connection: ${sessionId}`);
        // Create temporary session (will be fully initialized on connect message)
        const session = {
            id: sessionId,
            socket,
            player: this.engine.createNewPlayer('Unknown', this.startingRoom),
            connected: true,
            lastActivity: Date.now(),
            inCombat: false,
        };
        this.sessions.set(sessionId, session);
        socket.on('message', (data) => this.handleMessage(session, data.toString()));
        socket.on('close', () => this.handleDisconnect(session));
        socket.on('error', (error) => this.handleSocketError(session, error));
        // Send initial connection acknowledgment
        this.send(session, {
            type: 'response',
            timestamp: Date.now(),
            sessionId,
            text: `Connected. Session ID: ${sessionId}`,
            formatted: false,
        });
    }
    async handleMessage(session, rawData) {
        session.lastActivity = Date.now();
        let message;
        try {
            message = JSON.parse(rawData);
        }
        catch (e) {
            this.sendError(session, 'INVALID_JSON', 'Invalid message format');
            return;
        }
        switch (message.type) {
            case 'connect':
                await this.handleConnect(session, message);
                break;
            case 'command':
                await this.handleCommand(session, message);
                break;
            default:
                this.sendError(session, 'UNKNOWN_MESSAGE_TYPE', `Unknown message type: ${message.type}`);
        }
    }
    async handleConnect(session, message) {
        // Check for saved state
        if (message.savedState) {
            try {
                const savedPlayer = JSON.parse(message.savedState);
                session.player = savedPlayer;
                console.log(`Restored session for ${savedPlayer.name}`);
            }
            catch (e) {
                console.log('Failed to restore saved state, starting fresh');
            }
        }
        // If no saved state or restore failed, prompt for name
        if (session.player.name === 'Unknown') {
            this.send(session, {
                type: 'response',
                timestamp: Date.now(),
                sessionId: session.id,
                text: 'Welcome to Shadow Chronicles.\n\nWhat is your name, traveler?',
                formatted: true,
                className: 'intro',
            });
            return;
        }
        // Send welcome back message and current room
        const room = this.engine.getCurrentRoom(session);
        if (room) {
            const description = this.engine.getRoomDescription(room, session.player);
            this.send(session, {
                type: 'response',
                timestamp: Date.now(),
                sessionId: session.id,
                text: `Welcome back, ${session.player.name}.\n\n${description}`,
                formatted: true,
            });
            this.sendStateUpdate(session);
        }
    }
    async handleCommand(session, message) {
        const input = message.raw || message.command;
        if (!input) {
            this.sendError(session, 'EMPTY_COMMAND', 'No command provided');
            return;
        }
        // Handle name input for new players
        if (session.player.name === 'Unknown') {
            session.player.name = input.trim();
            session.player.location = this.startingRoom;
            const room = this.engine.getCurrentRoom(session);
            if (room) {
                session.player.visitedRooms.push(room.identity.id);
                const description = this.engine.getRoomDescription(room, session.player);
                this.send(session, {
                    type: 'response',
                    timestamp: Date.now(),
                    sessionId: session.id,
                    text: `Welcome, ${session.player.name}.\n\n${this.getIntroText()}\n\n${description}`,
                    formatted: true,
                    className: 'intro',
                });
                this.sendStateUpdate(session);
            }
            return;
        }
        // Process game command
        const result = await this.engine.processCommand(session, input);
        // Send response
        this.send(session, {
            type: 'response',
            timestamp: Date.now(),
            sessionId: session.id,
            text: result.message,
            formatted: true,
            className: result.success ? undefined : 'error',
        });
        // Send state update if there were changes
        if (result.stateChanges || result.roomChanged) {
            this.sendStateUpdate(session);
        }
        // Handle combat trigger
        if (result.combatTriggered) {
            this.send(session, {
                type: 'combat_start',
                timestamp: Date.now(),
                sessionId: session.id,
            });
        }
        // Handle modal data
        if (result.modalData) {
            this.send(session, {
                type: 'modal_open',
                timestamp: Date.now(),
                sessionId: session.id,
                modalType: result.modalData.type,
                content: result.modalData.content,
            });
        }
    }
    handleDisconnect(session) {
        console.log(`Disconnected: ${session.id}`);
        session.connected = false;
        this.sessions.delete(session.id);
    }
    handleSocketError(session, error) {
        console.error(`Socket error for ${session.id}:`, error.message);
    }
    handleServerError(error) {
        console.error('WebSocket server error:', error.message);
    }
    send(session, message) {
        if (session.socket.readyState === ws_1.WebSocket.OPEN) {
            session.socket.send(JSON.stringify(message));
        }
    }
    sendError(session, code, message) {
        const errorMessage = {
            type: 'error',
            timestamp: Date.now(),
            sessionId: session.id,
            message,
            code,
        };
        this.send(session, errorMessage);
    }
    sendStateUpdate(session) {
        const room = this.engine.getCurrentRoom(session);
        const stateUpdate = {
            type: 'state_update',
            timestamp: Date.now(),
            sessionId: session.id,
            player: {
                name: session.player.name,
                hp: session.player.hp,
                maxHp: session.player.maxHp,
                mp: session.player.mp,
                maxMp: session.player.maxMp,
                gold: session.player.gold,
                xp: session.player.xp,
                level: session.player.level,
                stats: session.player.stats,
                inventory: session.player.inventory,
                equippedItems: session.player.equippedItems,
                statusEffects: session.player.statusEffects,
                skills: session.player.skills,
                location: session.player.location,
                visitedRooms: session.player.visitedRooms,
                flags: session.player.flags,
            },
            room: room ? {
                identity: room.identity,
                lighting: room.lighting,
                environment: room.environment,
            } : undefined,
        };
        this.send(session, stateUpdate);
    }
    getIntroText() {
        return `You awaken in darkness. The stale air carries the scent of rust and decay. 
Your memories are fragmented—broken images of laboratories, warnings, and a world on fire.

As your eyes adjust, you realize you're in some kind of bunker. Emergency lights flicker 
overhead, casting long shadows across the debris-strewn floor. A distant alarm wails, 
then falls silent.

Something has changed. The containment systems are failing. You need to get out.

Type "help" for a list of commands.`;
    }
    // Broadcast to all connected sessions
    broadcast(message, excludeSession) {
        for (const [id, session] of this.sessions) {
            if (id !== excludeSession && session.connected) {
                this.send(session, message);
            }
        }
    }
    // Get session count
    getSessionCount() {
        return this.sessions.size;
    }
    // Cleanup inactive sessions
    cleanupInactiveSessions(maxInactiveMs = 3600000) {
        const now = Date.now();
        for (const [id, session] of this.sessions) {
            if (now - session.lastActivity > maxInactiveMs) {
                console.log(`Cleaning up inactive session: ${id}`);
                session.socket.close();
                this.sessions.delete(id);
            }
        }
    }
    // Graceful shutdown
    close() {
        return new Promise((resolve) => {
            for (const session of this.sessions.values()) {
                session.socket.close();
            }
            this.wss.close(() => {
                console.log('WebSocket server closed');
                resolve();
            });
        });
    }
}
exports.WebSocketHandler = WebSocketHandler;
//# sourceMappingURL=WebSocketServer.js.map