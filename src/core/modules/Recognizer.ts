import type { Color, Piece, PieceSymbol } from 'chess.js';
import type { AgentRecognizer } from './Agent.ts';
import PixelGrid from './PixelGrid.ts';
import { Screen } from './device/Screen.ts';

export interface RecognizerModel {
  colors: number[];
  hashes: Record<string, string>;
}

export interface RecognizerParameters {
  putKings?: boolean;
}

interface MoveResidual {
  move: string | null;
  residual: number;
}

function compareHashes(hash1: string, hash2: string): number {
  let residual = 0;
  for (let i = 0; i < hash1.length; i++) {
    residual += Math.abs(Number(hash1[i])-Number(hash2[i]));
  }
  return residual;
}

function getChangedSquares(
  oldHashes: string[][],
  newHashes: string[][]
): [number, number][] {
  const changedSquares: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const residual = compareHashes(newHashes[i][j], oldHashes[i][j]);
      if (residual > 10) {
        changedSquares.push([i, j]);
      }
    }
  }
  return changedSquares;
}

function checkColors(pixel: number, colorSets: Set<number>[]): boolean {
  for (const colors of colorSets) {
    for (const color of colors) {
      const distance = ((pixel >> 16)-(color >> 16))**2+
        (((pixel >> 8) & 255)-((color >> 8) & 255))**2+
        ((pixel & 255)-(color & 255))**2;
      if (distance < 900) {
        return true;
      }
    }
  }
  return false;
}

function getBackColors(grids: PixelGrid[]): Set<number> {
  const colors: Set<number> = new Set();
  for (const grid of grids) {
    const [width, height] = grid.getDimensions();
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const pixel = grid.getPixelNumber(i, j);
        if (checkColors(pixel, [colors])) {
          continue;
        }
        colors.add(pixel);
        if (colors.size >= 10) {
          return colors;
        }
      }
    }
  }
  return colors;
}

function getPieceColors(
  grids: PixelGrid[],
  backColors: Set<number>[]
): Set<number> {
  const pieceColors: Set<number> = new Set();
  for (const grid of grids) {
    const [width, height] = grid.getDimensions();
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const pixel = grid.getPixelNumber(i, j);
        if (checkColors(pixel, backColors)) {
          continue;
        }
        const pb = pixel >> 16;
        const pg = (pixel >> 8) & 255;
        const pr = pixel & 255;
        for (let b = Math.max(0, pb-1); b <= Math.min(255, pb+1); b++) {
          for (let g = Math.max(0, pg-1); g <= Math.min(255, pg+1); g++) {
            for (let r = Math.max(0, pr-1); r <= Math.min(255, pr+1); r++) {
              pieceColors.add((b << 16)+(g << 8)+r);
            }
          }
        }
      }
    }
  }
  return pieceColors;
}

class Recognizer implements AgentRecognizer {
  private screen: Screen;
  private scanning: boolean = false;
  private pieceColors: Set<number> = new Set();
  private pieceHashes: Record<string, string> = {};

  constructor(screen: Screen) {
    this.screen = screen;
  }

  private getHash(squareGrid: PixelGrid): string {
    const [squareWidth, squareHeight] = squareGrid.getDimensions();
    let hash = '';
    let startRow = 0;
    for (let i = 0; i < 8; i++) {
      const height = Math.floor((squareHeight-startRow)/(8-i));
      let startCol = 0;
      for (let j = 0; j < 8; j++) {
        const width = Math.floor((squareWidth-startCol)/(8-j));
        const bgra = [0, 0, 0, 0];
        for (let k = startRow; k < startRow+height; k++) {
          for (let l = startCol; l < startCol+width; l++) {
            const pixel = squareGrid.getPixelNumber(k, l);
            if (this.pieceColors.has(pixel)) {
              bgra[0] += pixel >> 16;
              bgra[1] += (pixel >> 8) & 255;
              bgra[2] += pixel & 255;
              bgra[3] += 255;
            }
          }
        }
        for (let k = 0; k < 4; k++) {
          bgra[k] /= width*height;
          hash += Math.floor(bgra[k]*9/255);
        }
        startCol += width;
      }
      startRow += height;
    }
    return hash;
  }

  private async grabBoard(): Promise<PixelGrid[][]> {
    const grid = await this.screen.grabRegion();
    const squareWidth = grid.getWidth()/8;
    const squareHeight = grid.getHeight()/8;
    const width = Math.floor(squareWidth-4);
    const height = Math.floor(squareHeight-4);
    const squareGrid: PixelGrid[][] = [];
    for (let i = 0; i < 8; i++) {
      const top = Math.floor(squareHeight*i+2);
      const row: PixelGrid[] = [];
      for (let j = 0; j < 8; j++) {
        const left = Math.floor(squareWidth*j+2);
        row.push(grid.getSubgrid({ left, top, width, height }));
      }
      squareGrid.push(row);
    }
    return squareGrid;
  }

  private async getBoardHashes(): Promise<string[][]> {
    const grid = await this.grabBoard();
    const boardHashes: string[][] = [];
    for (let i = 0; i < 8; i++) {
      const rowHashes: string[] = [];
      for (let j = 0; j < 8; j++) {
        rowHashes.push(this.getHash(grid[i][j]));
      }
      boardHashes.push(rowHashes);
    }
    return boardHashes;
  }

  private getPieceHashResidual(piece: Piece | null, hash: string): number {
    if (piece === null) {
      const residual1 = compareHashes(hash, this.pieceHashes['e12']);
      const residual2 = compareHashes(hash, this.pieceHashes['e13']);
      return Math.min(residual1, residual2);
    }
    let minResidual = Infinity;
    for (const key in this.pieceHashes) {
      if (piece.type === key[0] && piece.color === key[1]) {
        const residual = compareHashes(hash, this.pieceHashes[key]);
        minResidual = Math.min(residual, minResidual);
      }
    }
    return minResidual;
  }

  private getMoveResiduals(
    hashes: string[][],
    states: BoardState[]
  ): MoveResidual[] {
    const moveResiduals: MoveResidual[] = [];
    for (const { move, grid } of states) {
      let residual = 0;
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          const hash = hashes[i][j];
          residual += this.getPieceHashResidual(grid[i][j], hash);
        }
      }
      moveResiduals.push({ move, residual });
    }
    return moveResiduals;
  }

  setModel(model: RecognizerModel | null) {
    if (!model) {
      this.pieceColors = new Set();
      this.pieceHashes = {};
    } else if (model.hashes !== this.pieceHashes) {
      this.pieceColors = new Set(model.colors);
      this.pieceHashes = model.hashes;
    }
  }

  async load(isWhitePerspective: boolean): Promise<RecognizerModel> {
    const pieces1 = [['rb1', 'nb1', 'bb1', 'qb1', 'kb1', 'bb2', 'nb2', 'rb2'],
                    ['pb1', 'pb2', 'pb3', 'pb4', 'pb5', 'pb6', 'pb7', 'pb8'],
                    ['e11', 'e12', 'e13', 'e14', 'e15', 'e16', 'e17', 'e18'],
                    ['e21', 'e22', 'e23', 'e24', 'e25', 'e26', 'e27', 'e28'],
                    ['e31', 'e32', 'e33', 'e34', 'e35', 'e36', 'e37', 'e38'],
                    ['e41', 'e42', 'e43', 'e44', 'e45', 'e46', 'e47', 'e48'],
                    ['pw1', 'pw2', 'pw3', 'pw4', 'pw5', 'pw6', 'pw7', 'pw8'],
                    ['rw1', 'nw1', 'bw1', 'qw1', 'kw1', 'bw2', 'nw2', 'rw2']];
    const pieces = isWhitePerspective
      ? pieces1
      : pieces1.reverse().map((x) => x.reverse());
    const grid = await this.grabBoard();
    const darkBackColors = getBackColors([
      grid[2][1], grid[2][3], grid[2][5], grid[3][2], grid[3][4], grid[3][6],
      grid[4][1], grid[4][3], grid[4][5], grid[5][2], grid[5][4], grid[5][6]
    ]);
    const lightBackColors = getBackColors([
      grid[2][2], grid[2][4], grid[2][6], grid[3][1], grid[3][3], grid[3][5],
      grid[4][2], grid[4][4], grid[4][6], grid[5][1], grid[5][3], grid[5][5]
    ]);
    const pieceGrids1: PixelGrid[] = [];
    const pieceGrids2: PixelGrid[] = [];
    for (let col = 0; col < 8; col++) {
      for (const row of [0, 1]) {
        pieceGrids1.push(grid[row][col]);
      }
      for (const row of [6, 7]) {
        pieceGrids2.push(grid[row][col]);
      }
    }
    const backColors = [darkBackColors, lightBackColors];
    const pieceColors1 = getPieceColors(pieceGrids1, backColors);
    const pieceColors2 = getPieceColors(pieceGrids2, backColors);
    this.pieceColors = new Set([...pieceColors1, ...pieceColors2]);
    this.pieceHashes = {};
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        this.pieceHashes[pieces[i][j]] = this.getHash(grid[i][j]);
      }
    }
    return { colors: [...this.pieceColors], hashes: this.pieceHashes };
  }

  async recognizeBoard(
    parameters?: RecognizerParameters
  ): Promise<[Piece, number, number][]> {
    if (!this.pieceHashes['rb1']) {
      throw new Error('no hashes');
    }
    const grid = await this.grabBoard();
    const pieces: [Piece, number, number][] = [];
    let whiteKingPut = false;
    let blackKingPut = false;
    let uncertainRow = 0;
    let uncertainCol = 0;
    let maxMinResidual = -1;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const currentHash = this.getHash(grid[i][j]);
        let minResidual = Infinity;
        let likelyPieceString = 'e';
        for (const pieceString in this.pieceHashes) {
          const hash = this.pieceHashes[pieceString];
          const residual = compareHashes(currentHash, hash);
          if (residual < minResidual) {
            minResidual = residual;
            likelyPieceString = pieceString;
          }
        }
        if (minResidual > maxMinResidual) {
          maxMinResidual = minResidual;
          uncertainRow = i;
          uncertainCol = j;
        }
        if (likelyPieceString[0] !== 'e') {
          if (likelyPieceString === 'kw1') {
            whiteKingPut = true;
          } else if (likelyPieceString === 'kb1') {
            blackKingPut = true;
          }
          const piece = {
            type: likelyPieceString[0] as PieceSymbol,
            color: likelyPieceString[1] as Color
          };
          pieces.push([piece, i, j]);
        }
      }
    }
    if (parameters?.putKings !== false) {
      if (!whiteKingPut) {
        pieces.push([{ type: 'k', color: 'w' }, uncertainRow, uncertainCol]);
      } else if (!blackKingPut) {
        pieces.push([{ type: 'k', color: 'b' }, uncertainRow, uncertainCol]);
      }
    }
    return pieces;
  }

  isScanning(): boolean {
    return this.scanning;
  }

  stopScanning() {
    this.scanning = false;
  }

  async scanMove(boardStates: BoardState[]): Promise<string> {
    if (!this.pieceHashes['rb1']) {
      throw new Error('no hashes');
    }
    if (this.scanning) {
      throw new Error('already scanning');
    }
    await this.screen.sleep(50);
    this.scanning = true;
    let prevBoardHashes = await this.getBoardHashes();
    let waitingForMovement = false;
    while (this.scanning) {
      await this.screen.sleep(50);
      const boardHashes = await this.getBoardHashes();
      const changedSquares = getChangedSquares(prevBoardHashes, boardHashes);
      if (changedSquares.length > 0) {
        waitingForMovement = false;
      }
      if (changedSquares.length === 0 && !waitingForMovement) {
        const moveResiduals = this.getMoveResiduals(boardHashes, boardStates);
        moveResiduals.sort((a, b) => a.residual-b.residual);
        const { move, residual } = moveResiduals[0];
        if (move !== null && residual < moveResiduals[1].residual*0.9) {
          this.scanning = false;
          return move;
        }
        waitingForMovement = true;
      }
      prevBoardHashes = boardHashes;
    }
    throw new Error('stop');
  }
}

export default Recognizer;
