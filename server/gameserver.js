const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

// Game state management
const gameSessions = new Map();
let sessionIdCounter = 0;

// Create HTTP server for serving static files
const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './public/index.html';
    } else if (!filePath.startsWith('./public/')) {
        filePath = './public' + req.url;
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('404 Not Found');
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Game logic functions
function createNewGame(sessionId) {
    return {
        sessionId,
        party: [
            { name: 'Warrior', class: 'Warrior', level: 1, hp: 100, maxHp: 100, mp: 20, maxMp: 20, xp: 0, attack: 15, defense: 10, magic: 5, speed: 8 },
            { name: 'Mage', class: 'Mage', level: 1, hp: 60, maxHp: 60, mp: 80, maxMp: 80, xp: 0, attack: 8, defense: 5, magic: 20, speed: 10 },
            { name: 'Cleric', class: 'Cleric', level: 1, hp: 80, maxHp: 80, mp: 60, maxMp: 60, xp: 0, attack: 10, defense: 8, magic: 15, speed: 9 },
            { name: 'Rogue', class: 'Rogue', level: 1, hp: 70, maxHp: 70, mp: 30, maxMp: 30, xp: 0, attack: 12, defense: 7, magic: 8, speed: 15 }
        ],
        overworld: {
            playerX: 10,
            playerY: 10,
            currentMap: 'town'
        },
        inventory: [],
        gold: 100,
        story: { flags: {} }
    };
}

function handleBattle(gameState, action) {
    // Simple battle logic
    const enemies = [
        { name: 'Goblin', hp: 30, maxHp: 30, attack: 8, defense: 5, xpReward: 15, goldReward: 10 }
    ];
    
    if (!gameState.battle) {
        gameState.battle = {
            active: true,
            enemies: JSON.parse(JSON.stringify(enemies)),
            turn: 0,
            playerTurn: true,
            log: []
        };
    }

    const battle = gameState.battle;
    
    if (action.type === 'attack') {
        const character = gameState.party[action.characterIndex];
        const target = battle.enemies[action.targetIndex];
        
        if (target && target.hp > 0) {
            const damage = Math.max(1, character.attack - target.defense);
            target.hp -= damage;
            battle.log.push(`${character.name} attacks ${target.name} for ${damage} damage!`);
            
            if (target.hp <= 0) {
                battle.log.push(`${target.name} defeated!`);
                // Award XP and gold
                gameState.party.forEach(char => {
                    char.xp += target.xpReward;
                    // Level up logic
                    if (char.xp >= char.level * 100) {
                        char.level++;
                        char.maxHp += 10;
                        char.hp = char.maxHp;
                        char.maxMp += 5;
                        char.mp = char.maxMp;
                        char.attack += 2;
                        char.defense += 1;
                        char.magic += 2;
                        battle.log.push(`${char.name} leveled up to level ${char.level}!`);
                    }
                });
                gameState.gold += target.goldReward;
            }
        }
        
        // Enemy turn
        battle.enemies.forEach((enemy, idx) => {
            if (enemy.hp > 0) {
                const targetChar = gameState.party[Math.floor(Math.random() * gameState.party.length)];
                const damage = Math.max(1, enemy.attack - targetChar.defense);
                targetChar.hp = Math.max(0, targetChar.hp - damage);
                battle.log.push(`${enemy.name} attacks ${targetChar.name} for ${damage} damage!`);
            }
        });
        
        // Check if battle is over
        const allEnemiesDead = battle.enemies.every(e => e.hp <= 0);
        const allCharactersDead = gameState.party.every(c => c.hp <= 0);
        
        if (allEnemiesDead || allCharactersDead) {
            battle.active = false;
            if (allEnemiesDead) {
                battle.log.push('Victory!');
            } else {
                battle.log.push('Defeat!');
            }
        }
    }
    
    return battle;
}

function handleMovement(gameState, direction) {
    const { overworld } = gameState;
    const speed = 1;
    
    switch (direction) {
        case 'up':
            overworld.playerY -= speed;
            break;
        case 'down':
            overworld.playerY += speed;
            break;
        case 'left':
            overworld.playerX -= speed;
            break;
        case 'right':
            overworld.playerX += speed;
            break;
    }
    
    // Check for random encounters (10% chance)
    if (Math.random() < 0.1 && overworld.currentMap === 'dungeon') {
        gameState.battle = null; // Reset battle to trigger new one
        handleBattle(gameState, { type: 'start' });
        return { encounter: true };
    }
    
    return { encounter: false };
}

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('New client connected');
    
    let clientSessionId = null;
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'newGame':
                    sessionIdCounter++;
                    clientSessionId = sessionIdCounter;
                    const newGame = createNewGame(clientSessionId);
                    gameSessions.set(clientSessionId, newGame);
                    ws.send(JSON.stringify({
                        type: 'gameState',
                        sessionId: clientSessionId,
                        state: newGame
                    }));
                    break;
                    
                case 'loadGame':
                    if (data.saveData) {
                        sessionIdCounter++;
                        clientSessionId = sessionIdCounter;
                        const loadedGame = JSON.parse(data.saveData);
                        loadedGame.sessionId = clientSessionId;
                        gameSessions.set(clientSessionId, loadedGame);
                        ws.send(JSON.stringify({
                            type: 'gameState',
                            sessionId: clientSessionId,
                            state: loadedGame
                        }));
                    }
                    break;
                    
                case 'action':
                    if (clientSessionId && gameSessions.has(clientSessionId)) {
                        const gameState = gameSessions.get(clientSessionId);
                        
                        if (data.action === 'battle') {
                            const battleResult = handleBattle(gameState, data.battleAction);
                            ws.send(JSON.stringify({
                                type: 'battleUpdate',
                                battle: battleResult,
                                party: gameState.party
                            }));
                        } else if (data.action === 'move') {
                            const moveResult = handleMovement(gameState, data.direction);
                            ws.send(JSON.stringify({
                                type: 'moveUpdate',
                                overworld: gameState.overworld,
                                encounter: moveResult.encounter,
                                battle: gameState.battle
                            }));
                        } else if (data.action === 'changeMap') {
                            gameState.overworld.currentMap = data.mapName;
                            gameState.overworld.playerX = data.x || 10;
                            gameState.overworld.playerY = data.y || 10;
                            ws.send(JSON.stringify({
                                type: 'mapChange',
                                overworld: gameState.overworld
                            }));
                        }
                        
                        // Send updated state
                        ws.send(JSON.stringify({
                            type: 'gameState',
                            sessionId: clientSessionId,
                            state: gameState
                        }));
                    }
                    break;
                    
                case 'getState':
                    if (clientSessionId && gameSessions.has(clientSessionId)) {
                        ws.send(JSON.stringify({
                            type: 'gameState',
                            sessionId: clientSessionId,
                            state: gameSessions.get(clientSessionId)
                        }));
                    }
                    break;
            }
        } catch (error) {
            console.error('Error handling message:', error);
            ws.send(JSON.stringify({ type: 'error', message: error.message }));
        }
    });
    
    ws.on('close', () => {
        console.log('Client disconnected');
        // Keep session alive for reconnection
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
