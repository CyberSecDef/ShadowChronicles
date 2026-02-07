// ============================================
// SHADOW CHRONICLES - State Manager
// Handles game state and localStorage persistence
// ============================================

const STORAGE_KEY = 'shadowchronicles_save';

interface PlayerState {
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  gold: number;
  xp: number;
  level: number;
  stats: Record<string, number>;
  inventory: any[];
  equippedItems: Record<string, string>;
  statusEffects: any[];
  location: string;
  visitedRooms: string[];
  flags: Record<string, boolean>;
}

interface RoomState {
  identity: {
    id: string;
    canonicalName: string;
  };
  lighting: any;
  environment: any;
}

interface GameState {
  player: PlayerState | null;
  currentRoom: RoomState | null;
  lastSaved: number;
}

export class StateManager {
  private state: GameState = {
    player: null,
    currentRoom: null,
    lastSaved: 0,
  };

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state = parsed;
        console.log('Loaded saved game state');
      }
    } catch (e) {
      console.warn('Failed to load saved state:', e);
    }
  }

  saveState(): void {
    try {
      this.state.lastSaved = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }

  clearState(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.state = {
      player: null,
      currentRoom: null,
      lastSaved: 0,
    };
  }

  updatePlayer(updates: Partial<PlayerState>): void {
    if (!this.state.player) {
      this.state.player = {
        name: 'Unknown',
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        gold: 0,
        xp: 0,
        level: 1,
        stats: { STR: 10, DEX: 10, INT: 10, WIS: 10, CHA: 10, CON: 10 },
        inventory: [],
        equippedItems: {},
        statusEffects: [],
        location: '',
        visitedRooms: [],
        flags: {},
      };
    }

    this.state.player = { ...this.state.player, ...updates };
  }

  updateRoom(updates: Partial<RoomState>): void {
    if (!this.state.currentRoom) {
      this.state.currentRoom = {
        identity: { id: '', canonicalName: '' },
        lighting: {},
        environment: {},
      };
    }

    this.state.currentRoom = { ...this.state.currentRoom, ...updates };
  }

  getPlayer(): PlayerState | null {
    return this.state.player;
  }

  getRoom(): RoomState | null {
    return this.state.currentRoom;
  }

  getSavedState(): PlayerState | null {
    return this.state.player;
  }

  getFullState(): GameState {
    return { ...this.state };
  }

  isVisited(roomId: string): boolean {
    return this.state.player?.visitedRooms.includes(roomId) || false;
  }

  getFlag(key: string): boolean {
    return this.state.player?.flags[key] || false;
  }

  setFlag(key: string, value: boolean): void {
    if (this.state.player) {
      this.state.player.flags[key] = value;
      this.saveState();
    }
  }

  getInventoryItem(itemId: string): any | undefined {
    return this.state.player?.inventory.find(item => item.id === itemId);
  }

  hasItem(itemId: string): boolean {
    return this.state.player?.inventory.some(item => item.id === itemId) || false;
  }

  getLastSaved(): Date | null {
    if (this.state.lastSaved) {
      return new Date(this.state.lastSaved);
    }
    return null;
  }
}
