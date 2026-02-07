// ============================================
// SHADOW CHRONICLES - UI Manager
// Handles all UI updates and interactions
// ============================================

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export class UIManager {
  private gameOutput: HTMLElement;
  private statusBar: Record<string, HTMLElement> = {};
  private panels: Record<string, HTMLElement> = {};
  private modals: Record<string, HTMLElement> = {};
  private roomsData: any[] = [];
  private visitedRooms: Set<string> = new Set();
  private currentRoomId: string = '';

  constructor() {
    this.gameOutput = document.getElementById('game-output')!;
    
    // Cache status bar elements
    this.statusBar = {
      playerName: document.getElementById('player-name')!,
      location: document.getElementById('location')!,
      hpBar: document.getElementById('hp-bar')!,
      hpText: document.getElementById('hp-text')!,
      mpBar: document.getElementById('mp-bar')!,
      mpText: document.getElementById('mp-text')!,
      gold: document.getElementById('gold')!,
      level: document.getElementById('level')!,
    };

    // Cache panels
    this.panels = {
      stats: document.getElementById('stats-panel')!,
      inventory: document.getElementById('inventory-panel')!,
      equipment: document.getElementById('equipment-panel')!,
      spells: document.getElementById('spells-panel')!,
      effects: document.getElementById('effects-panel')!,
    };

    // Cache modals
    this.modals = {
      overlay: document.getElementById('modal-overlay')!,
      title: document.getElementById('modal-title')!,
      content: document.getElementById('modal-content')!,
    };

    this.loadRoomsData();
  }

  addMessage(text: string, className: string = ''): void {
    const message = document.createElement('div');
    message.className = `message ${className}`;
    
    // Process text - convert markdown-like formatting
    const processed = this.processText(text);
    message.innerHTML = processed;
    
    this.gameOutput.appendChild(message);
    
    // Scroll to bottom
    this.gameOutput.scrollTop = this.gameOutput.scrollHeight;
  }

  private processText(text: string): string {
    // Convert line breaks to paragraphs
    const paragraphs = text.split('\n\n');
    let html = paragraphs.map(p => {
      // Skip empty paragraphs
      if (!p.trim()) return '';
      
      // Check if it's a list
      const lines = p.split('\n');
      if (lines.every(line => line.trim().startsWith('- ') || line.trim().startsWith('* '))) {
        const items = lines.map(line => `<li>${line.trim().substring(2)}</li>`).join('');
        return `<ul>${items}</ul>`;
      }
      
      // Process inline formatting
      let processed = p
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
      
      return `<p>${processed}</p>`;
    }).join('');
    
    return html;
  }

  clearMessages(): void {
    this.gameOutput.innerHTML = '';
  }

  updatePlayerDisplay(player: any): void {
    // Update status bar
    if (player.name) {
      this.statusBar.playerName.textContent = player.name;
    }
    
    // player.location is the room ID (e.g., "ROOM_001")
    // We need to find the room name for display
    if (player.location) {
      this.currentRoomId = player.location;
      const room = this.roomsData.find(r => r.identity.id === player.location);
      if (room) {
        this.statusBar.location.textContent = room.identity.canonicalName;
      } else {
        this.statusBar.location.textContent = player.location;
      }
    }

    // Track visited rooms
    if (player.visitedRooms) {
      this.visitedRooms = new Set(player.visitedRooms);
    }
    
    if (player.hp !== undefined && player.maxHp !== undefined) {
      const hpPercent = (player.hp / player.maxHp) * 100;
      this.statusBar.hpBar.style.width = `${hpPercent}%`;
      this.statusBar.hpText.textContent = `${player.hp}/${player.maxHp}`;
    }
    
    if (player.mp !== undefined && player.maxMp !== undefined) {
      const mpPercent = (player.mp / player.maxMp) * 100;
      this.statusBar.mpBar.style.width = `${mpPercent}%`;
      this.statusBar.mpText.textContent = `${player.mp}/${player.maxMp}`;
    }
    
    if (player.gold !== undefined) {
      this.statusBar.gold.textContent = `${player.gold} Gold`;
    }
    
    if (player.level !== undefined) {
      this.statusBar.level.textContent = `Lvl ${player.level}`;
    }

    // Update stats panel
    if (player.stats) {
      for (const [stat, value] of Object.entries(player.stats)) {
        const el = document.getElementById(`stat-${stat.toLowerCase()}`);
        if (el) {
          el.textContent = String(value);
        }
      }
    }

    // Update inventory
    if (player.inventory) {
      this.updateInventory(player.inventory);
    }

    // Update equipment
    if (player.equippedItems) {
      this.updateEquipment(player.equippedItems, player.inventory, player.flags || {});
    }

    // Update spells
    if (player.skills !== undefined) {
      this.updateSpells(player.skills);
    }

    // Update status effects
    if (player.statusEffects) {
      this.updateEffects(player.statusEffects);
    }
  }

  private updateInventory(inventory: any[]): void {
    if (inventory.length === 0) {
      this.panels.inventory.innerHTML = '<p class="empty-text">Empty</p>';
      return;
    }

    const html = inventory.map(item => `
      <div class="inventory-item" data-item-id="${item.id}">
        <span class="item-name">${item.name}</span>
        ${item.quantity > 1 ? `<span class="item-qty">x${item.quantity}</span>` : ''}
      </div>
    `).join('');

    this.panels.inventory.innerHTML = html;
  }

  private updateEquipment(equipment: any, inventory: any[], flags: Record<string, boolean>): void {
    const slots = ['weapon', 'armor', 'accessory', 'light'];
    
    // Create a map of all available items (from inventory + rooms)
    // For now we'll just use the equipment IDs directly since equipped items aren't in inventory
    for (const slot of slots) {
      const el = document.getElementById(`equip-${slot}`);
      if (el) {
        const slotName = slot === 'light' ? 'light_source' : slot;
        const itemId = equipment[slotName];
        
        if (itemId) {
          // Try to extract a readable name from the ID
          // Convert IDs like 'flashlight' or 'multi_tool_knife' to readable names
          const readableName = itemId
            .replace(/_/g, ' ')
            .split(' ')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          el.textContent = readableName;
          
          // If it's a light source, check if it's on and style accordingly
          if (slot === 'light') {
            const isOn = flags[`${itemId}_on`] || false;
            if (isOn) {
              el.style.color = '#ffffff'; // Bright white when on
              el.style.fontWeight = 'bold';
            } else {
              el.style.color = ''; // Default gray when off
              el.style.fontWeight = '';
            }
          }
        } else {
          el.textContent = '---';
          el.style.color = '';
          el.style.fontWeight = '';
        }
      }
    }
  }

  private updateSpells(spells: string[]): void {
    if (spells.length === 0) {
      this.panels.spells.innerHTML = '<p class="empty-text">None learned</p>';
      return;
    }

    const spellNames: Record<string, string> = {
      'mental_focus': 'Mental Focus',
      'telekinesis': 'Telekinesis',
      'mind_shield': 'Mind Shield',
      'psionic_blast': 'Psionic Blast',
      'neural_link': 'Neural Link',
    };

    const html = spells.map(spellId => {
      const displayName = spellNames[spellId] || spellId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      return `
        <div class="spell-item">
          <span class="spell-icon">✦</span>
          <span class="spell-name">${displayName}</span>
        </div>
      `;
    }).join('');

    this.panels.spells.innerHTML = html;
  }

  private updateEffects(effects: any[]): void {
    if (effects.length === 0) {
      this.panels.effects.innerHTML = '<p class="empty-text">None</p>';
      return;
    }

    const html = effects.map(effect => `
      <div class="effect-item">
        <span class="effect-icon">⚡</span>
        <span class="effect-name">${effect.name}</span>
        <span class="effect-duration">${effect.duration}t</span>
      </div>
    `).join('');

    this.panels.effects.innerHTML = html;
  }

  setConnectionStatus(status: ConnectionStatus): void {
    let indicator = document.querySelector('.connection-status');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'connection-status';
      indicator.innerHTML = '<span class="connection-dot"></span><span class="connection-text">Connected</span>';
      document.body.appendChild(indicator);
    }

    indicator.className = `connection-status ${status}`;
    const text = indicator.querySelector('.connection-text');
    
    if (text) {
      switch (status) {
        case 'connected':
          text.textContent = 'Connected';
          break;
        case 'connecting':
          text.textContent = 'Connecting...';
          break;
        case 'disconnected':
          text.textContent = 'Disconnected';
          break;
      }
    }
  }

  openModal(type: string, content?: string, data?: any): void {
    const titles: Record<string, string> = {
      map: '🗺️ Map',
      details: '📋 Details',
      hint: '💡 Hint',
      inventory: '🎒 Inventory',
      character: '👤 Character',
      help: '❓ Help',
    };

    this.modals.title.textContent = titles[type] || 'Information';
    
    if (content) {
      this.modals.content.innerHTML = this.processText(content);
    } else if (type === 'hint') {
      this.renderHint(data);
    } else if (type === 'help') {
      this.renderHelp();
    }

    this.modals.overlay.classList.remove('hidden');
  }

  closeModal(): void {
    this.modals.overlay.classList.add('hidden');
  }

  private renderHint(data?: any): void {
    const hint = data?.hint || 'No hints available at this time.';
    
    this.modals.content.innerHTML = `
      <div class="hint-container">
        <div class="hint-icon">💡</div>
        <div class="hint-text">${hint}</div>
        <p class="hint-warning">Hints may reduce the challenge of discovery!</p>
      </div>
    `;
  }

  private renderHelp(): void {
    this.modals.content.innerHTML = `
      <h4>Movement</h4>
      <p>Use <code>go [direction]</code> or just the direction name: <code>north</code>, <code>south</code>, <code>east</code>, <code>west</code>, <code>up</code>, <code>down</code></p>
      <p>Shortcuts: <code>n</code>, <code>s</code>, <code>e</code>, <code>w</code>, <code>u</code>, <code>d</code></p>

      <h4>Looking</h4>
      <ul>
        <li><code>look</code> - Examine your surroundings</li>
        <li><code>examine [object]</code> - Look closely at something</li>
      </ul>

      <h4>Items</h4>
      <ul>
        <li><code>take [item]</code> - Pick up an item</li>
        <li><code>drop [item]</code> - Drop an item</li>
        <li><code>inventory</code> or <code>i</code> - List your items</li>
        <li><code>use [item]</code> - Use an item</li>
      </ul>

      <h4>Interaction</h4>
      <ul>
        <li><code>open [object]</code> - Open a container or door</li>
        <li><code>close [object]</code> - Close something</li>
        <li><code>put [item] in [container]</code> - Place an item</li>
      </ul>

      <h4>Combat</h4>
      <ul>
        <li><code>attack</code> - Attack an enemy</li>
        <li><code>cast [spell]</code> - Cast a psionic spell</li>
      </ul>

      <h4>Other</h4>
      <ul>
        <li><code>rest</code> - Rest to recover HP/MP</li>
        <li><code>help</code> - Show this help</li>
      </ul>
    `;
  }

  showCombat(enemy?: any): void {
    const overlay = document.getElementById('combat-overlay');
    overlay?.classList.remove('hidden');

    if (enemy) {
      const nameEl = document.getElementById('enemy-name');
      const hpBar = document.getElementById('enemy-hp-bar');
      const hpText = document.getElementById('enemy-hp-text');

      if (nameEl) nameEl.textContent = enemy.name;
      if (hpBar) hpBar.style.width = `${(enemy.hp / enemy.maxHp) * 100}%`;
      if (hpText) hpText.textContent = `${enemy.hp}/${enemy.maxHp}`;
    }
  }

  hideCombat(): void {
    const overlay = document.getElementById('combat-overlay');
    overlay?.classList.add('hidden');
  }

  addCombatLog(message: string, type: string = ''): void {
    const log = document.getElementById('combat-log');
    if (log) {
      const entry = document.createElement('div');
      entry.className = `log-entry ${type}`;
      entry.textContent = message;
      log.appendChild(entry);
      log.scrollTop = log.scrollHeight;
    }
  }

  clearCombatLog(): void {
    const log = document.getElementById('combat-log');
    if (log) {
      log.innerHTML = '';
    }
  }

  showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    let container = document.getElementById('toast-container');
    
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  private async loadRoomsData(): Promise<void> {
    try {
      const response = await fetch('/data/rooms/station_area.json');
      this.roomsData = await response.json();
    } catch (error) {
      console.error('Failed to load rooms data:', error);
    }
  }

  showMap(): void {
    const overlay = document.getElementById('map-overlay');
    if (!overlay) return;

    overlay.classList.remove('hidden');
    this.renderMapSVG();
  }

  closeMap(): void {
    const overlay = document.getElementById('map-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  private renderMapSVG(): void {
    const svg = document.getElementById('map-svg') as unknown as SVGSVGElement;
    if (!svg || this.roomsData.length === 0) return;

    // Clear existing content
    svg.innerHTML = '';

    // Create a map of rooms by ID for quick lookup
    const roomsById = new Map();
    this.roomsData.forEach(room => {
      roomsById.set(room.identity.id, room);
    });

    // Calculate positions based on mapCoordinates
    const nodePositions = new Map();
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    this.roomsData.forEach(room => {
      const coords = room.meta?.mapCoordinates;
      if (coords) {
        nodePositions.set(room.identity.id, { x: coords.x, y: coords.y });
        minX = Math.min(minX, coords.x);
        maxX = Math.max(maxX, coords.x);
        minY = Math.min(minY, coords.y);
        maxY = Math.max(maxY, coords.y);
      }
    });

    // Calculate SVG dimensions and scaling
    const padding = 80;
    const nodeRadius = 25;
    const scaleX = 100;
    const scaleY = 100;
    
    const width = (maxX - minX) * scaleX + padding * 2;
    const height = (maxY - minY) * scaleY + padding * 2;
    
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());

    // Function to convert game coordinates to SVG coordinates
    const toSvgX = (x: number) => (x - minX) * scaleX + padding;
    const toSvgY = (y: number) => (maxY - y) * scaleY + padding; // Invert Y axis

    // Draw connections first (so they appear behind nodes)
    this.roomsData.forEach(room => {
      const roomId = room.identity.id;
      const pos = nodePositions.get(roomId);
      if (!pos) return;

      const exits = room.exits || {};
      Object.entries(exits).forEach(([direction, exit]: [string, any]) => {
        const targetRoomId = exit.to;
        if (!targetRoomId) return;

        const targetPos = nodePositions.get(targetRoomId);
        if (!targetPos) return;

        // Only draw each connection once (from lower ID to higher ID)
        if (roomId > targetRoomId) return;

        const x1 = toSvgX(pos.x);
        const y1 = toSvgY(pos.y);
        const x2 = toSvgX(targetPos.x);
        const y2 = toSvgY(targetPos.y);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1.toString());
        line.setAttribute('y1', y1.toString());
        line.setAttribute('x2', x2.toString());
        line.setAttribute('y2', y2.toString());
        
        const bothVisited = this.visitedRooms.has(roomId) && this.visitedRooms.has(targetRoomId);
        line.classList.add('map-connection');
        if (bothVisited) {
          line.classList.add('visited');
        }
        
        svg.appendChild(line);
      });
    });

    // Draw nodes
    this.roomsData.forEach(room => {
      const roomId = room.identity.id;
      const pos = nodePositions.get(roomId);
      if (!pos) return;

      const x = toSvgX(pos.x);
      const y = toSvgY(pos.y);

      // Create group for node
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.classList.add('map-node');
      
      const isVisited = this.visitedRooms.has(roomId);
      const isCurrent = roomId === this.currentRoomId;
      
      if (isCurrent) {
        g.classList.add('current');
      } else if (isVisited) {
        g.classList.add('visited');
      } else {
        g.classList.add('unvisited');
      }

      // Create circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x.toString());
      circle.setAttribute('cy', y.toString());
      circle.setAttribute('r', nodeRadius.toString());
      g.appendChild(circle);

      // Add room number text
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x.toString());
      text.setAttribute('y', (y + 4).toString()); // Offset for vertical centering
      
      // Extract room number from ID (e.g., "ROOM_001" -> "1")
      const roomNumber = roomId.replace('ROOM_', '').replace(/^0+/, '');
      text.textContent = roomNumber;
      g.appendChild(text);

      // Add title for tooltip
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = room.identity.canonicalName;
      g.appendChild(title);

      svg.appendChild(g);
    });
  }
}
