import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

// Define directories in AppData (userData)
const userDataPath = app.getPath('userData');
const decksDir = path.join(userDataPath, 'decks');
const configFile = path.join(userDataPath, 'config.json');

// Ensure directories and config exist
if (!fs.existsSync(decksDir)) {
  fs.mkdirSync(decksDir, { recursive: true });
}

function initDefaultDecks() {
  const existingDecks = fs.readdirSync(decksDir);
  if (existingDecks.length === 0) {
    // Write a sample German vocabulary deck
    const sampleDeck = {
      id: 'default-deutsch-a1',
      name: 'Temel Almanca (A1)',
      description: 'Yeni başlayanlar için temel Almanca kelimeler (der/die/das renkli ve cümleli)',
      cards: [
        {
          id: 'card-1',
          type: 'noun',
          german: 'Hund',
          turkish: 'köpek',
          article: 'der',
          plural: 'Hunde',
          exampleGerman: 'Der Hund bellt im Garten.',
          exampleTurkish: 'Köpek bahçede havlıyor.',
          interval: 0,
          repetition: 0,
          efactor: 2.5,
          nextReviewDate: new Date().toISOString()
        },
        {
          id: 'card-2',
          type: 'noun',
          german: 'Katze',
          turkish: 'kedi',
          article: 'die',
          plural: 'Katzen',
          exampleGerman: 'Die Katze schläft auf dem Sofa.',
          exampleTurkish: 'Kedi kanepede uyuyor.',
          interval: 0,
          repetition: 0,
          efactor: 2.5,
          nextReviewDate: new Date().toISOString()
        },
        {
          id: 'card-3',
          type: 'noun',
          german: 'Buch',
          turkish: 'kitap',
          article: 'das',
          plural: 'Bücher',
          exampleGerman: 'Ich lese ein interessantes Buch.',
          exampleTurkish: 'İlginç bir kitap okuyorum.',
          interval: 0,
          repetition: 0,
          efactor: 2.5,
          nextReviewDate: new Date().toISOString()
        },
        {
          id: 'card-4',
          type: 'verb',
          german: 'gehen',
          turkish: 'gitmek',
          conjugation: {
            praesens: 'geht',
            praeteritum: 'ging',
            perfekt: 'ist gegangen'
          },
          exampleGerman: 'Wir gehen heute ins Kino.',
          exampleTurkish: 'Bugün sinemaya gidiyoruz.',
          interval: 0,
          repetition: 0,
          efactor: 2.5,
          nextReviewDate: new Date().toISOString()
        },
        {
          id: 'card-5',
          type: 'adjective',
          german: 'schön',
          turkish: 'güzel',
          comparison: {
            comparative: 'schöner',
            superlative: 'am schönsten'
          },
          exampleGerman: 'Das Wetter ist heute sehr schön.',
          exampleTurkish: 'Bugün hava çok güzel.',
          interval: 0,
          repetition: 0,
          efactor: 2.5,
          nextReviewDate: new Date().toISOString()
        }
      ]
    };
    fs.writeFileSync(path.join(decksDir, 'default-deutsch-a1.json'), JSON.stringify(sampleDeck, null, 2), 'utf-8');
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'Almanca Kelime Kartları',
    autoHideMenuBar: true
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

app.whenReady().then(() => {
  initDefaultDecks();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC Handlers ---

// Get all decks
ipcMain.handle('get-decks', async () => {
  try {
    const files = fs.readdirSync(decksDir);
    const decks = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(decksDir, file);
        const data = fs.readFileSync(filePath, 'utf-8');
        try {
          const deck = JSON.parse(data);
          decks.push(deck);
        } catch (e) {
          console.error(`Error parsing deck ${file}:`, e);
        }
      }
    }
    return decks;
  } catch (error) {
    console.error('Error in get-decks:', error);
    return [];
  }
});

// Save or update a deck
ipcMain.handle('save-deck', async (event, deck) => {
  try {
    if (!deck.id) {
      deck.id = 'deck-' + Date.now();
    }
    // Clean filename
    const filename = `${deck.id}.json`;
    const filePath = path.join(decksDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(deck, null, 2), 'utf-8');
    return { success: true, deck };
  } catch (error) {
    console.error('Error saving deck:', error);
    return { success: false, error: error.message };
  }
});

// Delete a deck
ipcMain.handle('delete-deck', async (event, deckId) => {
  try {
    const filename = `${deckId}.json`;
    const filePath = path.join(decksDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }
    return { success: false, error: 'Deck file not found' };
  } catch (error) {
    console.error('Error deleting deck:', error);
    return { success: false, error: error.message };
  }
});

// Export a deck
ipcMain.handle('export-deck', async (event, deck) => {
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Desteyi Dışarı Aktar',
      defaultPath: path.join(app.getPath('downloads'), `${deck.name}.json`),
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (filePath) {
      fs.writeFileSync(filePath, JSON.stringify(deck, null, 2), 'utf-8');
      return { success: true, path: filePath };
    }
    return { success: false, cancelled: true };
  } catch (error) {
    console.error('Error exporting deck:', error);
    return { success: false, error: error.message };
  }
});

// Import a deck
ipcMain.handle('import-deck', async () => {
  try {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Deste İçe Aktar',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile']
    });

    if (filePaths && filePaths.length > 0) {
      const sourcePath = filePaths[0];
      const fileData = fs.readFileSync(sourcePath, 'utf-8');
      const deck = JSON.parse(fileData);

      // Simple validation
      if (!deck.name || !Array.isArray(deck.cards)) {
        return { success: false, error: 'Geçersiz deste formatı. JSON dosyası "name" ve "cards" alanlarını içermelidir.' };
      }

      // Generate a new ID to avoid duplicates, or keep existing if safe
      deck.id = 'deck-' + Date.now();
      const filename = `${deck.id}.json`;
      const targetPath = path.join(decksDir, filename);
      fs.writeFileSync(targetPath, JSON.stringify(deck, null, 2), 'utf-8');

      return { success: true, deck };
    }
    return { success: false, cancelled: true };
  } catch (error) {
    console.error('Error importing deck:', error);
    return { success: false, error: error.message };
  }
});

// Get user configuration
ipcMain.handle('get-config', async () => {
  try {
    if (fs.existsSync(configFile)) {
      const data = fs.readFileSync(configFile, 'utf-8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Error reading config:', error);
    return {};
  }
});

// Save user configuration
ipcMain.handle('save-config', async (event, config) => {
  try {
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Error saving config:', error);
    return { success: false, error: error.message };
  }
});
