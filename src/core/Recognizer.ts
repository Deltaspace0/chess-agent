import { screen, sleep, Region } from '@nut-tree-fork/nut-js';
import type { Color, Piece, PieceSymbol } from 'chess.js';
import Game from './Game.ts';

function getSquareGrid(byteRows: number[][], region: Region, channels: number): number[][][] {
  const grid: number[][][] = [];
  for (let i = region.top; i < region.top+region.height; i++) {
    const row: number[][] = [];
    for (let j = region.left; j < region.left+region.width; j++) {
      const bgr: number[] = [];
      for (let k = 0; k < 3; k++) {
        bgr.push(byteRows[i][j*channels+k]);
      }
      row.push(bgr);
    }
    grid.push(row);
  }
  return grid;
}

function countChangedSquares(oldHashes: string[][], newHashes: string[][]): number {
  let changedSquares = 0;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      for (let k = 0; k < newHashes[i][j].length; k++) {
        if (newHashes[i][j][k] !== oldHashes[i][j][k]) {
          changedSquares++;
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
  private pieceHashes: { [key: string]: string } = {};
  private whiteGrid: number[][][] = [];
  private blackGrid: number[][][] = [];

  constructor(region: Region) {
    this.region = region;
  }

  private async grabSquares(): Promise<number[][][][][]> {
    const image = await screen.grabRegion(this.region);
    const byteArray = [...image.data];
    const byteRows: number[][] = [];
    for (let i = 0; i < byteArray.length; i += image.byteWidth) {
      byteRows.push(byteArray.slice(i, i+image.byteWidth));
    }
    const squareWidth = image.byteWidth/image.channels/8;
    const squareHeight = byteRows.length/8;
    const width = Math.floor(squareWidth-10);
    const height = Math.floor(squareHeight-10);
    const grid: number[][][][][] = [];
    for (let i = 0; i < 8; i++) {
      const top = Math.floor(squareHeight*i+5);
      const row: number[][][][] = [];
      for (let j = 0; j < 8; j++) {
        const left = Math.floor(squareWidth*j+5);
        const region = new Region(left, top, width, height);
        row.push(getSquareGrid(byteRows, region, image.channels));
      }
      grid.push(row);
    }
    return grid;
  }

  private getHash(grid: number[][][][][], row: number, col: number, removeBack: boolean): string {
    const backGrid = ((row+col) % 2 === 0) ? this.whiteGrid : this.blackGrid;
    let backWidth = 0;
    let backHeight = 0;
    if (removeBack) {
      backWidth = backGrid[0].length;
      backHeight = backGrid.length;
    }
    const squareGrid = grid[row][col];
    const squareWidth = squareGrid[0].length;
    const squareHeight = squareGrid.length;
    let hash = '';
    let startRow = 0;
    for (let i = 0; i < 8; i++) {
      const height = Math.floor((squareGrid.length-startRow)/(8-i));
      let startCol = 0;
      for (let j = 0; j < 8; j++) {
        const width = Math.floor((squareGrid[0].length-startCol)/(8-j));
        const bgr = [0, 0, 0];
        for (let k = startRow; k < startRow+height; k++) {
          for (let l = startCol; l < startCol+width; l++) {
            if (removeBack) {
              const backRow = Math.floor((k/squareHeight)*backHeight);
              const backCol = Math.floor((l/squareWidth)*backWidth);
              const backPixel = backGrid[backRow][backCol];
              let backErrors = 0;
              for (let m = 0; m < 3; m++) {
                backErrors += Math.abs(squareGrid[k][l][m]-backPixel[m]);
              }
              if (backErrors < 30) {
                continue;
              }
            }
            for (let m = 0; m < 3; m++) {
              bgr[m] += squareGrid[k][l][m];
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
    const grid = await this.grabSquares();
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
    const grid = await this.grabSquares();
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
    const grid = await this.grabSquares();
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

  async scanMove(game: Game): Promise<string | null> {
    if (!this.pieceHashes['rb1']) {
      throw new Error('no hashes');
    }
    if (this.scanning) {
      throw new Error('already scanning');
    }
    this.scanning = true;
    if (this.boardHashes.length === 0) {
      this.boardHashes = await this.getBoardHashes(false);
    }
    const changedSquares = await (async () => {
      let prevBoardHashes = await this.getBoardHashes(false);
      const changedSquares = countChangedSquares(this.boardHashes, prevBoardHashes);
      if (changedSquares > 2) {
        return changedSquares;
      }
      let quietPeriod = true;
      while (this.scanning) {
        await sleep(20);
        const boardHashes = await this.getBoardHashes(false);
        const changedSquares = countChangedSquares(prevBoardHashes, boardHashes);
        if (changedSquares > 0) {
          quietPeriod = false;
        }
        if (changedSquares === 0) {
          if (quietPeriod) {
            this.boardHashes = boardHashes;
          } else {
            return countChangedSquares(this.boardHashes, boardHashes);
          }
        }
        prevBoardHashes = boardHashes;
      }
      return 0;
    })();
    this.boardHashes = [];
    this.scanning = false;
    if (changedSquares < 2 || changedSquares > 9) {
      return null;
    }
    const boardHashes = await this.getBoardHashes(true);
    const moves = [...game.moves(), null];
    let minErrors = Infinity;
    let probableMove = null;
    const pieceErrors: { [key: string]: number } = {};
    for (const move of moves) {
      const grid = game.boardAfterMove(move);
      let errors = 0;
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          const hash = boardHashes[i][j];
          const piece = grid[i][j];
          const key = hash+(piece ? (piece.type+piece.color) : 'null');
          if (!(key in pieceErrors)) {
            pieceErrors[key] = this.getPieceHashErrors(piece, hash);
          }
          errors += pieceErrors[key];
        }
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
