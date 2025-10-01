class PixelGrid {
  private buffer: Buffer;
  private byteWidth: number;
  private region: Region;
  private transposed: boolean = false;

  constructor(buffer: Buffer, byteWidth: number, region?: Region) {
    this.buffer = buffer;
    this.byteWidth = byteWidth;
    const bufWidth = byteWidth/4;
    const bufHeight = buffer.byteLength/byteWidth;
    if (region) {
      const { left, top, width, height } = region;
      const right = left+width;
      const bottom = top+height;
      if (left < 0 || right > bufWidth || top < 0 || bottom > bufHeight) {
        throw new Error('Subgrid region is out of bounds');
      }
    }
    this.region = region || {
      left: 0,
      top: 0,
      width: bufWidth,
      height: bufHeight
    };
  }

  private convertCoordinates(row: number, col: number): [number, number] {
    const [i, j] = this.transposed ? [col, row] : [row, col];
    const { left, top, width, height } = this.region;
    if (i < 0 || i >= height || j < 0 || j >= width) {
      throw new Error('Pixel coordinate is out of bounds');
    }
    return [i+top, j+left];
  }

  getSubgrid({ left, top, width, height }: Region): PixelGrid {
    const offsetLeft = this.region.left+left;
    const offsetTop = this.region.top+top;
    const region = { left: offsetLeft, top: offsetTop, width, height };
    return new PixelGrid(this.buffer, this.byteWidth, region);
  }

  calculateGrayPixels() {
    for (let i = 0; i < this.buffer.byteLength; i += 4) {
      const b = this.buffer[i];
      const g = this.buffer[i+1];
      const r = this.buffer[i+2];
      this.buffer[i+3] = 0.3*r+0.59*g+0.11*b;
    }
  }

  getGrayPixel(row: number, col: number): number {
    const [i, j] = this.convertCoordinates(row, col);
    return this.buffer[i*this.byteWidth+j*4+3];
  }

  getPixelBuffer(row: number, col: number): Buffer {
    const [i, j] = this.convertCoordinates(row, col);
    const start = i*this.byteWidth+j*4;
    return this.buffer.subarray(start, start+4);
  }

  getWidth(): number {
    return this.transposed ? this.region.height : this.region.width;
  }

  getHeight(): number {
    return this.transposed ? this.region.width : this.region.height;
  }

  getDimensions(): [number, number] {
    return [this.getWidth(), this.getHeight()];
  }

  setTransposed(value: boolean) {
    this.transposed = value;
  }
}

export default PixelGrid;
