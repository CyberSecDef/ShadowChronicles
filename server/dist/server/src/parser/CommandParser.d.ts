import type { ParsedCommand } from '../types/index.js';
export declare class CommandParser {
    parse(input: string): ParsedCommand;
    private tokenize;
    getSuggestions(partial: string): string[];
    getValidVerbs(): string[];
}
//# sourceMappingURL=CommandParser.d.ts.map