// Game State
let ws = null;
let gameState = null;
let selectedCharacterIndex = null;
let canvas = null;
let ctx = null;
let keys = {};

// Sprite rendering
const TILE_SIZE = 32;
const COLORS = {
    grass: '#2d5016',
    path: '#8b7355',
    water: '#4a90e2',
    wall: '#555555',
    town: '#a0522d',
    dungeon: '#333333',
    player: '#ffd700',
    warrior: '#ff4444',
    mage: '#4444ff',
    cleric: '#ffff44',
    rogue: '#44ff44',
    enemy: '#ff0000'
};

// Map data
const MAPS = {
    town: {
        width: 20,
        height: 15,
        tiles: [],
        buildings: [
            { x: 5, y: 5, width: 3, height: 3, type: 'inn', name: 'Inn' },
            { x: 12, y: 5, width: 3, height: 3, type: 'shop', name: 'Shop' }
        ],
        exits: [
            { x: 19, y: 7, map: 'overworld', toX: 2, toY: 10 }
        ]
    },
    overworld: {
        width: 30,
        height: 20,
        tiles: [],
        buildings: [
            { x: 15, y: 10, width: 2, height: 2, type: 'dungeon', name: 'Dark Cave' }
        ],
        exits: [
            { x: 1, y: 10, map: 'town', toX: 18, toY: 7 }
        ]
    },
    dungeon: {
        width: 15,
        height: 15,
        tiles: [],
        buildings: [],
        exits: [
            { x: 7, y: 0, map: 'overworld', toX: 15, toY: 11 }
        ]
    }
};

// Initialize maps
function initMaps() {
    // Town - mostly paths with some grass
    MAPS.town.tiles = Array(MAPS.town.height).fill(null).map(() => 
        Array(MAPS.town.width).fill('path')
    );
    for (let y = 0; y < MAPS.town.height; y++) {
        for (let x = 0; x < MAPS.town.width; x++) {
            if (Math.random() < 0.2) {
                MAPS.town.tiles[y][x] = 'grass';
            }
        }
    }
    
    // Overworld - mix of terrain
    MAPS.overworld.tiles = Array(MAPS.overworld.height).fill(null).map(() => 
        Array(MAPS.overworld.width).fill('grass')
    );
    for (let y = 0; y < MAPS.overworld.height; y++) {
        for (let x = 0; x < MAPS.overworld.width; x++) {
            if (Math.random() < 0.1) {
                MAPS.overworld.tiles[y][x] = 'water';
            } else if (Math.random() < 0.15) {
                MAPS.overworld.tiles[y][x] = 'path';
            }
        }
    }
    
    // Dungeon - walls and paths
    MAPS.dungeon.tiles = Array(MAPS.dungeon.height).fill(null).map(() => 
        Array(MAPS.dungeon.width).fill('wall')
    );
    // Create corridors
    for (let y = 1; y < MAPS.dungeon.height - 1; y++) {
        for (let x = 1; x < MAPS.dungeon.width - 1; x++) {
            if (x === 7 || y === 7 || (x % 2 === 0 && y % 2 === 0)) {
                MAPS.dungeon.tiles[y][x] = 'path';
            }
        }
    }
    MAPS.dungeon.tiles[0][7] = 'path'; // Exit
}

// Initialize WebSocket connection
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('Connected to game server');
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
        console.log('Disconnected from server');
    };
}

// Handle server messages
function handleServerMessage(data) {
    switch (data.type) {
        case 'gameState':
            gameState = data.state;
            updateUI();
            if (!gameState.battle || !gameState.battle.active) {
                renderGame();
            }
            break;
            
        case 'battleUpdate':
            if (gameState) {
                gameState.battle = data.battle;
                gameState.party = data.party;
                updateBattle();
            }
            break;
            
        case 'moveUpdate':
            if (gameState) {
                gameState.overworld = data.overworld;
                if (data.encounter && data.battle) {
                    gameState.battle = data.battle;
                    showBattle();
                }
                renderGame();
            }
            break;
            
        case 'mapChange':
            if (gameState) {
                gameState.overworld = data.overworld;
                renderGame();
            }
            break;
            
        case 'error':
            console.error('Server error:', data.message);
            alert('Error: ' + data.message);
            break;
    }
}

// UI Functions
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function updateUI() {
    if (!gameState) return;
    
    // Update party status
    const partyStatus = document.getElementById('party-status');
    partyStatus.innerHTML = '';
    gameState.party.forEach((char, idx) => {
        const card = document.createElement('div');
        card.className = 'character-card';
        card.innerHTML = `
            <h4>${char.name} (${char.class})</h4>
            <p>Lv ${char.level} | HP: ${char.hp}/${char.maxHp}</p>
            <div class="hp-bar"><div class="hp-fill" style="width: ${(char.hp/char.maxHp)*100}%"></div></div>
            <p>MP: ${char.mp}/${char.maxMp}</p>
            <div class="mp-bar"><div class="mp-fill" style="width: ${(char.mp/char.maxMp)*100}%"></div></div>
            <p>XP: ${char.xp}/${char.level * 100}</p>
            <div class="xp-bar"><div class="xp-fill" style="width: ${(char.xp/(char.level*100))*100}%"></div></div>
            <p>ATK: ${char.attack} | DEF: ${char.defense} | MAG: ${char.magic} | SPD: ${char.speed}</p>
        `;
        partyStatus.appendChild(card);
    });
    
    // Update game info
    document.getElementById('gold-amount').textContent = gameState.gold;
    document.getElementById('current-location').textContent = 
        gameState.overworld.currentMap.charAt(0).toUpperCase() + 
        gameState.overworld.currentMap.slice(1);
    
    // Check for battle
    if (gameState.battle && gameState.battle.active) {
        showBattle();
    } else {
        hideBattle();
    }
}

function showBattle() {
    document.getElementById('battle-screen').classList.remove('hidden');
    updateBattle();
}

function hideBattle() {
    document.getElementById('battle-screen').classList.add('hidden');
}

function updateBattle() {
    if (!gameState || !gameState.battle) return;
    
    const battle = gameState.battle;
    
    // Update enemy display
    const enemyDisplay = document.getElementById('enemy-display');
    enemyDisplay.innerHTML = '<h4>Enemies</h4>';
    battle.enemies.forEach((enemy, idx) => {
        const card = document.createElement('div');
        card.className = 'enemy-card';
        card.innerHTML = `
            <h4>${enemy.name}</h4>
            <p>HP: ${Math.max(0, enemy.hp)}/${enemy.maxHp}</p>
            <div class="hp-bar"><div class="hp-fill" style="width: ${Math.max(0, (enemy.hp/enemy.maxHp)*100)}%"></div></div>
        `;
        enemyDisplay.appendChild(card);
    });
    
    // Update battle log
    const battleLog = document.getElementById('battle-log');
    battleLog.innerHTML = '<h4>Battle Log</h4>';
    battle.log.slice(-10).forEach(msg => {
        const p = document.createElement('p');
        p.textContent = msg;
        battleLog.appendChild(p);
    });
    battleLog.scrollTop = battleLog.scrollHeight;
    
    // Update character selection
    const charSelection = document.getElementById('character-selection');
    charSelection.innerHTML = '';
    gameState.party.forEach((char, idx) => {
        const btn = document.createElement('button');
        btn.className = 'character-select-btn';
        btn.textContent = `${char.name} (${char.hp}/${char.maxHp})`;
        btn.onclick = () => selectCharacter(idx);
        if (char.hp <= 0) {
            btn.classList.add('dead');
            btn.disabled = true;
        }
        if (selectedCharacterIndex === idx) {
            btn.classList.add('selected');
        }
        charSelection.appendChild(btn);
    });
    
    // Update target selection
    updateTargetSelection();
    
    // Check if battle is over
    if (!battle.active) {
        setTimeout(() => {
            hideBattle();
            if (gameState.battle) {
                gameState.battle = null;
            }
            // Heal party after battle
            gameState.party.forEach(char => {
                char.hp = Math.min(char.maxHp, char.hp + 20);
            });
            updateUI();
        }, 3000);
    }
}

function selectCharacter(idx) {
    selectedCharacterIndex = idx;
    updateBattle();
}

function updateTargetSelection() {
    if (!gameState || !gameState.battle) return;
    
    const targetSelection = document.getElementById('target-selection');
    targetSelection.innerHTML = '';
    
    if (selectedCharacterIndex !== null) {
        const label = document.createElement('p');
        label.textContent = 'Select Target:';
        label.style.color = '#ffd700';
        targetSelection.appendChild(label);
        
        gameState.battle.enemies.forEach((enemy, idx) => {
            if (enemy.hp > 0) {
                const btn = document.createElement('button');
                btn.className = 'target-btn';
                btn.textContent = `${enemy.name} (${enemy.hp} HP)`;
                btn.onclick = () => attack(idx);
                targetSelection.appendChild(btn);
            }
        });
    }
}

function attack(targetIndex) {
    if (selectedCharacterIndex === null) {
        alert('Please select a character first!');
        return;
    }
    
    ws.send(JSON.stringify({
        type: 'action',
        action: 'battle',
        battleAction: {
            type: 'attack',
            characterIndex: selectedCharacterIndex,
            targetIndex: targetIndex
        }
    }));
    
    selectedCharacterIndex = null;
}

// Rendering
function renderGame() {
    if (!ctx || !gameState) return;
    
    const map = MAPS[gameState.overworld.currentMap];
    if (!map) return;
    
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Camera position (center on player)
    const cameraX = Math.max(0, Math.min(
        gameState.overworld.playerX - Math.floor(canvas.width / TILE_SIZE / 2),
        map.width - Math.floor(canvas.width / TILE_SIZE)
    ));
    const cameraY = Math.max(0, Math.min(
        gameState.overworld.playerY - Math.floor(canvas.height / TILE_SIZE / 2),
        map.height - Math.floor(canvas.height / TILE_SIZE)
    ));
    
    // Render tiles
    for (let y = 0; y < Math.min(map.height, Math.ceil(canvas.height / TILE_SIZE)); y++) {
        for (let x = 0; x < Math.min(map.width, Math.ceil(canvas.width / TILE_SIZE)); x++) {
            const tileX = x + cameraX;
            const tileY = y + cameraY;
            
            if (tileX >= 0 && tileX < map.width && tileY >= 0 && tileY < map.height) {
                const tile = map.tiles[tileY][tileX];
                ctx.fillStyle = COLORS[tile] || COLORS.grass;
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                
                // Tile border
                ctx.strokeStyle = '#00000044';
                ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }
    
    // Render buildings
    map.buildings.forEach(building => {
        const screenX = (building.x - cameraX) * TILE_SIZE;
        const screenY = (building.y - cameraY) * TILE_SIZE;
        
        ctx.fillStyle = building.type === 'dungeon' ? COLORS.dungeon : COLORS.town;
        ctx.fillRect(screenX, screenY, building.width * TILE_SIZE, building.height * TILE_SIZE);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX, screenY, building.width * TILE_SIZE, building.height * TILE_SIZE);
        
        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(building.name, screenX + (building.width * TILE_SIZE) / 2, 
                     screenY + (building.height * TILE_SIZE) / 2);
    });
    
    // Render exits
    map.exits.forEach(exit => {
        const screenX = (exit.x - cameraX) * TILE_SIZE;
        const screenY = (exit.y - cameraY) * TILE_SIZE;
        
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 20px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('→', screenX + TILE_SIZE/2, screenY + TILE_SIZE/2 + 7);
    });
    
    // Render player
    const playerScreenX = (gameState.overworld.playerX - cameraX) * TILE_SIZE;
    const playerScreenY = (gameState.overworld.playerY - cameraY) * TILE_SIZE;
    
    // Player sprite (simple colored square)
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(playerScreenX + 4, playerScreenY + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(playerScreenX + 4, playerScreenY + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    
    // Player indicator
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('▼', playerScreenX + TILE_SIZE/2, playerScreenY - 5);
}

// Input handling
function handleKeyDown(e) {
    keys[e.key] = true;
    
    if (!gameState || !gameState.overworld) return;
    
    // Movement
    if (e.key === 'ArrowUp' || e.key === 'w') {
        movePlayer('up');
        e.preventDefault();
    } else if (e.key === 'ArrowDown' || e.key === 's') {
        movePlayer('down');
        e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'a') {
        movePlayer('left');
        e.preventDefault();
    } else if (e.key === 'ArrowRight' || e.key === 'd') {
        movePlayer('right');
        e.preventDefault();
    } else if (e.key === 'e' || e.key === 'E') {
        checkInteraction();
        e.preventDefault();
    }
}

function handleKeyUp(e) {
    keys[e.key] = false;
}

function movePlayer(direction) {
    if (!gameState || gameState.battle?.active) return;
    
    const map = MAPS[gameState.overworld.currentMap];
    let newX = gameState.overworld.playerX;
    let newY = gameState.overworld.playerY;
    
    switch (direction) {
        case 'up': newY--; break;
        case 'down': newY++; break;
        case 'left': newX--; break;
        case 'right': newX++; break;
    }
    
    // Check boundaries
    if (newX < 0 || newX >= map.width || newY < 0 || newY >= map.height) {
        return;
    }
    
    // Check collision with walls
    if (map.tiles[newY][newX] === 'wall' || map.tiles[newY][newX] === 'water') {
        return;
    }
    
    // Check for exits
    const exit = map.exits.find(e => e.x === newX && e.y === newY);
    if (exit) {
        ws.send(JSON.stringify({
            type: 'action',
            action: 'changeMap',
            mapName: exit.map,
            x: exit.toX,
            y: exit.toY
        }));
        return;
    }
    
    ws.send(JSON.stringify({
        type: 'action',
        action: 'move',
        direction: direction
    }));
}

function checkInteraction() {
    if (!gameState) return;
    
    const map = MAPS[gameState.overworld.currentMap];
    const px = gameState.overworld.playerX;
    const py = gameState.overworld.playerY;
    
    // Check if player is near a building
    const building = map.buildings.find(b => 
        px >= b.x && px < b.x + b.width &&
        py >= b.y && py < b.y + b.height
    );
    
    if (building) {
        showLocationMenu(building);
    }
}

function showLocationMenu(building) {
    const menu = document.getElementById('location-menu');
    const title = document.getElementById('location-title');
    const options = document.getElementById('location-options');
    
    title.textContent = building.name;
    options.innerHTML = '';
    
    if (building.type === 'inn') {
        const healBtn = document.createElement('button');
        healBtn.textContent = 'Rest (50 Gold)';
        healBtn.onclick = () => {
            if (gameState.gold >= 50) {
                gameState.gold -= 50;
                gameState.party.forEach(char => {
                    char.hp = char.maxHp;
                    char.mp = char.maxMp;
                });
                updateUI();
                alert('Party fully healed!');
                menu.classList.add('hidden');
            } else {
                alert('Not enough gold!');
            }
        };
        options.appendChild(healBtn);
    } else if (building.type === 'shop') {
        const infoP = document.createElement('p');
        infoP.textContent = 'Shop - Coming Soon!';
        infoP.style.color = '#ffd700';
        options.appendChild(infoP);
    } else if (building.type === 'dungeon') {
        const enterBtn = document.createElement('button');
        enterBtn.textContent = 'Enter Dungeon';
        enterBtn.onclick = () => {
            ws.send(JSON.stringify({
                type: 'action',
                action: 'changeMap',
                mapName: 'dungeon',
                x: 7,
                y: 1
            }));
            menu.classList.add('hidden');
        };
        options.appendChild(enterBtn);
    }
    
    menu.classList.remove('hidden');
}

// Save/Load functions
function saveGame() {
    if (!gameState) return;
    
    const saveData = JSON.stringify(gameState);
    localStorage.setItem('shadowChroniclesSave', saveData);
    alert('Game saved!');
}

function loadGame() {
    const saveData = localStorage.getItem('shadowChroniclesSave');
    if (saveData) {
        ws.send(JSON.stringify({
            type: 'loadGame',
            saveData: saveData
        }));
        showScreen('game-screen');
    } else {
        alert('No save data found!');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize canvas
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // Initialize maps
    initMaps();
    
    // Connect to server
    connectWebSocket();
    
    // Main menu buttons
    document.getElementById('new-game-btn').onclick = () => {
        ws.send(JSON.stringify({ type: 'newGame' }));
        showScreen('game-screen');
    };
    
    document.getElementById('load-game-btn').onclick = loadGame;
    
    document.getElementById('save-game-btn').onclick = saveGame;
    
    document.getElementById('return-menu-btn').onclick = () => {
        showScreen('main-menu');
        gameState = null;
    };
    
    document.getElementById('close-location-btn').onclick = () => {
        document.getElementById('location-menu').classList.add('hidden');
    };
    
    // Action buttons
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.onclick = () => {
            const action = btn.dataset.action;
            if (action === 'attack') {
                // Attack is handled by target selection
                if (selectedCharacterIndex === null) {
                    alert('Please select a character first!');
                }
            } else {
                alert(`${action} - Coming Soon!`);
            }
        };
    });
    
    // Keyboard input
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Render loop
    setInterval(() => {
        if (gameState && !gameState.battle?.active) {
            renderGame();
        }
    }, 100);
});
