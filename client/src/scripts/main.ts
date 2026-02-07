// ============================================
// SHADOW CHRONICLES - Main Client Entry Point
// ============================================

import { GameClient } from './GameClient';

// Initialize game client when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const client = new GameClient();
  client.init();
  
  // Expose to window for debugging
  (window as any).gameClient = client;
});
