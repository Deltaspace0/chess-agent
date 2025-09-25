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
  E1: 'showRegion',
  E2: 'draggingMode',
  E7: 'loadHashes',
  E8: 'perspective'
};

export const preferenceConfig: { [T in Preference]: PreferenceConfig<T> } = {
  alwaysOnTop: {
    label: 'Always on top',
    defaultValue: true,
    type: 'boolean'
  },
  autoResponse: {
    label: 'Auto response',
    defaultValue: false,
    type: 'boolean'
  },
  autoScan: {
    label: 'Auto scan',
    defaultValue: false,
    type: 'boolean'
  },
  autoQueen: {
    label: 'Auto queen',
    defaultValue: true,
    type: 'boolean'
  },
  perspective: {
    label: 'Is White\'s perspective',
    defaultValue: true,
    type: 'boolean'
  },
  draggingMode: {
    label: 'Dragging mode',
    defaultValue: true,
    type: 'boolean'
  },
  actionRegion: {
    label: 'Actions',
    defaultValue: false,
    type: 'boolean'
  },
  actionLocations: {
    label: 'Action regions',
    defaultValue: defaultActionLocations,
    type: 'other'
  },
  showEvalBar: {
    label: 'Show eval bar',
    defaultValue: true,
    type: 'boolean'
  },
  showArrows: {
    label: 'Show arrows',
    defaultValue: true,
    type: 'boolean'
  },
  showLines: {
    label: 'Show lines',
    defaultValue: true,
    type: 'boolean'
  },
  showNotation: {
    label: 'Show notation',
    defaultValue: true,
    type: 'boolean'
  },
  analysisDuration: {
    label: 'Analysis duration (ms)',
    defaultValue: 1000,
    type: 'number',
    sliderValues: [100, 300, 1000, 3000, 5000, 10000]
  },
  multiPV: {
    label: 'Multiple lines',
    defaultValue: 1,
    type: 'number',
    sliderValues: [1, 2, 3, 4, 5, 10, 20]
  },
  engineThreads: {
    label: 'Threads',
    defaultValue: 1,
    type: 'number',
    sliderValues: [...Array(33).keys()].slice(1)
  },
  mouseSpeed: {
    label: 'Mouse speed',
    defaultValue: 3000,
    type: 'number',
    sliderValues: [500, 1000, 3000, 5000, 10000]
  },
  region: {
    label: 'Region',
    defaultValue: null,
    type: 'other'
  },
  saveConfigToFile: {
    label: 'Save config on exit',
    defaultValue: true,
    type: 'boolean'
  },
  enginePath: {
    label: 'Engine path',
    defaultValue: null,
    type: 'other'
  }
};

export const preferenceNames = Object.keys(preferenceConfig) as Preference[];

export const defaultVariables: Variables = {
  status: '',
  positionFEN: '',
  positionInfo: {
    whiteCastlingRights: { 'k': true, 'q': true },
    blackCastlingRights: { 'k': true, 'q': true },
    isWhiteTurn: true
  },
  engineInfo: {},
  highlightMoves: [],
  principalVariations: [],
  editedActionLocation: 'N1'
};

export const actionLabels: Record<Action, string> = {
  showRegion: 'Region',
  hideRegion: 'Return',
  loadHashes: 'Load hashes',
  scanMove: 'Scan move',
  skipMove: 'Skip move',
  undoMove: 'Undo move',
  bestMove: 'Best move',
  resetPosition: 'Reset',
  clearPosition: 'Clear',
  recognizeBoard: 'Recognize',
  dialogEngine: 'Load engine',
  reloadEngine: 'Reload',
  showEngine: 'Engine',
  promoteQueen: 'Queen',
  promoteRook: 'Rook',
  promoteBishop: 'Bishop',
  promoteKnight: 'Knight',
  autoResponse: preferenceConfig.autoResponse.label,
  perspective: preferenceConfig.perspective.label,
  draggingMode: preferenceConfig.draggingMode.label,
  actionRegion: preferenceConfig.actionRegion.label,
  analysisDuration: preferenceConfig.analysisDuration.label
};

export const actionDescriptions: Partial<Record<Action, string>> = {
  showRegion: 'Go to region selection mode',
  loadHashes: 'Load piece image hashes',
  scanMove: 'Start detecting a move',
  skipMove: 'Skip current move',
  undoMove: 'Undo last move',
  bestMove: 'Play the best move',
  resetPosition: 'Reset the game to start position',
  recognizeBoard: 'Recognize current position on the board',
  showEngine: 'Open engine UCI terminal',
  promoteQueen: 'Promote the pawn to Queen',
  promoteRook: 'Promote the pawn to Rook',
  promoteBishop: 'Promote the pawn to Bishop',
  promoteKnight: 'Promote the pawn to Knight',
  autoResponse: 'Toggle auto response',
  perspective: 'Toggle board orientation',
  draggingMode: 'Toggle dragging/clicking mode',
  actionRegion: 'Disable invisible action regions',
  analysisDuration: 'Switch analysis duration'
};
