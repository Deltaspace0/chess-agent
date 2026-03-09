import { useState } from 'react';
import Checkbox from '../components/Checkbox.tsx';
import Radio from '../components/Radio.tsx';
import {
  getCastlingFEN,
  getTurnFEN,
  setCastlingFEN,
  setTurnFEN
} from '../../util.ts';

interface EditProps {
  fen: string;
}

function EditPanel({ fen }: EditProps) {
  const [inputFEN, setInputFEN] = useState(fen);
  const [prevFEN, setPrevFEN] = useState(fen);
  if (prevFEN !== fen) {
    setInputFEN(fen);
    setPrevFEN(fen);
  }
  const sendFEN = (fen: string) =>
    window.electronAPI.sendSignal('positionFEN', fen);
  const castlingBox = (label: string, title: string, castling: string) =>
    <Checkbox
      label={label}
      title={title}
      checked={getCastlingFEN(fen, castling)}
      onChange={(value) => sendFEN(setCastlingFEN(fen, castling, value))}
    />;
  return (<div className='flex-column' style={{overflow: 'auto'}}>
    <div className='flex-row'>
      <input
        type='text'
        style={{minWidth: 'calc(100% - 80px)'}}
        value={inputFEN}
        onChange={(e) => setInputFEN(e.target.value)}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter') {
            sendFEN(inputFEN);
            e.preventDefault();
          }
        }}
      />
      <button onClick={() => sendFEN(inputFEN)}>Set FEN</button>
    </div>
    <div className='flex-row'>
      <div className='flex-column'>
        <p style={{margin: '4px 0'}}>Turn:</p>
        <Radio
          label='White'
          name='turn'
          value='w'
          checked={getTurnFEN(fen)}
          onChange={() => sendFEN(setTurnFEN(fen, true))}
        />
        <Radio
          label='Black'
          name='turn'
          value='b'
          checked={!getTurnFEN(fen)}
          onChange={() => sendFEN(setTurnFEN(fen, false))}
        />
      </div>
      <div className='flex-column'>
        <p style={{margin: '4px 0'}}>White:</p>
        {castlingBox('O-O', 'White can castle kingside', 'K')}
        {castlingBox('O-O-O', 'White can castle queenside', 'Q')}
      </div>
      <div className='flex-column'>
        <p style={{margin: '4px 0'}}>Black:</p>
        {castlingBox('O-O', 'Black can castle kingside', 'k')}
        {castlingBox('O-O-O', 'Black can castle queenside', 'q')}
      </div>
    </div>
  </div>);
}

export default EditPanel;
