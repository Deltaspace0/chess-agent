import { useEffect, useRef, useState } from 'react';
import ActionButton from '../components/ActionButton.tsx';
import Checkbox from '../components/Checkbox.tsx';
import Radio from '../components/Radio.tsx';
import { useSignal } from '../hooks.ts';

interface EditProps {
  positionFEN: string;
}

function EditPanel({ positionFEN }: EditProps) {
  const electron = window.electronAPI;
  const positionInfo = useSignal('positionInfo') || {
    whiteCastlingRights: { 'k': true, 'q': true },
    blackCastlingRights: { 'k': true, 'q': true },
    isWhiteTurn: true
  };
  const [inputFEN, setInputFEN] = useState('');
  const [separateCastlingRow, setSeparateCastlingRow] = useState(false);
  const editFieldRef = useRef<HTMLFieldSetElement>(null);
  useEffect(() => setInputFEN(positionFEN), [positionFEN]);
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSeparateCastlingRow(entry.contentRect.width < 240);
      }
    });
    if (editFieldRef.current) {
      resizeObserver.observe(editFieldRef.current);
    }
    return () => resizeObserver.disconnect();
  }, []);
  const castlingCheckboxes = <>
    <div className='flex-column'>
      <p style={{margin: '4px 0'}}>White:</p>
      <Checkbox
        label='O-O'
        title='White can castle kingside'
        checked={positionInfo.whiteCastlingRights.k}
        onChange={(value) => {
          const newPositionInfo = structuredClone(positionInfo);
          newPositionInfo.whiteCastlingRights.k = value;
          electron.sendSignal('positionInfo', newPositionInfo);
        }}
      />
      <Checkbox
        label='O-O-O'
        title='White can castle queenside'
        checked={positionInfo.whiteCastlingRights.q}
        onChange={(value) => {
          const newPositionInfo = structuredClone(positionInfo);
          newPositionInfo.whiteCastlingRights.q = value;
          electron.sendSignal('positionInfo', newPositionInfo);
        }}
      />
    </div>
    <div className='flex-column'>
      <p style={{margin: '4px 0'}}>Black:</p>
      <Checkbox
        label='O-O'
        title='Black can castle kingside'
        checked={positionInfo.blackCastlingRights.k}
        onChange={(value) => {
          const newPositionInfo = structuredClone(positionInfo);
          newPositionInfo.blackCastlingRights.k = value;
          electron.sendSignal('positionInfo', newPositionInfo);
        }}
      />
      <Checkbox
        label='O-O-O'
        title='Black can castle queenside'
        checked={positionInfo.blackCastlingRights.q}
        onChange={(value) => {
          const newPositionInfo = structuredClone(positionInfo);
          newPositionInfo.blackCastlingRights.q = value;
          electron.sendSignal('positionInfo', newPositionInfo);
        }}
      />
    </div>
  </>;
  return (<fieldset ref={editFieldRef} className='scroll-field'>
    <legend>Edit board</legend>
    <div className='flex-column'>
      <div className='flex-row'>
        <input
          type='text'
          style={{minWidth: 'calc(100% - 80px)'}}
          value={inputFEN}
          onChange={(e) => setInputFEN(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
              electron.sendSignal('positionFEN', inputFEN);
              e.preventDefault();
            }
          }}
        />
        <button onClick={() => electron.sendSignal('positionFEN', inputFEN)}>
          Set FEN
        </button>
      </div>
      <div className='flex-row'>
        <ActionButton name='resetPosition'/>
        <ActionButton name='clearPosition'/>
      </div>
      <div className='flex-row'>
        <div className={separateCastlingRow ? 'flex-row' : 'flex-column'}>
          <p style={{margin: '4px 0'}}>Turn:</p>
          <Radio
            label='White'
            name='turn'
            value='w'
            checked={positionInfo.isWhiteTurn}
            onChange={() => {
              const newPositionInfo = structuredClone(positionInfo);
              newPositionInfo.isWhiteTurn = true;
              electron.sendSignal('positionInfo', newPositionInfo);
            }}/>
          <Radio
            label='Black'
            name='turn'
            value='b'
            checked={!positionInfo.isWhiteTurn}
            onChange={() => {
              const newPositionInfo = structuredClone(positionInfo);
              newPositionInfo.isWhiteTurn = false;
              electron.sendSignal('positionInfo', newPositionInfo);
            }}/>
        </div>
        {!separateCastlingRow && castlingCheckboxes}
      </div>
      {separateCastlingRow && <div className='flex-row'>
        {castlingCheckboxes}
      </div>}
    </div>
  </fieldset>);
}

export default EditPanel;
