export const sliders: Record<NumberPreference, number[]> = {
  analysisDuration: [100, 300, 1000, 3000, 5000, 10000],
  multiPV: [1, 2, 3, 4, 5, 10, 20],
  engineThreads: [...Array(33).keys()].slice(1),
  mouseSpeed: [500, 1000, 3000, 5000, 10000]
};

export const defaultValues: Preferences = {
  alwaysOnTop: true,
  autoResponse: false,
  autoScan: false,
  autoQueen: true,
  isWhitePerspective: true,
  draggingMode: true,
  actionRegion: false,
  showEvalBar: true,
  showArrows: true,
  showLines: true,
  showNotation: true,
  analysisDuration: 1000,
  multiPV: 1,
  engineThreads: 1,
  mouseSpeed: 3000,
  region: null,
  saveConfigToFile: false,
  enginePath: null
};

export const preferenceLabels: Record<Preference, string> = {
  alwaysOnTop: 'Always on top',
  autoResponse: 'Auto response',
  autoScan: 'Auto scan',
  autoQueen: 'Auto queen',
  isWhitePerspective: 'Is White\'s perspective',
  draggingMode: 'Dragging mode',
  actionRegion: 'Invisible action regions',
  showEvalBar: 'Show eval bar',
  showArrows: 'Show arrows',
  showLines: 'Show lines',
  showNotation: 'Show notation',
  analysisDuration: 'Analysis duration (ms)',
  multiPV: 'Multiple lines',
  engineThreads: 'Threads',
  mouseSpeed: 'Mouse speed',
  region: 'Region',
  saveConfigToFile: 'Save config on exit',
  enginePath: 'Engine path'
};

export const actionRegions = {
  recognizeBoard: 'S1',
  playBestMove: 'S2',
  resetPosition: 'S3',
  autoResponse: 'S4',
  undoMove: 'S5',
  skipMove: 'S6',
  scanMove: 'S7',
  analysisDuration: 'S8',
  selectNewRegion: 'E1',
  draggingMode: 'E2',
  loadHashes: 'E7',
  perspective: 'E8',
  promoteQueen: 'W1',
  promoteRook: 'W2',
  promoteBishop: 'W3',
  promoteKnight: 'W4'
};
