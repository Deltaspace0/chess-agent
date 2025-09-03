import { screen, sleep, Region } from '@nut-tree-fork/nut-js';
import type { Color, Piece, PieceSymbol } from 'chess.js';

interface BoardState {
  move: string | null;
  squares: [number, number][];
  grid: (Piece | null)[][];
}

function getBufferSquare(bufferRows: Buffer[], region: Region): Buffer[] {
  const bufferSquare: Buffer[] = [];
  for (let i = region.top; i < region.top+region.height; i++) {
    const start = region.left*4;
    const end = (region.left+region.width)*4;
    bufferSquare.push(bufferRows[i].subarray(start, end));
  }
  return bufferSquare;
}

function getChangedSquares(oldHashes: string[][], newHashes: string[][]): [number, number][] {
  const changedSquares: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      for (let k = 0; k < newHashes[i][j].length; k++) {
        if (newHashes[i][j][k] !== oldHashes[i][j][k]) {
          changedSquares.push([i, j]);
          break;
        }
      }
    }
  }
  return changedSquares;
}

function compareHashes(hash1: string, hash2: string): number {
  let errors = 0;
  for (let i = 0; i < hash1.length; i++) {
    errors += Math.abs(Number(hash1[i])-Number(hash2[i]));
  }
  return errors;
}

class Recognizer {
  private region: Region;
  private scanning: boolean = false;
  private boardHashes: string[][] = [];
  private pieceHashes: Record<string, string> = {};
  private whiteGrid: Buffer[] = [];
  private blackGrid: Buffer[] = [];

  constructor(region: Region) {
    this.region = region;
  }

  private async grabBoard(): Promise<Buffer[][][]> {
    const image = await screen.grabRegion(this.region);
    const bufferRows: Buffer[] = [];
    for (let i = 0; i < image.data.byteLength; i += image.byteWidth) {
      bufferRows.push(image.data.subarray(i, i+image.byteWidth));
    }
    const squareWidth = image.byteWidth/32;
    const squareHeight = bufferRows.length/8;
    const width = Math.floor(squareWidth-10);
    const height = Math.floor(squareHeight-10);
    const grid: Buffer[][][] = [];
    for (let i = 0; i < 8; i++) {
      const top = Math.floor(squareHeight*i+5);
      const row: Buffer[][] = [];
      for (let j = 0; j < 8; j++) {
        const left = Math.floor(squareWidth*j+5);
        const region = new Region(left, top, width, height);
        row.push(getBufferSquare(bufferRows, region));
      }
      grid.push(row);
    }
    return grid;
  }

  private getHash(grid: Buffer[][][], row: number, col: number, removeBack: boolean): string {
    const backGrid = ((row+col) % 2 === 0) ? this.whiteGrid : this.blackGrid;
    let backWidth = 0;
    let backHeight = 0;
    if (removeBack) {
      backWidth = backGrid[0].length;
      backHeight = backGrid.length;
    }
    const squareGrid = grid[row][col];
    const squareWidth = Math.floor(squareGrid[0].byteLength/4);
    const squareHeight = squareGrid.length;
    let hash = '';
    let startRow = 0;
    for (let i = 0; i < 8; i++) {
      const height = Math.floor((squareHeight-startRow)/(8-i));
      let startCol = 0;
      for (let j = 0; j < 8; j++) {
        const width = Math.floor((squareWidth-startCol)/(8-j));
        const bgr = [0, 0, 0];
        for (let k = startRow; k < startRow+height; k++) {
          for (let l = startCol; l < startCol+width; l++) {
            if (removeBack) {
              const backRow = Math.floor((k/squareHeight)*backHeight);
              const backCol = Math.floor((l/squareWidth)*backWidth);
              let backErrors = 0;
              for (let m = 0; m < 3; m++) {
                const backPixel = backGrid[backRow][backCol*4+m];
                backErrors += Math.abs(squareGrid[k][l*4+m]-backPixel);
              }
              if (backErrors < 30) {
                continue;
              }
            }
            for (let m = 0; m < 3; m++) {
              bgr[m] += squareGrid[k][l*4+m];
            }
          }
        }
        for (let k = 0; k < 3; k++) {
          bgr[k] /= width*height;
          hash += Math.floor(bgr[k]*9/255);
        }
        startCol += width;
      }
      startRow += height;
    }
    return hash;
  }

  private async getBoardHashes(removeBack: boolean): Promise<string[][]> {
    const grid = await this.grabBoard();
    const boardHashes: string[][] = [];
    for (let i = 0; i < 8; i++) {
      const rowHashes: string[] = [];
      for (let j = 0; j < 8; j++) {
        rowHashes.push(this.getHash(grid, i, j, removeBack));
      }
      boardHashes.push(rowHashes);
    }
    return boardHashes;
  }

  private getPieceHashErrors(piece: Piece | null, hash: string): number {
    if (piece === null) {
      const errors1 = compareHashes(hash, this.pieceHashes['e12']);
      const errors2 = compareHashes(hash, this.pieceHashes['e13']);
      return Math.min(errors1, errors2);
    }
    let minErrors = Infinity;
    for (const key in this.pieceHashes) {
      if (piece.type === key[0] && piece.color === key[1]) {
        const errors = compareHashes(hash, this.pieceHashes[key]);
        minErrors = Math.min(errors, minErrors);
      }
    }
    return minErrors;
  }

  setRegion(region: Region) {
    this.region = region;
  }

  async load() {
    const pieces = [['rb1', 'nb1', 'bb1', 'qb1', 'kb1', 'bb2', 'nb2', 'rb2'],
                    ['pb1', 'pb2', 'pb3', 'pb4', 'pb5', 'pb6', 'pb7', 'pb8'],
                    ['e11', 'e12', 'e13', 'e14', 'e15', 'e16', 'e17', 'e18'],
                    ['e21', 'e22', 'e23', 'e24', 'e25', 'e26', 'e27', 'e28'],
                    ['e31', 'e32', 'e33', 'e34', 'e35', 'e36', 'e37', 'e38'],
                    ['e41', 'e42', 'e43', 'e44', 'e45', 'e46', 'e47', 'e48'],
                    ['pw1', 'pw2', 'pw3', 'pw4', 'pw5', 'pw6', 'pw7', 'pw8'],
                    ['rw1', 'nw1', 'bw1', 'qw1', 'kw1', 'bw2', 'nw2', 'rw2']];
    const grid = await this.grabBoard();
    this.whiteGrid = grid[2][2];
    this.blackGrid = grid[2][1];
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        this.pieceHashes[pieces[i][j]] = this.getHash(grid, i, j, true);
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
        const currentHash = this.getHash(grid, i, j, true);
        let minErrors = Infinity;
        let likelyPieceString = 'e';
        for (const pieceString in this.pieceHashes) {
          const hash = this.pieceHashes[pieceString];
          const errors = compareHashes(currentHash, hash);
          if (errors < minErrors) {
            minErrors = errors;
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

  async rememberBoard() {
    try {
      this.boardHashes = await this.getBoardHashes(false);
    } catch (e) {
      this.boardHashes = [];
    }
  }

  isScanning(): boolean {
    return this.scanning;
  }

  stopScanning() {
    this.scanning = false;
  }

  async scanMove(boardStates: BoardState[], squareCount?: number): Promise<string | null> {
    if (!this.pieceHashes['rb1']) {
      throw new Error('no hashes');
    }
    if (this.scanning) {
      throw new Error('already scanning');
    }
    this.scanning = true;
    const changedSquares = await (async () => {
      let prevBoardHashes = this.boardHashes;
      let scanStep = 0;
      while (this.scanning) {
        await sleep(50);
        const boardHashes = await this.getBoardHashes(false);
        const changedSquares = getChangedSquares(prevBoardHashes, boardHashes);
        if (scanStep === 0) {
          if (changedSquares.length === 0) {
            scanStep++;
          }
        }
        if (scanStep === 1) {
          if (squareCount) {
            const changedSquares = getChangedSquares(this.boardHashes, boardHashes);
            if (changedSquares.length > squareCount) {
              return changedSquares;
            }
            this.boardHashes = boardHashes;
            squareCount = 0;
          }
          if (changedSquares.length > 0) {
            scanStep++;
          }
        }
        if (scanStep === 2) {
          if (changedSquares.length === 0) {
            return getChangedSquares(this.boardHashes, boardHashes);
          }
        }
        prevBoardHashes = boardHashes;
      }
      return [];
    })();
    this.boardHashes = [];
    this.scanning = false;
    if (changedSquares.length < 2 || changedSquares.length > 9) {
      return null;
    }
    const boardHashes = await this.getBoardHashes(true);
    let minErrors = Infinity;
    let probableMove = null;
    for (const { move, squares, grid } of boardStates) {
      let foundSquare = false;
      for (const square of squares) {
        foundSquare = false;
        for (const [row, col] of changedSquares) {
          if (square[0] === row && square[1] === col) {
            foundSquare = true;
            break;
          }
        }
        if (!foundSquare) {
          break;
        }
      }
      if (!foundSquare) {
        continue;
      }
      let errors = 0;
      for (const [row, col] of changedSquares) {
        const hash = boardHashes[row][col];
        errors += this.getPieceHashErrors(grid[row][col], hash);
      }
      if (errors < minErrors) {
        minErrors = errors;
        probableMove = move;
      }
    }
    return probableMove;
  }
}

export default Recognizer;
