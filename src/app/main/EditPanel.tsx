import { useEffect, useRef, useState } from 'react';
import ActionButton from '../components/ActionButton.tsx';
import Checkbox from '../components/Checkbox.tsx';
import Radio from '../components/Radio.tsx';
import { useVariable } from '../hooks.ts';

interface EditProps {
  positionFEN: string;
}

function EditPanel({ positionFEN }: EditProps) {
  const electron = window.electronAPI;
  const positionInfo = useVariable('positionInfo');
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
        checked={positionInfo.whiteCastlingRights.k}
        onChange={(value) => {
          const newPositionInfo = structuredClone(positionInfo);
          newPositionInfo.whiteCastlingRights.k = value;
          electron.setPositionInfo(newPositionInfo);
        }}
      />
      <Checkbox
        label='O-O-O'
        checked={positionInfo.whiteCastlingRights.q}
        onChange={(value) => {
          const newPositionInfo = structuredClone(positionInfo);
          newPositionInfo.whiteCastlingRights.q = value;
          electron.setPositionInfo(newPositionInfo);
        }}
      />
    </div>
    <div className='flex-column'>
      <p style={{margin: '4px 0'}}>Black:</p>
      <Checkbox
        label='O-O'
        checked={positionInfo.blackCastlingRights.k}
        onChange={(value) => {
          const newPositionInfo = structuredClone(positionInfo);
          newPositionInfo.blackCastlingRights.k = value;
          electron.setPositionInfo(newPositionInfo);
        }}
      />
      <Checkbox
        label='O-O-O'
        checked={positionInfo.blackCastlingRights.q}
        onChange={(value) => {
          const newPositionInfo = structuredClone(positionInfo);
          newPositionInfo.blackCastlingRights.q = value;
          electron.setPositionInfo(newPositionInfo);
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
              electron.setPosition(inputFEN);
              e.preventDefault();
            }
          }}
        />
        <button onClick={() => electron.setPosition(inputFEN)}>
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
              electron.setPositionInfo(newPositionInfo);
            }}/>
          <Radio
            label='Black'
            name='turn'
            value='b'
            checked={!positionInfo.isWhiteTurn}
            onChange={() => {
              const newPositionInfo = structuredClone(positionInfo);
              newPositionInfo.isWhiteTurn = false;
              electron.setPositionInfo(newPositionInfo);
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
