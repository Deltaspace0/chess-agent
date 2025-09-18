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
