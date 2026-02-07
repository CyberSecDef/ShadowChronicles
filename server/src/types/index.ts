// Re-export shared types
export * from '../../../shared/types/game.js';

// Server-specific types
import type { WebSocket } from 'ws';
import type { PlayerState } from '../../../shared/types/game.js';

export interface GameSession {
  id: string;
  socket: WebSocket;
  player: PlayerState;
  connected: boolean;
  lastActivity: number;
  inCombat: boolean;
  currentEnemy?: string;
}

export interface ParsedCommand {
  verb: string;
  noun?: string;
  preposition?: string;
  indirectObject?: string;
  raw: string;
  valid: boolean;
  errorMessage?: string;
}

export interface CommandResult {
  success: boolean;
  message: string;
  stateChanges?: Partial<PlayerState>;
  roomChanged?: boolean;
  combatTriggered?: boolean;
  modalData?: {
    type: string;
    content: string;
  };
}

export interface VerbHandler {
  verbs: string[];
  synonyms: Record<string, string>;
  handler: (session: GameSession, command: ParsedCommand) => Promise<CommandResult>;
}
