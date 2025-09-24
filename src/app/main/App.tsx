import '../App.css';
import React, { useEffect, useState } from 'react';
import { Chessboard, ChessboardProvider, SparePiece } from 'react-chessboard';
import type { Arrow, ChessboardOptions } from 'react-chessboard';
import ActionButton from '../components/ActionButton.tsx';
import Checkbox from '../components/Checkbox.tsx';
import Gauge from '../components/Gauge.tsx';
import Radio from '../components/Radio.tsx';
import Slider from '../components/Slider.tsx';
import { usePreferences, useVariable } from '../hooks.ts';

type Panel = 'main' | 'settings' | 'promotion' | 'edit';

function App() {
  const electron = window.electronAPI;
  const prefs = usePreferences();
  const statusText = useVariable('status');
  const isNoRegion = !prefs.region.value;
  const engineInfo = useVariable('engineInfo');
  const principalVariations = useVariable('principalVariations');
  const positionInfo = useVariable('positionInfo');
  const [positionFEN, setPositionFEN] = useState('');
  const [inputFEN, setInputFEN] = useState('');
  const [arrows1, setArrows1] = useState<Arrow[]>([]);
  const [arrows2, setArrows2] = useState<Arrow[]>([]);
  const [panelType, setPanelType] = useState<Panel>('main');
  useEffect(() => {
    const offPosition = electron.onVariable('positionFEN', (value) => {
      setPositionFEN(value);
      setInputFEN(value);
      setPanelType((x) => x === 'promotion' ? 'main' : x);
    });
    const offHighlight = electron.onVariable('highlightMoves', (evalMoves) => {
      const newArrows1: Arrow[] = [];
      const newArrows2: Arrow[] = [];
      for (let i = evalMoves.length-1; i >= 0; i--) {
        const [type, evaluation, move] = evalMoves[i];
        const opacity = i === 0 ? 1 : 0.5;
        const n = Math.tanh(Number(evaluation)/300);
        const colorN = 255*(1-Math.abs(n));
        const color1 = type === 'mate'
          ? `rgba(0, 255, 238, ${opacity})`
          : `rgba(${colorN}, 255, ${colorN}, ${opacity})`;
        const color2 = type === 'mate'
          ? `rgba(255, 98, 0, ${opacity})`
          : `rgba(255, ${colorN}, ${colorN}, ${opacity})`;
        const newArrow = {
          startSquare: move.substring(0, 2),
          endSquare: move.substring(2, 4)
        };
        let index = newArrows1.length;
        for (let j = 0; j < newArrows1.length; j++) {
          const { startSquare, endSquare } = newArrows1[j];
          let same = startSquare === newArrow.startSquare;
          same &&= endSquare === newArrow.endSquare;
          if (same) {
            index = j;
            break;
          }
        }
        newArrows1[index] = { ...newArrow, color: n > 0 ? color1 : color2 };
        newArrows2[index] = { ...newArrow, color: n > 0 ? color2 : color1 };
      }
      setArrows1(newArrows1);
      setArrows2(newArrows2);
    });
    const offPromotion = electron.onPromotion(() => setPanelType('promotion'));
    return () => {
      offPosition();
      offHighlight();
      offPromotion();
    };
  }, [electron]);
  const chessboardOptions: ChessboardOptions = {
    showNotation: prefs.showNotation.value,
    arrows: prefs.showArrows.value
      ? (prefs.perspective.value ? arrows1 : arrows2) : [],
    allowDrawingArrows: false,
    boardOrientation: prefs.perspective.value ? 'white' : 'black',
    position: positionFEN,
    onPieceDrop: ({ sourceSquare, targetSquare, piece }) => {
      const source = piece.isSparePiece ? null : sourceSquare;
      if (source === targetSquare) {
        return false;
      }
      const data = {
        sourceSquare: source,
        targetSquare,
        piece: piece.pieceType
      };
      if (panelType === 'edit') {
        electron.pieceDroppedEdit(data);
      } else if (targetSquare) {
        electron.pieceDropped(data);
      }
      return true;
    }
  };
  const panels = {
    main: <>
      <fieldset>
        <legend>Actions</legend>
        <div className='flex-row'>
          <ActionButton name='bestMove' disabled={isNoRegion}/>
          <ActionButton name='scanMove' disabled={isNoRegion}/>
          <ActionButton name='resetPosition'/>
          <button onClick={() => prefs.perspective.send(!prefs.perspective.value)}>
            {prefs.perspective.value ? 'White' : 'Black'} (flip)
          </button>
        </div>
        <div className='flex-row'>
          <ActionButton name='recognizeBoard' disabled={isNoRegion}/>
          <ActionButton name='loadHashes' disabled={isNoRegion}/>
          <ActionButton name='undoMove'/>
          <ActionButton name='showRegion'/>
        </div>
      </fieldset>
      <fieldset className='pv'>
        <legend>Principal variations</legend>
        <p className='text'>
          Depth: {engineInfo.depth}, time: {engineInfo.time} ms,
          nodes: {engineInfo.nodes}
        </p>
        {prefs.showLines.value &&
          principalVariations.map((x) => <p className='text'>{x}</p>)}
      </fieldset>
    </>,
    settings: <>
      <fieldset className='scroll-field'>
        <legend>Settings</legend>
        <Slider {...prefs.analysisDuration.sliderProps}/>
        <Slider {...prefs.multiPV.sliderProps}/>
        <Slider {...prefs.engineThreads.sliderProps}/>
        <Slider {...prefs.mouseSpeed.sliderProps}/>
        <div className='flex-row'>
          <div className='flex-column'>
            <Checkbox {...prefs.autoResponse.checkboxProps}/>
            <Checkbox {...prefs.autoScan.checkboxProps}/>
            <Checkbox {...prefs.autoQueen.checkboxProps}/>
            <Checkbox {...prefs.actionRegion.checkboxProps}/>
            <Checkbox {...prefs.draggingMode.checkboxProps}/>
            <Checkbox {...prefs.saveConfigToFile.checkboxProps}/>
          </div>
          <div className='flex-column'>
            <Checkbox {...prefs.alwaysOnTop.checkboxProps}/>
            <Checkbox {...prefs.showEvalBar.checkboxProps}/>
            <Checkbox {...prefs.showArrows.checkboxProps}/>
            <Checkbox {...prefs.showLines.checkboxProps}/>
            <Checkbox {...prefs.showNotation.checkboxProps}/>
          </div>
        </div>
      </fieldset>
    </>,
    promotion: <>
      <fieldset>
        <legend>Promote pawn to</legend>
        <div className='flex-row'>
          <ActionButton name='promoteQueen'/>
          <ActionButton name='promoteRook'/>
          <ActionButton name='promoteBishop'/>
          <ActionButton name='promoteKnight'/>
        </div>
        <div className='flex-row'>
          <button onClick={() => setPanelType('main')}>Cancel</button>
        </div>
      </fieldset>
    </>,
    edit: <>
      <fieldset className='full-field'>
        <legend>Edit board</legend>
        <div className='flex-column'>
          <div className='flex-row'>
            <SparePiece pieceType='wP'/>
            <SparePiece pieceType='wR'/>
            <SparePiece pieceType='wN'/>
            <SparePiece pieceType='wB'/>
            <SparePiece pieceType='wQ'/>
            <SparePiece pieceType='wK'/>
            <SparePiece pieceType='bP'/>
            <SparePiece pieceType='bR'/>
            <SparePiece pieceType='bN'/>
            <SparePiece pieceType='bB'/>
            <SparePiece pieceType='bQ'/>
            <SparePiece pieceType='bK'/>
          </div>
          <div className='flex-row'>
            <input
              type='text'
              style={{minWidth: '240px'}}
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
            <div className='flex-column' style={{margin: '16px 0'}}>
              <ActionButton name='resetPosition' style={{width: '64px'}}/>
              <ActionButton name='clearPosition' style={{width: '64px'}}/>
            </div>
            <div className='flex-column'>
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
          </div>
        </div>
      </fieldset>
    </>
  };
  return (<ChessboardProvider options={chessboardOptions}>
    <div className='App'>
      <div className='flex-column'>
        <div className='flex-row'>
          <div className='board'>
            <Chessboard/>
          </div>
          {prefs.showEvalBar.value && <Gauge
            perspective={prefs.perspective.value}
            evaluation={engineInfo.evaluation}
          />}
        </div>
        <p className='status'>{statusText}</p>
        {panels[panelType]}
        <div className='flex-row'>
          <ActionButton name='showEngine'/>
          {panelType === 'edit'
            ? <button onClick={() => setPanelType('main')}>Return</button>
            : <button onClick={() => setPanelType('edit')}>Edit board</button>}
          {panelType === 'settings'
            ? <button onClick={() => setPanelType('main')}>Return</button>
            : <button onClick={() => setPanelType('settings')}>Settings</button>}
        </div>
      </div>
    </div>
  </ChessboardProvider>);
}

export default App;
