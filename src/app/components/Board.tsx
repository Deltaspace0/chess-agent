import type { SquarePiece } from '../interface';

function getPieceClass(piece: SquarePiece): string {
  const color = piece.color === 'w' ? 'white' : 'black';
  switch (piece.type) {
    case 'b':
      return `${color}-bishop`;
    case 'k':
      return `${color}-king`;
    case 'n':
      return `${color}-knight`;
    case 'p':
      return `${color}-pawn`;
    case 'q':
      return `${color}-queen`;
    case 'r':
      return `${color}-rook`;
  }
}

interface BoardProps {
  positionPieces: (SquarePiece | null)[];
  isWhitePerspective: boolean;
  highlightMoves: string[];
}

function Board({ positionPieces, isWhitePerspective, highlightMoves }: BoardProps) {
  const files = isWhitePerspective ? 'abcdefgh' : 'hgfedcba';
  const ranks = isWhitePerspective ? '87654321' : '12345678';
  const getCoords = (square: string) => {
    return [files.indexOf(square[0]), ranks.indexOf(square[1])];
  }
  const boardElements = [];
  for (const piece of positionPieces) {
    if (piece === null) {
      boardElements.push(<div/>);
      continue;
    }
    const [x, y] = getCoords(piece.square);
    boardElements.push(<div
      className={getPieceClass(piece)}
      style={{transform: `translate(${x*40}px, ${y*40}px)`}}></div>);
  }
  for (let i = 0; i < 8; i++) {
    boardElements.push(<div style={{transform: `translate(${40*i}px, 280px)`}}>
      <p className={i%2 === 0 ? 'file-light' : 'file-dark'}>{files[i]}</p>
    </div>);
    boardElements.push(<div style={{transform: `translate(280px, ${40*i}px)`}}>
      <p className={i%2 === 0 ? 'rank-light' : 'rank-dark'}>{ranks[i]}</p>
    </div>);
  }
  const arrowPolygons = [];
  for (let i = highlightMoves.length-1; i >= 0; i--) {
    const move = highlightMoves[i];
    const [startX, startY] = getCoords(move);
    const [endX, endY] = getCoords(move.substring(2));
    const h = Math.hypot(endY-startY, endX-startX)*12.5-4.5;
    const arrowPoints = `-1.375 0, -1.375 ${h}, -3.25 ${h}, 0 ${h+4.5}, 3.25 ${h}, 1.375 ${h}, 1.375 0`;
    const angle = Math.atan2(endY-startY, endX-startX)*180/Math.PI-90;
    arrowPolygons.push(<polygon
      points={arrowPoints}
      transform={`translate(${startX*12.5+6.25} ${startY*12.5+6.25}) rotate(${angle} 0 0)`}
      style={{fill: `rgb(${i === 0 ? 160 : 255}, 255, 210)`, opacity: 0.6}}>
    </polygon>);
  }
  return (
    <div className='board'>
      {boardElements}
      <svg viewBox="0 0 100 100">
        {arrowPolygons}
      </svg>
    </div>
  );
}

export default Board;
