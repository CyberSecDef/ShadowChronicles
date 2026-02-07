import { GameEngine } from '../game/GameEngine.js';
import type { ServerMessage } from '../types/index.js';
export declare class WebSocketHandler {
    private wss;
    private sessions;
    private engine;
    private startingRoom;
    constructor(port: number, engine: GameEngine, startingRoom?: string);
    private handleConnection;
    private handleMessage;
    private handleConnect;
    private handleCommand;
    private handleDisconnect;
    private handleSocketError;
    private handleServerError;
    private send;
    private sendError;
    private sendStateUpdate;
    private getIntroText;
    broadcast(message: ServerMessage, excludeSession?: string): void;
    getSessionCount(): number;
    cleanupInactiveSessions(maxInactiveMs?: number): void;
    close(): Promise<void>;
}
//# sourceMappingURL=WebSocketServer.d.ts.map