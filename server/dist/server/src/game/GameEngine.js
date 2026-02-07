"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEngine = void 0;
const CommandParser_js_1 = require("../parser/CommandParser.js");
// Default game configuration
const DEFAULT_CONFIG = {
    maxInventoryWeight: 100,
    baseHp: 100,
    baseMp: 50,
    xpPerLevel: 1000,
    deathHpPenalty: 20,
    deathMpPenalty: 10,
    restHpRecovery: 25,
    restMpRecovery: 15,
};
class GameEngine {
    rooms = new Map();
    config;
    parser;
    worldState = new Map();
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.parser = new CommandParser_js_1.CommandParser();
    }
    // Load game data
    async loadRooms(roomData) {
        for (const room of roomData) {
            this.rooms.set(room.identity.id, room);
        }
        console.log(`Loaded ${this.rooms.size} rooms`);
    }
    // Create a new player
    createNewPlayer(name, startingRoom) {
        return {
            name,
            gold: 0,
            hp: this.config.baseHp,
            maxHp: this.config.baseHp,
            mp: this.config.baseMp,
            maxMp: this.config.baseMp,
            xp: 0,
            level: 1,
            stats: {
                Physical: 10,
                Mental: 10,
                Resilience: 10,
            },
            inventory: [],
            equippedItems: {},
            statusEffects: [],
            skills: [],
            location: startingRoom,
            notes: [],
            visitedRooms: [],
            flags: {},
        };
    }
    // Get room by ID
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    // Get current room for a session
    getCurrentRoom(session) {
        return this.rooms.get(session.player.location);
    }
    // Process a player command
    async processCommand(session, input) {
        const command = this.parser.parse(input);
        if (!command.valid) {
            return {
                success: false,
                message: command.errorMessage || "I don't understand that command.",
            };
        }
        // Route to appropriate handler
        switch (command.verb) {
            case 'look':
                return this.handleLook(session, command);
            case 'go':
                return this.handleGo(session, command);
            case 'take':
                return this.handleTake(session, command);
            case 'drop':
                return this.handleDrop(session, command);
            case 'examine':
                return this.handleExamine(session, command);
            case 'inventory':
                return this.handleInventory(session, command);
            case 'use':
                return this.handleUse(session, command);
            case 'turn':
                return this.handleTurn(session, command);
            case 'light':
                return this.handleLight(session, command);
            case 'extinguish':
                return this.handleExtinguish(session, command);
            case 'open':
                return this.handleOpen(session, command);
            case 'close':
                return this.handleClose(session, command);
            case 'attack':
                return this.handleAttack(session, command);
            case 'cast':
                return this.handleCast(session, command);
            case 'rest':
                return this.handleRest(session, command);
            case 'help':
                return this.handleHelp(session, command);
            case 'restart':
                return this.handleRestart(session, command);
            case 'equip':
                return this.handleEquip(session, command);
            case 'unequip':
                return this.handleUnequip(session, command);
            default:
                return {
                    success: false,
                    message: `I don't know how to "${command.verb}".`,
                };
        }
    }
    // Generate room description
    getRoomDescription(room, player, verbose = false) {
        const hasLight = this.hasLight(room, player);
        // If room is dark and player has no light source, show dark description
        if (!hasLight) {
            return room.descriptions.dark;
        }
        // Room is lit (either naturally or by player's light source)
        const visited = player.visitedRooms.includes(room.identity.id);
        let description;
        // If room's natural lighting is off but player has light, use long description
        // If room is naturally lit, use initial/long/visited based on visit status
        if (!room.lighting.isLit && hasLight) {
            // Player is providing light in a naturally dark room
            description = room.descriptions.long;
        }
        else if (verbose || !visited) {
            // First visit or verbose look command
            description = visited ? room.descriptions.long : room.descriptions.initial;
        }
        else {
            // Subsequent visits
            description = room.descriptions.visited || room.descriptions.short;
        }
        // Check for dynamic variants based on room state
        for (const [variant, text] of Object.entries(room.descriptions.dynamicVariants)) {
            if (room.state[variant]) {
                description = text;
                break;
            }
        }
        // Add visible objects (exclude taken objects)
        const visibleObjects = room.objects.filter(obj => !obj.taken &&
            (obj.visibility === 'always' ||
                (obj.visibility === 'conditional' && (!obj.requiresLight || hasLight))));
        if (visibleObjects.length > 0) {
            const objectList = visibleObjects.map(obj => obj.name).join(', ');
            description += `\n\nYou can see: ${objectList}`;
        }
        // Add visible exits
        const visibleExits = Object.entries(room.exits)
            .filter(([_, exit]) => exit.visible)
            .map(([direction]) => direction);
        if (visibleExits.length > 0 && hasLight) {
            description += `\n\nExits: ${visibleExits.join(', ')}`;
        }
        // Add NPCs
        const visibleNpcs = room.npcs.filter(npc => this.checkNpcSpawnConditions(npc.spawnConditions, room, player));
        if (visibleNpcs.length > 0) {
            for (const npc of visibleNpcs) {
                description += `\n\n${npc.description}`;
            }
        }
        return description;
    }
    // Check if room has light
    hasLight(room, player) {
        if (room.lighting.isLit)
            return true;
        // Check if player has a light source equipped AND it's turned on
        if (player.equippedItems.light_source) {
            const lightId = player.equippedItems.light_source;
            const isOn = player.flags[`${lightId}_on`] || false;
            return isOn;
        }
        return false;
    }
    // Check NPC spawn conditions
    checkNpcSpawnConditions(conditions, room, player) {
        for (const condition of conditions) {
            switch (condition) {
                case 'darkness':
                    if (this.hasLight(room, player))
                        return false;
                    break;
                case 'light_present':
                    if (!this.hasLight(room, player))
                        return false;
                    break;
                // Add more conditions as needed
            }
        }
        return true;
    }
    // Check if an exit is passable
    canUseExit(exit, player) {
        if (!exit.requires) {
            return { allowed: true };
        }
        switch (exit.requires.type) {
            case 'item':
                const hasItem = player.inventory.some(item => item.id === exit.requires.id);
                if (!hasItem) {
                    return { allowed: false, message: exit.blockedMessage || "You can't go that way." };
                }
                break;
            case 'state':
                const stateValue = this.worldState.get(exit.requires.id) || false;
                if (!stateValue) {
                    return { allowed: false, message: exit.blockedMessage || "The way is blocked." };
                }
                break;
            case 'skill':
                const hasSkill = player.skills.includes(exit.requires.id);
                if (!hasSkill) {
                    return { allowed: false, message: exit.blockedMessage || "You lack the required skill." };
                }
                break;
            case 'stat':
                const statValue = player.stats[exit.requires.id];
                if (statValue < (exit.requires.value || 0)) {
                    return { allowed: false, message: exit.blockedMessage || "You're not capable of that." };
                }
                break;
        }
        return { allowed: true };
    }
    // Command Handlers
    async handleLook(session, command) {
        const room = this.getCurrentRoom(session);
        if (!room) {
            return { success: false, message: "Error: You are nowhere." };
        }
        if (command.noun) {
            // Look at specific object
            const obj = room.objects.find(o => o.id === command.noun ||
                o.name.toLowerCase().includes(command.noun.toLowerCase()) ||
                o.synonyms?.some(synonym => synonym.toLowerCase().includes(command.noun.toLowerCase())));
            if (obj) {
                // Check if this object teaches an ability
                if (obj.stateChanges?.ability_learned && !room.state[obj.stateChanges.ability_learned]) {
                    // Mark ability as learned
                    room.state[obj.stateChanges.ability_learned] = true;
                    // Add skill to player if not already learned
                    const skillId = obj.stateChanges.ability_learned;
                    if (!session.player.skills.includes(skillId)) {
                        session.player.skills.push(skillId);
                        return {
                            success: true,
                            message: obj.examineText || obj.description,
                            stateChanges: {
                                skills: session.player.skills,
                            },
                        };
                    }
                }
                return { success: true, message: obj.examineText || obj.description };
            }
            const npc = room.npcs.find(n => n.id === command.noun || n.name.toLowerCase().includes(command.noun.toLowerCase()));
            if (npc) {
                return { success: true, message: npc.description };
            }
            return { success: false, message: `You don't see any "${command.noun}" here.` };
        }
        const description = this.getRoomDescription(room, session.player, true);
        return { success: true, message: description };
    }
    async handleGo(session, command) {
        const room = this.getCurrentRoom(session);
        if (!room) {
            return { success: false, message: "Error: You are nowhere." };
        }
        const direction = command.noun?.toLowerCase();
        if (!direction) {
            return { success: false, message: "Go where?" };
        }
        const exit = room.exits[direction];
        if (!exit) {
            return { success: false, message: "You can't go that way." };
        }
        const canPass = this.canUseExit(exit, session.player);
        if (!canPass.allowed) {
            return { success: false, message: canPass.message };
        }
        // Move player
        const previousRoom = session.player.location;
        session.player.location = exit.to;
        // Mark room as visited
        if (!session.player.visitedRooms.includes(exit.to)) {
            session.player.visitedRooms.push(exit.to);
        }
        const newRoom = this.getRoom(exit.to);
        if (!newRoom) {
            session.player.location = previousRoom;
            return { success: false, message: "Error: That room doesn't exist." };
        }
        // Check for hostile NPCs (combat trigger)
        const hostileNpc = newRoom.npcs.find(npc => npc.hostile && this.checkNpcSpawnConditions(npc.spawnConditions, newRoom, session.player));
        let combatTriggered = false;
        let message = exit.travelText ? exit.travelText + '\n\n' : '';
        message += this.getRoomDescription(newRoom, session.player);
        if (hostileNpc) {
            message += `\n\n**${hostileNpc.name} attacks!**`;
            combatTriggered = true;
            session.inCombat = true;
            session.currentEnemy = hostileNpc.id;
        }
        return {
            success: true,
            message,
            roomChanged: true,
            combatTriggered,
            stateChanges: {
                location: exit.to,
                visitedRooms: session.player.visitedRooms,
            },
        };
    }
    async handleTake(session, command) {
        const room = this.getCurrentRoom(session);
        if (!room) {
            return { success: false, message: "Error: You are nowhere." };
        }
        if (!command.noun) {
            return { success: false, message: "Take what?" };
        }
        const obj = room.objects.find(o => o.takeable && !o.taken &&
            (o.id === command.noun ||
                o.name.toLowerCase().includes(command.noun.toLowerCase()) ||
                o.synonyms?.some(synonym => synonym.toLowerCase().includes(command.noun.toLowerCase()))));
        if (!obj) {
            return { success: false, message: `You can't take "${command.noun}".` };
        }
        // Check if already taken
        if (obj.taken) {
            return { success: false, message: `You've already taken that.` };
        }
        // Add to inventory
        session.player.inventory.push({
            id: obj.id,
            name: obj.name,
            description: obj.description,
            quantity: 1,
            equippable: obj.equipmentSlot !== undefined,
            equipmentSlot: obj.equipmentSlot,
            usable: true,
            weight: 1,
        });
        // Mark as taken (don't remove from room, just mark it)
        obj.taken = true;
        return {
            success: true,
            message: `You take the ${obj.name}.`,
            stateChanges: {
                inventory: session.player.inventory,
            },
        };
    }
    async handleDrop(session, command) {
        if (!command.noun) {
            return { success: false, message: "Drop what?" };
        }
        const itemIndex = session.player.inventory.findIndex(i => i.id === command.noun || i.name.toLowerCase().includes(command.noun.toLowerCase()));
        if (itemIndex === -1) {
            return { success: false, message: `You don't have "${command.noun}".` };
        }
        const item = session.player.inventory[itemIndex];
        session.player.inventory.splice(itemIndex, 1);
        return {
            success: true,
            message: `You drop the ${item.name}.`,
            stateChanges: {
                inventory: session.player.inventory,
            },
        };
    }
    async handleExamine(session, command) {
        return this.handleLook(session, command);
    }
    async handleInventory(session, _command) {
        if (session.player.inventory.length === 0) {
            return { success: true, message: "You are carrying nothing." };
        }
        const items = session.player.inventory.map(item => `  - ${item.name}${item.quantity > 1 ? ` (x${item.quantity})` : ''}`).join('\n');
        return { success: true, message: `You are carrying:\n${items}` };
    }
    async handleUse(session, command) {
        if (!command.noun) {
            return { success: false, message: "Use what?" };
        }
        const item = session.player.inventory.find(i => i.id === command.noun || i.name.toLowerCase().includes(command.noun.toLowerCase()));
        if (!item) {
            return { success: false, message: `You don't have "${command.noun}".` };
        }
        if (!item.usable) {
            return { success: false, message: `You can't use the ${item.name}.` };
        }
        // This would be expanded with specific item use handlers
        return { success: true, message: `You use the ${item.name}.` };
    }
    async handleTurn(session, command) {
        if (!command.noun) {
            return { success: false, message: "Turn what?" };
        }
        // Check if we have a preposition (on/off)
        let action = command.preposition;
        let itemName = command.noun;
        // If no preposition, try to parse from noun (e.g., "turn on flashlight" parsed as noun="on flashlight")
        if (!action) {
            const parts = command.noun.split(' ');
            if (parts.length < 2) {
                return { success: false, message: "Turn what on or off?" };
            }
            action = parts[0].toLowerCase();
            itemName = parts.slice(1).join(' ');
        }
        if (action === 'on') {
            return this.handleLight(session, { ...command, noun: itemName });
        }
        else if (action === 'off') {
            return this.handleExtinguish(session, { ...command, noun: itemName });
        }
        else {
            return { success: false, message: "You can only turn things on or off." };
        }
    }
    async handleLight(session, command) {
        if (!command.noun) {
            return { success: false, message: "Light what?" };
        }
        // Check if item is equipped in light_source slot
        const equippedLightId = session.player.equippedItems.light_source;
        if (!equippedLightId) {
            return { success: false, message: `You need to equip a light source first before you can turn it on.` };
        }
        // Find the equipped item definition to check if command matches
        let matchesEquipped = false;
        for (const [_, room] of this.rooms) {
            const obj = room.objects.find(o => o.id === equippedLightId &&
                (o.id === command.noun ||
                    o.name.toLowerCase().includes(command.noun.toLowerCase()) ||
                    o.synonyms?.some(synonym => synonym.toLowerCase().includes(command.noun.toLowerCase()))));
            if (obj) {
                matchesEquipped = true;
                break;
            }
        }
        if (!matchesEquipped) {
            return { success: false, message: `You don't have "${command.noun}" equipped as a light source.` };
        }
        // Check if already on
        if (session.player.flags[`${equippedLightId}_on`]) {
            return { success: false, message: "The light is already on." };
        }
        // Turn on the light
        session.player.flags[`${equippedLightId}_on`] = true;
        return {
            success: true,
            message: "You turn on the flashlight. A bright beam illuminates the area.",
            stateChanges: {
                flags: session.player.flags,
            },
        };
    }
    async handleExtinguish(session, command) {
        if (!command.noun) {
            return { success: false, message: "Extinguish what?" };
        }
        // Check if item is equipped in light_source slot
        const equippedLightId = session.player.equippedItems.light_source;
        if (!equippedLightId) {
            return { success: false, message: `You don't have a light source equipped.` };
        }
        // Find the equipped item definition to check if command matches
        let matchesEquipped = false;
        for (const [_, room] of this.rooms) {
            const obj = room.objects.find(o => o.id === equippedLightId &&
                (o.id === command.noun ||
                    o.name.toLowerCase().includes(command.noun.toLowerCase()) ||
                    o.synonyms?.some(synonym => synonym.toLowerCase().includes(command.noun.toLowerCase()))));
            if (obj) {
                matchesEquipped = true;
                break;
            }
        }
        if (!matchesEquipped) {
            return { success: false, message: `You don't have "${command.noun}" equipped as a light source.` };
        }
        // Check if already off
        if (!session.player.flags[`${equippedLightId}_on`]) {
            return { success: false, message: "The light is not on." };
        }
        // Turn off the light
        session.player.flags[`${equippedLightId}_on`] = false;
        return {
            success: true,
            message: "You turn off the flashlight. The beam of light disappears.",
            stateChanges: {
                flags: session.player.flags,
            },
        };
    }
    async handleOpen(session, command) {
        if (!command.noun) {
            return { success: false, message: "Open what?" };
        }
        return { success: false, message: `You can't open the ${command.noun}.` };
    }
    async handleClose(session, command) {
        if (!command.noun) {
            return { success: false, message: "Close what?" };
        }
        return { success: false, message: `You can't close the ${command.noun}.` };
    }
    async handleAttack(session, command) {
        if (!session.inCombat) {
            return { success: false, message: "There's nothing to attack here." };
        }
        // Basic combat placeholder
        return { success: true, message: "You attack!" };
    }
    async handleCast(session, command) {
        if (!command.noun) {
            return { success: false, message: "Cast what spell?" };
        }
        if (session.player.mp <= 0) {
            return { success: false, message: "You don't have enough mental energy to cast spells." };
        }
        // This would be expanded with specific spell handlers
        return { success: false, message: `You don't know a spell called "${command.noun}".` };
    }
    async handleRest(session, _command) {
        if (session.inCombat) {
            return { success: false, message: "You can't rest during combat!" };
        }
        const hpRecovered = Math.min(this.config.restHpRecovery, session.player.maxHp - session.player.hp);
        const mpRecovered = Math.min(this.config.restMpRecovery, session.player.maxMp - session.player.mp);
        session.player.hp += hpRecovered;
        session.player.mp += mpRecovered;
        return {
            success: true,
            message: `You rest for a while.\nHP recovered: ${hpRecovered}\nMP recovered: ${mpRecovered}`,
            stateChanges: {
                hp: session.player.hp,
                mp: session.player.mp,
            },
        };
    }
    async handleHelp(_session, _command) {
        const helpText = `
**Available Commands:**

**Movement:** go [direction], north, south, east, west, up, down
**Looking:** look, examine [object]
**Items:** take [item], drop [item], use [item], inventory
**Equipment:** equip [item], unequip [item]
**Light:** turn on [item], turn off [item], light [item], extinguish [item]
**Interaction:** open [object], close [object]
**Combat:** attack, cast [spell]
**Other:** rest, help, restart

**Tips:**
- Examine everything carefully
- Equip weapons, armor, accessories, and lights from your inventory
- Watch your HP and MP
- Some paths may require items or skills
- Use flashlights to light up dark areas
- Use 'restart' to begin again from the start
`;
        return { success: true, message: helpText };
    }
    async handleEquip(session, command) {
        if (!command.noun) {
            return { success: false, message: "Equip what?" };
        }
        // Find item in inventory
        const itemIndex = session.player.inventory.findIndex(i => i.id === command.noun || i.name.toLowerCase().includes(command.noun.toLowerCase()));
        if (itemIndex === -1) {
            return { success: false, message: `You don't have "${command.noun}".` };
        }
        const item = session.player.inventory[itemIndex];
        // Check if item is equippable
        if (!item.equippable || !item.equipmentSlot) {
            return { success: false, message: `You can't equip the ${item.name}.` };
        }
        const slot = item.equipmentSlot;
        // Check if slot already occupied
        const currentEquipped = session.player.equippedItems[slot];
        if (currentEquipped) {
            // Find the currently equipped item in inventory
            const currentItem = session.player.inventory.find(i => i.id === currentEquipped);
            if (currentItem) {
                return {
                    success: false,
                    message: `You already have ${currentItem.name} equipped in the ${slot} slot. Unequip it first.`
                };
            }
        }
        // Equip the item
        session.player.equippedItems[slot] = item.id;
        // Remove from inventory
        session.player.inventory.splice(itemIndex, 1);
        return {
            success: true,
            message: `You equip the ${item.name}.`,
            stateChanges: {
                inventory: session.player.inventory,
                equippedItems: session.player.equippedItems,
            },
        };
    }
    async handleUnequip(session, command) {
        if (!command.noun) {
            return { success: false, message: "Unequip what?" };
        }
        // Find which slot has the item
        let foundSlot = null;
        let equippedItemId = null;
        for (const [slot, itemId] of Object.entries(session.player.equippedItems)) {
            if (itemId) {
                // Check if the command matches this item by looking it up in rooms
                for (const [_, room] of this.rooms) {
                    const obj = room.objects.find(o => o.id === itemId &&
                        (o.id === command.noun ||
                            o.name.toLowerCase().includes(command.noun.toLowerCase()) ||
                            o.synonyms?.some(synonym => synonym.toLowerCase().includes(command.noun.toLowerCase()))));
                    if (obj) {
                        foundSlot = slot;
                        equippedItemId = itemId;
                        break;
                    }
                }
                if (foundSlot)
                    break;
            }
        }
        if (!foundSlot || !equippedItemId) {
            return { success: false, message: `You don't have "${command.noun}" equipped.` };
        }
        // Find the object definition to create inventory item
        let obj = null;
        for (const [_, room] of this.rooms) {
            obj = room.objects.find(o => o.id === equippedItemId);
            if (obj)
                break;
        }
        if (!obj) {
            return { success: false, message: "Error: Could not find item data." };
        }
        // Add back to inventory
        session.player.inventory.push({
            id: obj.id,
            name: obj.name,
            description: obj.description,
            quantity: 1,
            equippable: true,
            equipmentSlot: obj.equipmentSlot,
            usable: true,
            weight: 1,
        });
        // Remove from equipped slot
        delete session.player.equippedItems[foundSlot];
        return {
            success: true,
            message: `You unequip the ${obj.name}.`,
            stateChanges: {
                inventory: session.player.inventory,
                equippedItems: session.player.equippedItems,
            },
        };
    }
    async handleRestart(session, _command) {
        // Reset player to initial state
        session.player = this.createNewPlayer(session.player.name, 'ROOM_001');
        // Reset all room states (clear taken flags)
        for (const [_, room] of this.rooms) {
            // Reset object taken flags
            for (const obj of room.objects) {
                obj.taken = false;
            }
            // Reset room visited state
            room.state.visited = false;
        }
        return {
            success: true,
            message: "Game restarted. You awaken once again in the cryogenic chamber...",
            stateChanges: {
                inventory: session.player.inventory,
                location: 'ROOM_001',
                visitedRooms: []
            }
        };
    }
    // Set world state flag
    setWorldState(key, value) {
        this.worldState.set(key, value);
    }
    // Get world state flag
    getWorldState(key) {
        return this.worldState.get(key) || false;
    }
}
exports.GameEngine = GameEngine;
//# sourceMappingURL=GameEngine.js.map