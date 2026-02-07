import type { ParsedCommand } from '../types/index.js';

// Verb synonyms - maps various input verbs to canonical verbs
const VERB_SYNONYMS: Record<string, string> = {
  // Movement
  'go': 'go',
  'walk': 'go',
  'run': 'go',
  'move': 'go',
  'travel': 'go',
  'head': 'go',
  'n': 'go north',
  'north': 'go north',
  's': 'go south',
  'south': 'go south',
  'e': 'go east',
  'east': 'go east',
  'w': 'go west',
  'west': 'go west',
  'u': 'go up',
  'up': 'go up',
  'd': 'go down',
  'down': 'go down',
  'enter': 'go',
  'exit': 'go',
  'climb': 'climb',
  'jump': 'jump',
  'swim': 'swim',
  'dive': 'dive',

  // Examination
  'look': 'look',
  'l': 'look',
  'examine': 'examine',
  'x': 'examine',
  'inspect': 'examine',
  'read': 'read',
  'search': 'search',
  'listen': 'listen',
  'smell': 'smell',
  'taste': 'taste',

  // Manipulation
  'take': 'take',
  'get': 'take',
  'grab': 'take',
  'pick': 'take',
  'pickup': 'take',
  'drop': 'drop',
  'leave': 'drop',
  'put': 'put',
  'place': 'put',
  'insert': 'insert',
  'remove': 'remove',
  'wear': 'equip',
  'equip': 'equip',
  'wield': 'equip',
  'unequip': 'unequip',
  'unwield': 'unequip',
  'doff': 'unequip',

  // Interaction
  'open': 'open',
  'close': 'close',
  'shut': 'close',
  'lock': 'lock',
  'unlock': 'unlock',
  'push': 'push',
  'pull': 'pull',
  'turn': 'turn',
  'rotate': 'turn',
  'break': 'break',
  'smash': 'break',
  'hit': 'attack',
  'attack': 'attack',
  'fight': 'attack',
  'kill': 'attack',
  'stab': 'attack',
  'strike': 'attack',
  'touch': 'touch',
  'rub': 'rub',

  // Use
  'use': 'use',
  'light': 'light',
  'extinguish': 'extinguish',
  'burn': 'burn',
  'pour': 'pour',
  'fill': 'fill',
  'drink': 'drink',
  'eat': 'eat',
  'throw': 'throw',
  'toss': 'throw',
  'raise': 'raise',
  'lower': 'lower',
  'ring': 'ring',
  'knock': 'knock',
  'press': 'press',
  'wave': 'wave',
  'tie': 'tie',
  'untie': 'untie',

  // Communication
  'say': 'say',
  'speak': 'say',
  'shout': 'shout',
  'yell': 'shout',
  'ask': 'ask',
  'tell': 'tell',
  'talk': 'talk',
  'pray': 'pray',
  'cast': 'cast',

  // Meta
  'think': 'think',
  'wait': 'wait',
  'z': 'wait',
  'sleep': 'sleep',
  'rest': 'rest',
  'inventory': 'inventory',
  'i': 'inventory',
  'inv': 'inventory',
  'help': 'help',
  '?': 'help',
  'save': 'save',
  'load': 'load',
  'restore': 'load',
  'quit': 'quit',
  'q': 'quit',
  'restart': 'restart',
  'reset': 'restart',
  'status': 'status',
  'stats': 'status',
  'score': 'score',
  'map': 'map',
  'hint': 'hint',
  'hints': 'hint',
};

// Prepositions that can appear in commands
const PREPOSITIONS = [
  'in', 'into', 'on', 'onto', 'with', 'using', 'to', 'at',
  'from', 'off', 'under', 'behind', 'through', 'about', 'around'
];

// Articles to strip from input
const ARTICLES = ['a', 'an', 'the', 'some', 'my'];

export class CommandParser {
  parse(input: string): ParsedCommand {
    // Normalize input
    const normalized = input.toLowerCase().trim();
    
    if (!normalized) {
      return {
        verb: '',
        raw: input,
        valid: false,
        errorMessage: "Please enter a command.",
      };
    }

    // Tokenize
    const tokens = this.tokenize(normalized);
    
    if (tokens.length === 0) {
      return {
        verb: '',
        raw: input,
        valid: false,
        errorMessage: "I don't understand that.",
      };
    }

    // Get verb (first token)
    const firstToken = tokens[0];
    
    // Check for direct direction shortcuts
    const directionShortcut = VERB_SYNONYMS[firstToken];
    if (directionShortcut && directionShortcut.startsWith('go ')) {
      const direction = directionShortcut.split(' ')[1];
      return {
        verb: 'go',
        noun: direction,
        raw: input,
        valid: true,
      };
    }

    // Look up canonical verb
    const canonicalVerb = VERB_SYNONYMS[firstToken];
    if (!canonicalVerb) {
      return {
        verb: firstToken,
        raw: input,
        valid: false,
        errorMessage: `I don't know how to "${firstToken}".`,
      };
    }

    // Single word commands (look, inventory, help, etc.)
    if (tokens.length === 1) {
      return {
        verb: canonicalVerb,
        raw: input,
        valid: true,
      };
    }

    // Remove articles from remaining tokens
    const objectTokens = tokens.slice(1).filter(t => !ARTICLES.includes(t));
    
    if (objectTokens.length === 0) {
      return {
        verb: canonicalVerb,
        raw: input,
        valid: true,
      };
    }

    // Look for preposition to split direct/indirect object
    let prepositionIndex = -1;
    let preposition: string | undefined;
    
    for (let i = 0; i < objectTokens.length; i++) {
      if (PREPOSITIONS.includes(objectTokens[i])) {
        prepositionIndex = i;
        preposition = objectTokens[i];
        break;
      }
    }

    let noun: string;
    let indirectObject: string | undefined;

    if (prepositionIndex > 0) {
      // Has preposition - split into direct and indirect objects
      noun = objectTokens.slice(0, prepositionIndex).join(' ');
      indirectObject = objectTokens.slice(prepositionIndex + 1).join(' ') || undefined;
    } else if (prepositionIndex === 0) {
      // Preposition at start (e.g., "look at book")
      noun = objectTokens.slice(1).join(' ');
      preposition = objectTokens[0];
    } else {
      // No preposition - everything is the noun
      noun = objectTokens.join(' ');
    }

    return {
      verb: canonicalVerb,
      noun: noun || undefined,
      preposition,
      indirectObject,
      raw: input,
      valid: true,
    };
  }

  private tokenize(input: string): string[] {
    // Split on whitespace and filter empty strings
    return input.split(/\s+/).filter(token => token.length > 0);
  }

  // Get suggestions for partial input (for autocomplete)
  getSuggestions(partial: string): string[] {
    const normalized = partial.toLowerCase().trim();
    
    if (!normalized) return [];

    const suggestions: string[] = [];
    
    for (const verb of Object.keys(VERB_SYNONYMS)) {
      if (verb.startsWith(normalized)) {
        suggestions.push(verb);
      }
    }

    return suggestions.slice(0, 10);
  }

  // Get all valid verbs (for help display)
  getValidVerbs(): string[] {
    return [...new Set(Object.values(VERB_SYNONYMS))].sort();
  }
}
