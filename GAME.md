```markdown
# TEXT-BASED ADVENTURE GAME — CONSOLIDATED DESIGN SPECIFICATION (v1.0)

This document defines the **canonical design constraints, systems, and narrative framework** for a single-player text-based adventure game inspired by **Zork**, **Tomb Raider**, **D&D**, and **Final Fantasy–style mandatory subquests**.  
This file is intended to be used as **ground truth context** for all future LLM prompts related to content generation, system expansion, or implementation.

---

## 1. HIGH-LEVEL GAME CONCEPT

### Genre
- Single-player, text-based exploration adventure
- Post-nuclear dystopian setting
- Supernatural / pseudo-scientific horror

### Inspirations (Mechanical, Not Derivative)
- **Zork**: room-based exploration, verb–noun parser, environmental puzzles
- **Tomb Raider**: lone explorer, ruins, traversal challenges, artifacts
- **D&D (single-character)**: HP/MP, stats, combat progression
- **Final Fantasy**: mandatory subquests required for main story completion

### Player Role
- One persistent character
- No party members
- Exploration-focused with combat as a necessary obstacle

---

## 2. WORLD & SETTING

### Setting
- Dystopian post–nuclear war world
- Civilization collapsed
- Ruins of pre-war cities, bunkers, laboratories, temples
- Supernatural phenomena caused by reality destabilization

### Supernatural Logic
- Undead (zombies, ghouls, mutated beings) exist due to psionic fallout
- The boundary between mind and matter has weakened
- Reality is partially shaped by cognition

---

## 3. CORE NARRATIVE STRUCTURE

### Anchors
- **Total Anchors:** 5 (mandatory)
- Each anchor is a critical reality-stabilizing (or destabilizing) structure
- The game **cannot be completed without all anchors**

### Anchor Requirements
- Each anchor requires **15–25 rooms** to complete
- Each anchor includes:
  - Mandatory subquest chain
  - Exploration
  - Combat
  - Psionic interaction
  - A permanent world-state change

### Endgame
- Single ending
- Endgame unlocked only after all 5 anchors are resolved
- No branching endings

---

## 4. GAME LOOP

### Core Loop
1. Player is in a room
2. Receives:
   - Room description
   - Visible contents
   - Available exits
3. Player enters text commands
4. Player may:
   - Examine objects
   - Interact with items
   - Cast spells
   - Engage in combat
   - Move to another room

### Win Condition
- Explore the world
- Complete all anchor chains
- Reach the endgame

---

## 5. DEATH & FAILURE

### Death Handling
- Player can die from combat or hazards
- On death:
  - Player respawns in the **previous room**
  - **HP and MP penalties are applied**
- Enemies do **not** respawn
- Death has consequences but does not hard-reset progress

---

## 6. INPUT SYSTEM (PARSER)

### Grammar Model
- Verb–noun syntax
  - Examples:
    - `get hammer`
    - `read book`
    - `climb ladder`
    - `put sugar in jar`

### Parser Rules
- Finite list of valid verbs
- Defined synonym tables (e.g., `take` → `get`)
- Explicit object scoping rules
- Disambiguation syntax supported
- On failure:
  - Engine responds with “I don’t understand”
  - Provides suggested valid actions

---

## 7. PLAYER STATS & RESOURCES

### Core Resources
- **HP (Health Points)**: reduced by enemy attacks
- **MP (Mental Points)**: consumed by psionic spells

### Recovery
- Resting
- Medkits / potions
- Time passage

### Stats
- Traditional RPG stats (e.g., STR, INT, etc.)
- **Stats affect combat only**
- No stat checks for dialogue or exploration

---

## 8. COMBAT SYSTEM

### Combat Model
- Turn-based
- Automatically triggered on room entry if a hostile is present
- Cannot bypass combat if an enemy is present

### Enemy Persistence
- Enemies remain dead once defeated
- No respawn on player death

### Enemy Scope
- Limited enemy variety
- Categories:
  - Minor undead / creatures
  - Mutated wildlife
  - Psionically warped humans
  - Anchor guardians (bosses)

---

## 9. MAGIC SYSTEM (PSIONICS)

### Nature of Magic
- Pseudo-scientific psionics
- Mental effort manifests physical effects
- No external magical energy source

### Mechanics
- Spells consume MP
- Casting induces mental fatigue
- Fatigue recovers with rest/time

### Usage
- Combat and non-combat
- Can:
  - Affect enemies
  - Manipulate environments
  - Alter rooms (locks, barriers, traversal)

### Scope Control
- Small, fixed spell list
- Spells grow stronger with experience
- No large spell catalog

---

## 10. WORLD STATE & PROGRESSION

### World Mutation
- Rooms may change based on:
  - Story progression
  - Actions in other rooms
- Examples:
  - Flooded rooms drained later
  - Collapsed paths opened later
  - NPC dialogue updated

### Purpose
- Narrative-driven gating
- Prevents premature exploration
- Keeps player in region until story allows advancement

### Persistence
- Changes are mostly irreversible
- Save system is automatic

---

## 11. SUBQUEST STRUCTURE

### Subquests
- **All subquests are mandatory**
- Subquests are explicitly announced:
  - At game start
  - Upon anchor capture

### Design Rule
- Player is always told what the next objective is
- No hidden critical-path requirements
- No soft-locks

---

## 12. CONTENT ARCHITECTURE

### Room System
- All room data stored in JSON
- Reusable schema
- Must support:
  - Conditional descriptions
  - Conditional exits
  - Combat triggers
  - World-state flags
  - Spell interactions

### Data-Driven Design
- Narrative text separated from logic
- Rooms are declarative, not hardcoded
- Designed for LLM-assisted content expansion

---

## 13. SCOPE LIMITS (HARD CONSTRAINTS)

- Limited number of enemies
- Limited number of spells
- Boss encounters only during anchor arcs
- No branching endings
- No optional subquests
- No party system

---

## 14. DESIGN PHILOSOPHY

- Guided exploration, not sandbox
- Player agency exists at the **interaction level**, not the **story level**
- Tension maintained through:
  - Resource attrition
  - Mandatory combat
  - World-state consequences
- Complexity controlled through:
  - Hard caps
  - Reusable templates
  - Data-driven content

---

## 15. INTENDED USE OF THIS DOCUMENT

This document should be:
- Supplied as **context** to LLM prompts
- Treated as **authoritative**
- Used to generate:
  - Rooms
  - Anchors
  - Subquests
  - Enemies
  - Items
  - Spells
  - Narrative text
  - JSON schemas

Any future content must **conform strictly** to these constraints.
```
