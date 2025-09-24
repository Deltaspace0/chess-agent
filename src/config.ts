export const actionLocations: Partial<Record<Action | Preference, string>> = {
  showRegion: 'E1',
  loadHashes: 'E7',
  scanMove: 'S7',
  skipMove: 'S6',
  undoMove: 'S5',
  bestMove: 'S2',
  resetPosition: 'S3',
  recognizeBoard: 'S1',
  promoteQueen: 'W1',
  promoteRook: 'W2',
  promoteBishop: 'W3',
  promoteKnight: 'W4',
  autoResponse: 'S4',
  perspective: 'E8',
  draggingMode: 'E2',
  analysisDuration: 'S8'
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
    label: 'Invisible action regions',
    defaultValue: false,
    type: 'boolean'
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
  principalVariations: []
}

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
  promoteKnight: 'Knight'
};

export const actionNames = Object.keys(actionLabels) as Action[];
