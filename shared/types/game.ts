// ============================================
// SHARED TYPES FOR SHADOWCHRONICLES
// Used by both client and server
// ============================================

// Player Stats
export interface PlayerStats {
  Physical: number;
  Mental: number;
  Resilience: number;
}

// Status Effect
export interface StatusEffect {
  id: string;
  name: string;
  duration: number;
  effects: Record<string, number>;
}

// Inventory Item
export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  equippable: boolean;
  equipmentSlot?: 'weapon' | 'armor' | 'accessory' | 'light_source';
  usable: boolean;
  weight: number;
}

// Equipped Items
export interface EquippedItems {
  weapon?: string;
  armor?: string;
  accessory?: string;
  light_source?: string;
}

// Player State
export interface PlayerState {
  name: string;
  gold: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  xp: number;
  level: number;
  stats: PlayerStats;
  inventory: InventoryItem[];
  equippedItems: EquippedItems;
  statusEffects: StatusEffect[];
  skills: string[];
  location: string;
  notes: string[];
  visitedRooms: string[];
  flags: Record<string, boolean>;
}

// Room Exit
export interface RoomExit {
  to: string;
  visible: boolean;
  oneWay: boolean;
  requires: {
    type: 'item' | 'state' | 'skill' | 'stat';
    id: string;
    value?: number;
  } | null;
  blockedMessage: string | null;
  travelText: string;
}

// Room Object
export interface RoomObject {
  id: string;
  name: string;
  synonyms?: string[];
  description: string;
  initialLocation: 'room' | 'container' | 'hidden';
  visibility: 'always' | 'conditional' | 'hidden';
  requiresLight: boolean;
  takeable: boolean;
  taken: boolean;
  interactable: boolean;
  examineText: string;
  equipmentSlot?: 'weapon' | 'armor' | 'accessory' | 'light_source';
  stateChanges?: Record<string, string>;
}

// Room NPC
export interface RoomNPC {
  id: string;
  name: string;
  description: string;
  hostile: boolean;
  spawnConditions: string[];
  despawnConditions: string[];
  behavior: string;
  dialogue?: Record<string, string>;
}

// Room State
export interface RoomState {
  visited: boolean;
  [key: string]: boolean;
}

// Room Hook
export interface RoomHook {
  condition: string;
  action: string;
  params?: Record<string, unknown>;
}

// Room Definition
export interface Room {
  identity: {
    id: string;
    canonicalName: string;
    aliases: string[];
    region: string;
    zone: string;
  };
  descriptions: {
    initial: string;
    long: string;
    short: string;
    visited: string;
    dark: string;
    dynamicVariants: Record<string, string>;
  };
  lighting: {
    isLit: boolean;
    lightSourcesAllowed: boolean;
    darknessBehavior: {
      grueEnabled: boolean;
      suppressExits: boolean;
      suppressObjects: boolean;
    };
  };
  environment: {
    terrain: string;
    features: string[];
    hazards: string[];
    ambientSounds: string[];
    ambientSmells: string[];
  };
  exits: Record<string, RoomExit>;
  objects: RoomObject[];
  npcs: RoomNPC[];
  state: RoomState;
  hooks: {
    onEnter: RoomHook[];
    onExit: RoomHook[];
    onLook: RoomHook[];
  };
  specialVerbs: Record<string, {
    requires: string;
    effect: string;
    failureMessage: string;
  }>;
  progression: {
    requiredForCompletion: boolean;
    unlocksRegions: string[];
    shortcutCreated?: string;
  };
  meta: {
    mapCoordinates: { x: number; y: number; z: number };
    designerNotes: string;
  };
}

// WebSocket Message Types
export type MessageType = 
  | 'connect'
  | 'disconnect'
  | 'command'
  | 'response'
  | 'state_update'
  | 'error'
  | 'combat_start'
  | 'combat_end'
  | 'modal_open'
  | 'modal_close'
  | 'hint'
  | 'map_update';

// Base Message
export interface BaseMessage {
  type: MessageType;
  timestamp: number;
  sessionId: string;
}

// Client -> Server Messages
export interface CommandMessage extends BaseMessage {
  type: 'command';
  command: string;
  raw: string;
}

export interface ConnectMessage extends BaseMessage {
  type: 'connect';
  savedState?: string; // JSON string of saved state from localStorage
}

// Server -> Client Messages
export interface ResponseMessage extends BaseMessage {
  type: 'response';
  text: string;
  formatted: boolean;
  className?: string;
}

export interface StateUpdateMessage extends BaseMessage {
  type: 'state_update';
  player: Partial<PlayerState>;
  room?: Partial<Room>;
}

export interface ErrorMessage extends BaseMessage {
  type: 'error';
  message: string;
  code: string;
}

export interface CombatMessage extends BaseMessage {
  type: 'combat_start' | 'combat_end';
  enemy?: {
    id: string;
    name: string;
    hp: number;
    maxHp: number;
  };
  result?: 'victory' | 'defeat' | 'flee';
}

export interface ModalMessage extends BaseMessage {
  type: 'modal_open' | 'modal_close';
  modalType: 'map' | 'details' | 'hint' | 'inventory' | 'character';
  content?: string;
  data?: Record<string, unknown>;
}

export type ClientMessage = CommandMessage | ConnectMessage;
export type ServerMessage = ResponseMessage | StateUpdateMessage | ErrorMessage | CombatMessage | ModalMessage;
export type GameMessage = ClientMessage | ServerMessage;

// Game Configuration
export interface GameConfig {
  maxInventoryWeight: number;
  baseHp: number;
  baseMp: number;
  xpPerLevel: number;
  deathHpPenalty: number;
  deathMpPenalty: number;
  restHpRecovery: number;
  restMpRecovery: number;
}
