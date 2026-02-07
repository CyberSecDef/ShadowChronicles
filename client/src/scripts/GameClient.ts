// ============================================
// SHADOW CHRONICLES - Game Client
// Handles WebSocket connection and UI updates
// ============================================

import { UIManager } from './UIManager';
import { StateManager } from './StateManager';

type MessageHandler = (data: any) => void;

export class GameClient {
  private socket: WebSocket | null = null;
  private sessionId: string | null = null;
  private ui: UIManager;
  private state: StateManager;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private commandHistory: string[] = [];
  private historyIndex = -1;

  constructor() {
    this.ui = new UIManager();
    this.state = new StateManager();
  }

  init(): void {
    this.setupUI();
    this.connect();
    this.setupMessageHandlers();
    this.loadSavedState();
  }

  private setupUI(): void {
    // Command input handling
    const input = document.getElementById('command-input') as HTMLInputElement;
    const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.sendCommand(input.value);
        input.value = '';
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateHistory(-1, input);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateHistory(1, input);
      }
    });

    sendBtn.addEventListener('click', () => {
      this.sendCommand(input.value);
      input.value = '';
      input.focus();
    });

    // Modal handling
    const modalClose = document.getElementById('modal-close');
    const modalOk = document.getElementById('modal-ok');
    const modalOverlay = document.getElementById('modal-overlay');

    modalClose?.addEventListener('click', () => this.ui.closeModal());
    modalOk?.addEventListener('click', () => this.ui.closeModal());
    modalOverlay?.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        this.ui.closeModal();
      }
    });

    // Map modal handling
    const mapBtn = document.getElementById('map-btn');
    const mapClose = document.getElementById('map-close');
    const mapOverlay = document.getElementById('map-overlay');

    mapBtn?.addEventListener('click', () => this.ui.showMap());
    mapClose?.addEventListener('click', () => this.ui.closeMap());
    mapOverlay?.addEventListener('click', (e) => {
      if (e.target === mapOverlay) {
        this.ui.closeMap();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.ui.closeModal();
        this.ui.closeMap();
      }
      if (e.key === 'm' && !this.isTypingInInput()) {
        this.ui.showMap();
      }
    });

    // Combat buttons
    document.querySelectorAll('.combat-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = (btn as HTMLElement).dataset.action;
        if (action) {
          this.sendCommand(action);
        }
      });
    });

    // Inventory item clicks
    document.getElementById('inventory-panel')?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const item = target.closest('.inventory-item');
      if (item) {
        const itemId = item.getAttribute('data-item-id');
        if (itemId) {
          this.sendCommand(`examine ${itemId}`);
        }
      }
    });
  }

  private connect(): void {
    const wsUrl = this.getWebSocketUrl();
    this.ui.setConnectionStatus('connecting');
    this.ui.addMessage('Connecting to server...', 'system');

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.ui.setConnectionStatus('connected');
        
        // Send connect message with saved state
        const savedState = this.state.getSavedState();
        this.send({
          type: 'connect',
          timestamp: Date.now(),
          sessionId: this.sessionId || '',
          savedState: savedState ? JSON.stringify(savedState) : undefined,
        });
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      };

      this.socket.onclose = () => {
        this.ui.setConnectionStatus('disconnected');
        this.attemptReconnect();
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.ui.addMessage('Connection error. Retrying...', 'error');
      };
    } catch (e) {
      console.error('Failed to create WebSocket:', e);
      this.attemptReconnect();
    }
  }

  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const port = 8080; // Game server port
    return `${protocol}//${host}:${port}`;
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.ui.addMessage('Unable to connect to server. Please refresh the page.', 'error');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    this.ui.addMessage(`Reconnecting in ${delay / 1000} seconds... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`, 'system');
    
    setTimeout(() => this.connect(), delay);
  }

  private setupMessageHandlers(): void {
    this.on('response', (data) => {
      this.ui.addMessage(data.text, data.className || 'response');
    });

    this.on('state_update', (data) => {
      if (data.player) {
        this.state.updatePlayer(data.player);
        this.ui.updatePlayerDisplay(data.player);
        
        // Save state to localStorage
        this.state.saveState();
      }
      
      if (data.room) {
        this.state.updateRoom(data.room);
      }
    });

    this.on('error', (data) => {
      this.ui.addMessage(`Error: ${data.message}`, 'error');
    });

    this.on('combat_start', (data) => {
      this.ui.showCombat(data.enemy);
    });

    this.on('combat_end', (data) => {
      this.ui.hideCombat();
      if (data.result === 'victory') {
        this.ui.addMessage('Victory!', 'response');
      } else if (data.result === 'defeat') {
        this.ui.addMessage('You have been defeated...', 'error');
      }
    });

    this.on('modal_open', (data) => {
      this.ui.openModal(data.modalType, data.content, data.data);
    });

    this.on('modal_close', () => {
      this.ui.closeModal();
    });
  }

  private handleMessage(data: any): void {
    // Store session ID
    if (data.sessionId && !this.sessionId) {
      this.sessionId = data.sessionId;
    }

    // Call registered handlers
    const handlers = this.messageHandlers.get(data.type);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  private on(type: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  private isTypingInInput(): boolean {
    const activeElement = document.activeElement;
    return activeElement instanceof HTMLInputElement || 
           activeElement instanceof HTMLTextAreaElement;
  }

  private send(message: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }

  sendCommand(input: string): void {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Add to history
    this.commandHistory.push(trimmed);
    if (this.commandHistory.length > 100) {
      this.commandHistory.shift();
    }
    this.historyIndex = this.commandHistory.length;

    // Display command in output
    this.ui.addMessage(trimmed, 'command');

    // Send to server
    this.send({
      type: 'command',
      timestamp: Date.now(),
      sessionId: this.sessionId || '',
      command: trimmed,
      raw: trimmed,
    });
  }

  private navigateHistory(direction: number, input: HTMLInputElement): void {
    const newIndex = this.historyIndex + direction;
    
    if (newIndex < 0 || newIndex > this.commandHistory.length) {
      return;
    }

    this.historyIndex = newIndex;
    
    if (newIndex === this.commandHistory.length) {
      input.value = '';
    } else {
      input.value = this.commandHistory[newIndex];
    }
    
    // Move cursor to end
    setTimeout(() => {
      input.selectionStart = input.selectionEnd = input.value.length;
    }, 0);
  }

  private loadSavedState(): void {
    const saved = this.state.getSavedState();
    if (saved) {
      this.ui.updatePlayerDisplay(saved);
    }
  }

  // Public API for debugging
  getState(): any {
    return this.state.getFullState();
  }

  clearState(): void {
    this.state.clearState();
    window.location.reload();
  }
}
