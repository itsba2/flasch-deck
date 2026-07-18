const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDecks: () => ipcRenderer.invoke('get-decks'),
  saveDeck: (deck) => ipcRenderer.invoke('save-deck', deck),
  deleteDeck: (deckId) => ipcRenderer.invoke('delete-deck', deckId),
  exportDeck: (deck) => ipcRenderer.invoke('export-deck', deck),
  importDeck: () => ipcRenderer.invoke('import-deck'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  getStats: () => ipcRenderer.invoke('get-stats'),
  saveStats: (stats) => ipcRenderer.invoke('save-stats', stats)
});
