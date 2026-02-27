export const possibleLocations = [
  'N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8',
  'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8',
  'W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8',
  'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8'
] as const;

export const defaultActionLocations: ActionLocations = {
  S1: 'recognizeBoard',
  S2: 'bestMove',
  S3: 'resetPosition',
  S4: 'autoResponse',
  S5: 'undoMove',
  S6: 'skipMove',
  S7: 'scanMove',
  S8: 'analysisDuration',
  W1: 'promoteQueen',
  W2: 'promoteRook',
  W3: 'promoteBishop',
  W4: 'promoteKnight',
  E1: 'selectRegion',
  E2: 'draggingMode',
  E7: 'loadHashes',
  E8: 'perspective'
};

export const preferenceConfig: { [T in Preference]: PreferenceConfig<T> } = {
  alwaysOnTop: {
    label: 'Always on top',
    description: 'Always show this window on top of other windows',
    defaultValue: true
  },
  autoResponse: {
    label: 'Auto response',
    description: 'Automatically play the best move after the opponent\'s move',
    defaultValue: false
  },
  autoScan: {
    label: 'Auto scan',
    description: 'Automatically start detecting a move after making a move',
    defaultValue: false
  },
  autoQueen: {
    label: 'Auto queen',
    description: 'Pawns are automatically assumed to be promoted to Queen',
    defaultValue: false
  },
  autoPromotion: {
    label: 'Auto promotion',
    description: 'Assume chess.com/lichess.org interface for pawn promotion',
    defaultValue: true
  },
  perspective: {
    label: 'Is White\'s perspective',
    description: 'Board orientation',
    defaultValue: true
  },
  draggingMode: {
    label: 'Dragging',
    description: 'Whether the mouse should perform dragging or clicking motion',
    defaultValue: true
  },
  actionRegion: {
    label: 'Actions',
    description: 'Enable action regions',
    defaultValue: false
  },
  actionLocations: {
    label: 'Action regions',
    description: 'Locations of action regions',
    defaultValue: defaultActionLocations
  },
  showEvalBar: {
    label: 'Show eval bar',
    description: 'Show the evaluation bar',
    defaultValue: true
  },
  showArrows: {
    label: 'Show arrows',
    description: 'Highlight best moves with arrows on the board',
    defaultValue: true
  },
  showNotation: {
    label: 'Show notation',
    description: 'Show coordinates (1-8 and a-h) on the board',
    defaultValue: true
  },
  showCursor: {
    label: 'Show cursor',
    description: 'Show in the app where the cursor is inside the region',
    defaultValue: true
  },
  showRegion: {
    label: 'Show region',
    description: 'Show the selected region on screen',
    defaultValue: true
  },
  showActionRegion: {
    label: 'Show action regions',
    description: 'Show action regions on screen',
    defaultValue: true
  },
  analysisDuration: {
    label: 'Analysis duration (ms)',
    description: 'Time allotted for the engine to find the best move',
    defaultValue: 1000,
    sliderValues: [100, 300, 1000, 3000, 5000, 10000]
  },
  multiPV: {
    label: 'Multiple lines',
    description: 'How many best moves to calculate',
    defaultValue: 1,
    sliderValues: [1, 2, 3, 4, 5, 10, 20]
  },
  engineThreads: {
    label: 'Threads',
    description: 'How many threads can the engine use',
    defaultValue: 1,
    sliderValues: [...Array(33).keys()].slice(1)
  },
  mouseSpeed: {
    label: 'Mouse speed',
    description: 'How fast the mouse should move when playing a move',
    defaultValue: 50000,
    sliderValues: [500, 1000, 2000, 10000, 50000]
  },
  region: {
    label: 'Region',
    description: 'Region on the screen where the game board is located',
    defaultValue: null
  },
  enginePath: {
    label: 'Engine path',
    description: 'Path to the external engine',
    defaultValue: null
  },
  screenshotLength: {
    label: 'screenshotLength',
    description: 'screenshotLength',
    defaultValue: 1
  },
  recognizerModel: {
    label: 'Recognizer model',
    description: 'Pixel colors and hashes of piece images for Recognizer',
    defaultValue: null
  },
  recognizerPutKings: {
    label: 'Put kings',
    description: 'Automatically add missing kings during position recognition',
    defaultValue: true
  },
  autoCastling: {
    label: 'Auto castling',
    description: 'Enable castling rights when possible',
    defaultValue: true
  }
};

export const preferenceNames = Object.keys(preferenceConfig) as Preference[];

export const actionDescriptions: Partial<Record<Action, string>> = {
  selectRegion: 'Go to region selection mode',
  loadHashes: 'Load piece image hashes',
  scanMove: 'Start detecting a move',
  skipMove: 'Skip current move',
  undoMove: 'Undo last move',
  bestMove: 'Play the best move',
  resetPosition: 'Reset game',
  clearPosition: 'Clear position on the board',
  recognizeBoard: 'Recognize current position on the board',
  recognizeBoardSkipMove: 'Recognize position with opponent to move',
  showEngine: 'Open engine UCI terminal',
  loadConfig: 'Load configuration file',
  saveConfig: 'Save configuration file',
  resetConfig: 'Reset configuration to default values',
  savePicture: 'Save a screenshot of the board',
  promoteQueen: 'Promote the pawn to Queen',
  promoteRook: 'Promote the pawn to Rook',
  promoteBishop: 'Promote the pawn to Bishop',
  promoteKnight: 'Promote the pawn to Knight',
  autoResponse: 'Toggle auto response',
  autoScan: 'Toggle auto scan',
  autoQueen: 'Toggle auto queen',
  perspective: 'Flip board',
  draggingMode: 'Toggle dragging/clicking mode',
  actionRegion: 'Disable action regions',
  analysisDuration: 'Switch analysis duration',
  mouseSpeed: 'Switch mouse speed',
  autoCastling: 'Toggle auto castling'
};
