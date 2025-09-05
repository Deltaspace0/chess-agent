export function coordsToSquare([row, col]: [number, number], isWhite: boolean): string {
  return (isWhite ? `${'abcdefgh'[col]}${8-row}` : `${'hgfedcba'[col]}${1+row}`);
}

export function squareToCoords(square: string, isWhite: boolean): [number, number] {
  if (isWhite) {
    return [8-Number(square[1]), 'abcdefgh'.indexOf(square[0])];
  }
  return [Number(square[1])-1, 'hgfedcba'.indexOf(square[0])];
}
