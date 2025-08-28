import { screen, Region } from '@nut-tree-fork/nut-js';
import type { Color, PieceSymbol } from 'chess.js';

interface Piece {
  type: PieceSymbol;
  color: Color;
}

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

class Recognizer {
  private region: Region;
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

  private getHash(grid: number[][][][][], row: number, col: number): string {
    const backGrid = ((row+col) % 2 === 0) ? this.whiteGrid : this.blackGrid;
    const squareGrid = grid[row][col];
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
            const backRow = Math.floor((k/squareGrid.length)*backGrid.length);
            const backCol = Math.floor((l/squareGrid[0].length)*backGrid[0].length);
            const backPixel = backGrid[backRow][backCol];
            let backErrors = 0;
            for (let m = 0; m < 3; m++) {
              backErrors += Math.abs(squareGrid[k][l][m]-backPixel[m]);
            }
            if (backErrors < 30) {
              continue;
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
        this.pieceHashes[pieces[i][j]] = this.getHash(grid, i, j);
      }
    }
  }

  async recognizeBoard(): Promise<[Piece, number, number][]> {
    if (!this.pieceHashes['rb1']) {
      throw new Error('no-hashes');
    }
    const grid = await this.grabSquares();
    const pieces: [Piece, number, number][] = [];
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const currentHash = this.getHash(grid, i, j);
        let minErrors = Infinity;
        let likelyPieceString = 'e';
        for (const pieceString in this.pieceHashes) {
          const hash = this.pieceHashes[pieceString];
          let errors = 0;
          for (let i = 0; i < currentHash.length; i++) {
            errors += Math.abs(Number(currentHash[i])-Number(hash[i]));
          }
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

  async getBoardHashes(): Promise<string[][]> {
    const grid = await this.grabSquares();
    const boardHashes: string[][] = [];
    for (let i = 0; i < 8; i++) {
      const rowHashes: string[] = [];
      for (let j = 0; j < 8; j++) {
        rowHashes.push(this.getHash(grid, i, j));
      }
      boardHashes.push(rowHashes);
    }
    return boardHashes;
  }
}

export default Recognizer;
