import type { Preferences } from './interface';

export const sliders = {
  analysisDurations: [100, 300, 1000, 3000, 5000, 10000],
  multiPVs: [1, 2, 3, 4, 5, 10, 20],
  mouseSpeeds: [500, 1000, 3000, 5000, 10000]
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
  mouseSpeed: 3000,
  region: null,
  saveConfigToFile: false,
  enginePath: null
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
  perspective: 'E8',
  promoteQueen: 'W1',
  promoteRook: 'W2',
  promoteBishop: 'W3',
  promoteKnight: 'W4'
};
