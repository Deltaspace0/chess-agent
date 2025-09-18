import { screen, sleep, Region } from '@nut-tree-fork/nut-js';
import type { Color, Piece, PieceSymbol } from 'chess.js';
import { defaultValues } from '../../config.ts';

interface MoveResidual {
  move: string | null;
  residual: number;
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

function compareHashes(hash1: string, hash2: string): number {
  let residual = 0;
  for (let i = 0; i < hash1.length; i++) {
    residual += Math.abs(Number(hash1[i])-Number(hash2[i]));
  }
  return residual;
}

function getChangedSquares(oldHashes: string[][], newHashes: string[][]): [number, number][] {
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

class Recognizer {
  private region: Region | null = defaultValues.region;
  private scanning: boolean = false;
  private pieceHashes: Record<string, string> = {};

  private async grabBoard(): Promise<Buffer[][][]> {
    if (this.region === null) {
      throw new Error('No region set');
    }
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

  private getHash(squareGrid: Buffer[]): string {
    const backPixels = [
      squareGrid[0],
      squareGrid[squareGrid.length-1],
      squareGrid[0].subarray(squareGrid[0].length-4),
      squareGrid[squareGrid.length-1].subarray(squareGrid[0].length-4)
    ];
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
            let backResiduals = Infinity;
            for (const backPixel of backPixels) {
              let backResidual = 0;
              for (let m = 0; m < 3; m++) {
                backResidual += Math.abs(squareGrid[k][l*4+m]-backPixel[m]);
              }
              backResiduals = Math.min(backResiduals, backResidual);
            }
            if (backResiduals < 20) {
              continue;
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

  private getMoveResiduals(hashes: string[][], states: BoardState[]): MoveResidual[] {
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
    await sleep(50);
    this.scanning = true;
    let prevBoardHashes = await this.getBoardHashes();
    let waitingForMovement = false;
    while (this.scanning) {
      await sleep(50);
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

  setRegion(region: Region | null) {
    this.region = region;
  }
}

export default Recognizer;
