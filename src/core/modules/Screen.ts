import { screen, Region as NutRegion } from '@nut-tree-fork/nut-js';

export abstract class Screen {
  protected region: Region | null = null;

  abstract grabRegion(): Promise<Buffer[]>;

  setRegion(region: Region | null) {
    this.region = region;
  }
}

export class ConcreteScreen extends Screen {
  async grabRegion(): Promise<Buffer[]> {
    if (this.region === null) {
      throw new Error('No region set');
    }
    const { left, top, width, height } = this.region;
    const nutRegion = new NutRegion(left, top, width, height);
    const image = await screen.grabRegion(nutRegion);
    const bufferRows: Buffer[] = [];
    for (let i = 0; i < image.data.byteLength; i += image.byteWidth) {
      bufferRows.push(image.data.subarray(i, i+image.byteWidth));
    }
    return bufferRows;
  }
}
