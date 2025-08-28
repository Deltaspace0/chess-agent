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
  isWhitePerspective: boolean
}

function Board({ positionPieces, isWhitePerspective }: BoardProps) {
  const files = isWhitePerspective ? 'abcdefgh' : 'hgfedcba';
  const ranks = isWhitePerspective ? '87654321' : '12345678';
  const boardElements = [];
  for (const piece of positionPieces) {
    if (piece === null) {
      boardElements.push(<div/>);
      continue;
    }
    const x = files.indexOf(piece.square[0])*40;
    const y = ranks.indexOf(piece.square[1])*40;
    boardElements.push(<div
      className={getPieceClass(piece)}
      style={{transform: `translate(${x}px, ${y}px)`}}></div>);
  }
  for (let i = 0; i < 8; i++) {
    boardElements.push(<div style={{transform: `translate(${40*i}px, 280px)`}}>
      <p className={i%2 === 0 ? 'file-light' : 'file-dark'}>{files[i]}</p>
    </div>);
    boardElements.push(<div style={{transform: `translate(280px, ${40*i}px)`}}>
      <p className={i%2 === 0 ? 'rank-light' : 'rank-dark'}>{ranks[i]}</p>
    </div>);
  }
  return (
    <div className='board'>
      {boardElements}
    </div>
  );
}

export default Board;
