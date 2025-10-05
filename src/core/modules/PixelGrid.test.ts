import { describe, expect, it } from 'vitest';
import PixelGrid from './PixelGrid.ts';

function getPixelGrid(): PixelGrid {
  const buffer = Buffer.from([
    123, 124, 125, 255, 23, 24, 25, 255, 12, 34, 240, 255,
    231, 241, 251, 255, 23, 21, 25, 255, 22, 34, 240, 255,
    100, 190, 180, 255, 23, 24, 25, 255, 12, 34, 240, 255,
    100, 190, 180, 255, 10, 10, 10, 255, 12, 34, 240, 255
  ]);
  return new PixelGrid(buffer, 12);
}

function getTransposedGrid(): PixelGrid {
  const grid = getPixelGrid();
  grid.setTransposed(true);
  return grid;
}

describe('Pixel grid', () => {
  describe('Normal', () => {
    it('should return correct dimensions', () => {
      const grid = getPixelGrid();
      expect(grid.getWidth()).toBe(3);
      expect(grid.getHeight()).toBe(4);
      expect(grid.getDimensions()).toEqual([3, 4]);
    });

    it('should return correct pixel buffer', () => {
      const grid = getPixelGrid();
      expect([...grid.getPixelBuffer(1, 2)]).toEqual([22, 34, 240, 255]);
    });

    it('should return correct gray pixel', () => {
      const grid = getPixelGrid();
      grid.calculateGrayPixels();
      expect(grid.getGrayPixel(1, 2)).toEqual(94);
    });

    it('should throw an error when pixel position is out of bounds', () => {
      const grid = getPixelGrid();
      expect(() => grid.getPixelBuffer(5, 5)).toThrow();
    });
  });

  describe('Transposed', () => {
    it('should return correct dimensions when transposed', () => {
      const grid = getTransposedGrid();
      expect(grid.getWidth()).toBe(4);
      expect(grid.getHeight()).toBe(3);
      expect(grid.getDimensions()).toEqual([4, 3]);
    });

    it('should return correct pixel buffer when transposed', () => {
      const grid = getTransposedGrid();
      expect([...grid.getPixelBuffer(1, 2)]).toEqual([23, 24, 25, 255]);
    });

    it('should return correct gray pixel when transposed', () => {
      const grid = getTransposedGrid();
      grid.calculateGrayPixels();
      expect(grid.getGrayPixel(2, 1)).toEqual(94);
    });
  });

  describe('Subgrid', () => {
    it('should return correct dimensions of the subgrid', () => {
      const region = { left: 1, top: 1, width: 2, height: 1 };
      const grid = getPixelGrid().getSubgrid(region);
      expect(grid.getWidth()).toBe(2);
      expect(grid.getHeight()).toBe(1);
      expect(grid.getDimensions()).toEqual([2, 1]);
    });

    it('should return correct pixel buffer of the subgrid', () => {
      const region = { left: 1, top: 1, width: 2, height: 1 };
      const grid = getPixelGrid().getSubgrid(region);
      expect([...grid.getPixelBuffer(0, 0)]).toEqual([23, 21, 25, 255]);
    });

    it('should return correct subgrid of the subgrid', () => {
      const region = { left: 1, top: 1, width: 2, height: 2 };
      const region2 = { left: 1, top: 1, width: 1, height: 1 };
      const grid = getPixelGrid().getSubgrid(region).getSubgrid(region2);
      expect([...grid.getPixelBuffer(0, 0)]).toEqual([12, 34, 240, 255]);
    });

    it('should throw an error when subgrid is too big', () => {
      const region = { left: 1, top: 1, width: 5, height: 5 };
      const grid = getPixelGrid();
      expect(() => grid.getSubgrid(region)).toThrow();
    });
  });
});
