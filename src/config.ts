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
  S7: 'recognizeBoardAfterMove',
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
    label: 'Automatically play the best move',
    statusPrefix: 'Auto response: ',
    defaultValue: false
  },
  autoRecognition: {
    label: 'Automatically recognize position on the board',
    statusPrefix: 'Auto recognition: ',
    defaultValue: false
  },
  autoPremove: {
    label: 'Automatically premove on every move',
    statusPrefix: 'Auto premove: ',
    defaultValue: false
  },
  autoQueen: {
    label: 'Auto queen',
    description: 'Pawns are always assumed to be promoted to Queen',
    defaultValue: false
  },
  autoPromotion: {
    label: 'Auto promotion',
    description: 'Use chess.com/lichess.org interface for pawn promotion',
    defaultValue: true
  },
  perspective: {
    label: 'Is White\'s perspective',
    description: 'Board orientation',
    statusOnTrue: 'White',
    statusOnFalse: 'Black',
    statusPrefix: '',
    statusSuffix: ' perspective',
    defaultValue: true
  },
  draggingMode: {
    label: 'Perform dragging motion',
    description: 'Perform dragging motion (clicking if unchecked)',
    statusOnTrue: 'Dragging',
    statusOnFalse: 'Clicking',
    statusPrefix: '',
    statusSuffix: ' mode',
    defaultValue: true
  },
  actionRegion: {
    label: 'Actions',
    description: 'Enable action regions',
    statusPrefix: 'Action regions: ',
    defaultValue: false
  },
  actionLocations: {
    label: 'Action regions',
    description: 'Locations of action regions',
    defaultValue: defaultActionLocations
  },
  showEvalBar: {
    label: 'Show the evaluation bar',
    defaultValue: true
  },
  showArrows: {
    label: 'Best move arrows',
    description: 'Highlight best moves with arrows on the board',
    defaultValue: true
  },
  showNotation: {
    label: 'Show notation',
    description: 'Show coordinates (1-8 and a-h) on the board',
    defaultValue: true
  },
  showCursor: {
    label: 'Show virtual cursor',
    description: 'Show in the app where the cursor is inside the region',
    defaultValue: true
  },
  showRegion: {
    label: 'Show the selected region on screen',
    defaultValue: true
  },
  showActionRegion: {
    label: 'Show action regions on screen',
    defaultValue: true
  },
  analysisDuration: {
    label: 'Analysis duration',
    description: 'Time allotted for the engine to find the best move (in milliseconds)',
    statusSuffix: ' ms',
    defaultValue: 1000,
    sliderValues: [1, 300, 1000, 3000, 5000, 10000],
    switchValues: [1, 300, 1000, 5000]
  },
  multiPV: {
    label: 'Multiple lines',
    description: 'Maximum number of best moves to show',
    defaultValue: 3,
    sliderValues: [1, 2, 3, 4, 5, 10, 20]
  },
  engineThreads: {
    label: 'Threads',
    description: 'Maximum number of threads the engine can utilize',
    defaultValue: 1,
    sliderValues: [...Array(33).keys()].slice(1)
  },
  engineLevel: {
    label: 'Skill Level',
    description: 'Weaken the engine by injecting intentional mistakes',
    defaultValue: 20,
    sliderValues: [...Array(21).keys()]
  },
  mouseSpeed: {
    label: 'Mouse speed',
    defaultValue: 50000,
    sliderValues: [500, 1000, 2000, 10000, 50000],
    switchValues: [1000, 10000, 50000]
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
    defaultValue: 1
  },
  recognizerModel: {
    label: 'Recognizer model',
    description: 'Pixel colors and hashes of piece images for Recognizer',
    defaultValue: null
  },
  recognizerPutKings: {
    label: 'Add missing kings',
    description: 'Add missing kings during position recognition',
    defaultValue: true
  },
  autoCastling: {
    label: 'Enable castling rights when possible',
    statusPrefix: 'Auto castling: ',
    defaultValue: true
  }
};

export const preferenceNames = Object.keys(preferenceConfig) as Preference[];

export const actionDescriptions: Partial<Record<Action, string>> = {
  selectRegion: 'Go to region selection mode',
  loadHashes: 'Load piece image hashes',
  resetHashes: 'Reset piece image hashes',
  skipMove: 'Skip current move',
  undoMove: 'Undo last move',
  bestMove: 'Play the best move',
  resetPosition: 'Reset game',
  recognizeBoard: 'Recognize current position on the board',
  recognizeBoardSkipMove: 'Recognize position with opponent to move',
  recognizeBoardAfterMove: 'Recognize position on the board after a move',
  showEngine: 'Open engine UCI terminal',
  loadConfig: 'Open configuration file',
  saveConfig: 'Save configuration file',
  resetConfig: 'Reset configuration to default values',
  savePicture: 'Save a screenshot of the board',
  promoteQueen: 'Promote the pawn to Queen',
  promoteRook: 'Promote the pawn to Rook',
  promoteBishop: 'Promote the pawn to Bishop',
  promoteKnight: 'Promote the pawn to Knight',
  autoResponse: 'Toggle auto response',
  autoRecognition: 'Toggle auto recognition',
  autoPremove: 'Toggle auto premove',
  autoQueen: 'Toggle auto queen',
  perspective: 'Flip board',
  draggingMode: 'Toggle dragging/clicking mode',
  actionRegion: 'Disable action regions',
  analysisDuration: 'Switch analysis duration',
  mouseSpeed: 'Switch mouse speed',
  autoCastling: 'Toggle auto castling'
};
