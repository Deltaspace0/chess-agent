export function coordsToSquare([row, col]: [number, number], isWhite: boolean): string {
  return (isWhite ? `${'abcdefgh'[col]}${8-row}` : `${'hgfedcba'[col]}${1+row}`);
}

export function squareToCoords(square: string, isWhite: boolean): [number, number] {
  if (isWhite) {
    return [8-Number(square[1]), 'abcdefgh'.indexOf(square[0])];
  }
  return [Number(square[1])-1, 'hgfedcba'.indexOf(square[0])];
}

export function selectRegion(region: Region, location: string): Region {
  const { left, top, width, height } = region;
  const index = Number(location[1]);
  if (location[0] === 'N') {
    return {
      left: left+width*(index-1)/8,
      top: top-height/16,
      width: width/8,
      height: height/16
    };
  }
  if (location[0] === 'S') {
    return {
      left: left+width*(index-1)/8,
      top: top+height,
      width: width/8,
      height: height/16
    };
  }
  if (location[0] === 'W') {
    return {
      left: left-width/16,
      top: top+height*(index-1)/8,
      width: width/16,
      height: height/8
    };
  }
  return {
    left: left+width,
    top: top+height*(index-1)/8,
    width: width/16,
    height: height/8
  };
}
