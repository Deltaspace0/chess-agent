import type { Color, Piece, PieceSymbol } from 'chess.js';
import type { AgentRecognizer } from './Agent.ts';
import PixelGrid from './PixelGrid.ts';
import { Screen } from './device/Screen.ts';

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

function pixelToString(pixel: Buffer): string {
  return `${pixel[0]} ${pixel[1]} ${pixel[2]}`;
}

function checkColors(pixel: Buffer, colorSets: Set<string>[]): boolean {
  for (const colors of colorSets) {
    for (const color of colors) {
      const bgr = color.split(' ').map(Number);
      let distance = 0;
      for (let i = 0; i < 3; i++) {
        distance += (pixel[i]-bgr[i])**2;
      }
      if (distance < 900) {
        return true;
      }
    }
  }
  return false;
}

function getBackColors(grids: PixelGrid[]): Set<string> {
  const colors: Set<string> = new Set();
  for (const grid of grids) {
    const [width, height] = grid.getDimensions();
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const pixel = grid.getPixelBuffer(i, j);
        if (checkColors(pixel, [colors])) {
          continue;
        }
        colors.add(pixelToString(pixel));
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
  backColors: Set<string>[]
): Set<string> {
  const counter: Record<string, number> = {};
  const pieceColors: Set<string> = new Set();
  for (const grid of grids) {
    const [width, height] = grid.getDimensions();
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const pixel = grid.getPixelBuffer(i, j);
        if (checkColors(pixel, backColors)) {
          continue;
        }
        const color = pixelToString(pixel);
        if (!(color in counter)) {
          counter[color] = 0;
        }
        counter[color]++;
        pieceColors.add(color);
      }
    }
  }
  const colors = [...pieceColors].sort((a, b) => counter[b]-counter[a]);
  return new Set(colors.slice(0, 128));
}

class Recognizer implements AgentRecognizer {
  private screen: Screen;
  private scanning: boolean = false;
  private pieceColors: Set<string> = new Set();
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
            const pixel = squareGrid.getPixelBuffer(k, l);
            if (this.pieceColors.has(pixelToString(pixel))) {
              for (let m = 0; m < 3; m++) {
                bgra[m] += pixel[m];
              }
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

  async load(isWhitePerspective: boolean) {
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
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        this.pieceHashes[pieces[i][j]] = this.getHash(grid[i][j]);
      }
    }
  }

  async recognizeBoard(): Promise<[Piece, number, number][]> {
    if (!this.pieceHashes['rb1']) {
      throw new Error('no hashes');
    }
    const grid = await this.grabBoard();
    const pieces: [Piece, number, number][] = [];
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
        if (likelyPieceString[0] !== 'e') {
          const piece = {
            type: likelyPieceString[0] as PieceSymbol,
            color: likelyPieceString[1] as Color
          };
          pieces.push([piece, i, j]);
        }
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
