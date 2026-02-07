import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { GameEngine } from '../game/GameEngine.js';
import type { 
  GameSession, 
  ClientMessage, 
  ServerMessage,
  ResponseMessage,
  StateUpdateMessage,
  ErrorMessage,
  PlayerState
} from '../types/index.js';

export class WebSocketHandler {
  private wss: WSServer;
  private sessions: Map<string, GameSession> = new Map();
  private engine: GameEngine;
  private startingRoom: string;

  constructor(port: number, engine: GameEngine, startingRoom: string = 'ROOM_001') {
    this.engine = engine;
    this.startingRoom = startingRoom;
    
    this.wss = new WSServer({ port });
    
    this.wss.on('connection', (socket) => this.handleConnection(socket));
    this.wss.on('error', (error) => this.handleServerError(error));
    
    console.log(`WebSocket server listening on port ${port}`);
  }

  private handleConnection(socket: WebSocket): void {
    const sessionId = uuidv4();
    console.log(`New connection: ${sessionId}`);

    // Create temporary session (will be fully initialized on connect message)
    const session: GameSession = {
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

  private async handleMessage(session: GameSession, rawData: string): Promise<void> {
    session.lastActivity = Date.now();

    let message: ClientMessage;
    try {
      message = JSON.parse(rawData);
    } catch (e) {
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
        this.sendError(session, 'UNKNOWN_MESSAGE_TYPE', `Unknown message type: ${(message as any).type}`);
    }
  }

  private async handleConnect(session: GameSession, message: any): Promise<void> {
    // Check for saved state
    if (message.savedState) {
      try {
        const savedPlayer = JSON.parse(message.savedState) as PlayerState;
        session.player = savedPlayer;
        console.log(`Restored session for ${savedPlayer.name}`);
      } catch (e) {
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

  private async handleCommand(session: GameSession, message: any): Promise<void> {
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
        modalType: result.modalData.type as any,
        content: result.modalData.content,
      });
    }
  }

  private handleDisconnect(session: GameSession): void {
    console.log(`Disconnected: ${session.id}`);
    session.connected = false;
    this.sessions.delete(session.id);
  }

  private handleSocketError(session: GameSession, error: Error): void {
    console.error(`Socket error for ${session.id}:`, error.message);
  }

  private handleServerError(error: Error): void {
    console.error('WebSocket server error:', error.message);
  }

  private send(session: GameSession, message: ServerMessage): void {
    if (session.socket.readyState === WebSocket.OPEN) {
      session.socket.send(JSON.stringify(message));
    }
  }

  private sendError(session: GameSession, code: string, message: string): void {
    const errorMessage: ErrorMessage = {
      type: 'error',
      timestamp: Date.now(),
      sessionId: session.id,
      message,
      code,
    };
    this.send(session, errorMessage);
  }

  private sendStateUpdate(session: GameSession): void {
    const room = this.engine.getCurrentRoom(session);
    
    const stateUpdate: StateUpdateMessage = {
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

  private getIntroText(): string {
    return `You awaken in darkness. The stale air carries the scent of rust and decay. 
Your memories are fragmented—broken images of laboratories, warnings, and a world on fire.

As your eyes adjust, you realize you're in some kind of bunker. Emergency lights flicker 
overhead, casting long shadows across the debris-strewn floor. A distant alarm wails, 
then falls silent.

Something has changed. The containment systems are failing. You need to get out.

Type "help" for a list of commands.`;
  }

  // Broadcast to all connected sessions
  broadcast(message: ServerMessage, excludeSession?: string): void {
    for (const [id, session] of this.sessions) {
      if (id !== excludeSession && session.connected) {
        this.send(session, message);
      }
    }
  }

  // Get session count
  getSessionCount(): number {
    return this.sessions.size;
  }

  // Cleanup inactive sessions
  cleanupInactiveSessions(maxInactiveMs: number = 3600000): void {
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
  close(): Promise<void> {
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
