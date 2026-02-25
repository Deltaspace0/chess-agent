import '../App.css';
import { useEffect, useRef, useState } from 'react';
import { Chessboard, ChessboardProvider, SparePiece } from 'react-chessboard';
import type { Arrow, ChessboardOptions } from 'react-chessboard';
import ActionButton from '../components/ActionButton.tsx';
import EvalBar from '../components/EvalBar.tsx';
import EditPanel from './EditPanel.tsx';
import SettingsPanel from './SettingsPanel.tsx';
import { actionDescriptions } from '../../config.ts';
import { usePreferences, useSignal } from '../hooks.ts';
import ActionIcon from '../components/ActionIcon.tsx';

type Panel = 'main' | 'promotion' | 'edit' | 'settings';

function App() {
  const electron = window.electronAPI;
  const prefs = usePreferences();
  const statusText = useSignal('status');
  const hoveredAction = useSignal('hoveredAction');
  const hoveredActionDescription = hoveredAction
    && actionDescriptions[hoveredAction as keyof typeof actionDescriptions]
    || 'None';
  const engineInfo = useSignal('engineInfo') || {};
  const principalVariations = useSignal('principalVariations') || [];
  const [positionFEN, setPositionFEN] = useState('');
  const positionInfo = useSignal('positionInfo') || {
    whiteCastlingRights: { 'k': true, 'q': true },
    blackCastlingRights: { 'k': true, 'q': true },
    isWhiteTurn: true
  };
  const [arrows1, setArrows1] = useState<Arrow[]>([]);
  const [arrows2, setArrows2] = useState<Arrow[]>([]);
  const [panelType, setPanelType] = useState<Panel>('main');
  const virtualCursorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const offPosition = electron.onSignal('positionFEN', (value) => {
      setPositionFEN(value);
      setPanelType((x) => x === 'promotion' ? 'main' : x);
    });
    const offHighlight = electron.onSignal('highlightMoves', (evalMoves) => {
      if (!evalMoves) {
        setArrows1([]);
        setArrows2([]);
        return;
      }
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
    const offPromotion = electron.onSignal('promotion', () => {
      setPanelType('promotion');
    });
    const offMousePosition = electron.onSignal('mousePosition', (value) => {
      const virtualCursor = virtualCursorRef.current;
      if (!virtualCursor) {
        return;
      }
      const x = (!value || value.x > 1) ? -1 : value.x;
      const y = (!value || value.y > 1) ? -1 : value.y;
      virtualCursor.style.left = `${x*100}%`;
      virtualCursor.style.top = `${y*100}%`;
    });
    return () => {
      offPosition();
      offHighlight();
      offPromotion();
      offMousePosition();
    };
  }, [electron]);
  const chessboardOptions: ChessboardOptions = {
    lightSquareStyle: {
      background: '#718fc6'
    },
    darkSquareStyle: {
      background: '#2f4672'
    },
    lightSquareNotationStyle: {
      color: '#26395c'
    },
    darkSquareNotationStyle: {
      color: '#87a6de'
    },
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
        electron.sendSignal('pieceDroppedEdit', data);
      } else if (targetSquare) {
        electron.sendSignal('pieceDropped', data);
      }
      return true;
    }
  };
  const panels = {
    main: <>
      <fieldset className='pv-field'>
        <legend>Principal variations</legend>
        <p className='text'>
          Depth: {engineInfo.depth}, time: {engineInfo.time} ms,
          nodes: {engineInfo.nodes}
        </p>
        {principalVariations.map((x) => <p className='text'>{x}</p>)}
      </fieldset>
    </>,
    promotion: <fieldset>
      <legend>Promote pawn to</legend>
      <div className='flex-row'>
        <ActionButton name='promoteQueen' label='Queen'/>
        <ActionButton name='promoteRook' label='Rook'/>
        <ActionButton name='promoteBishop' label='Bishop'/>
        <ActionButton name='promoteKnight' label='Knight'/>
      </div>
      <div className='flex-row'>
        <button onClick={() => setPanelType('main')}>Cancel</button>
      </div>
    </fieldset>,
    edit: <EditPanel positionFEN={positionFEN} positionInfo={positionInfo}/>,
    settings: <SettingsPanel/>
  };
  const whiteSparePieces = <div className='spare-pieces-div'>
    <SparePiece pieceType='wP'/>
    <SparePiece pieceType='wR'/>
    <SparePiece pieceType='wN'/>
    <SparePiece pieceType='wB'/>
    <SparePiece pieceType='wQ'/>
    <SparePiece pieceType='wK'/>
  </div>;
  const blackSparePieces = <div className='spare-pieces-div'>
    <SparePiece pieceType='bP'/>
    <SparePiece pieceType='bR'/>
    <SparePiece pieceType='bN'/>
    <SparePiece pieceType='bB'/>
    <SparePiece pieceType='bQ'/>
    <SparePiece pieceType='bK'/>
  </div>;
  const chessboardComponent = <div className='board-with-pieces'>
    {panelType === 'edit' ? (<>
      {prefs.perspective.value ? blackSparePieces : whiteSparePieces}
      <div className='board'>
        <Chessboard/>
      </div>
      {prefs.perspective.value ? whiteSparePieces : blackSparePieces}
    </>) : <Chessboard/>}
    {prefs.showCursor.value && <div
      ref={virtualCursorRef}
      className='virtual-cursor'
    />}
  </div>;
  return (<ChessboardProvider options={chessboardOptions}>
    <div className='App'>
      <div className='flex-column'>
        <div style={{ display: 'flex', margin: '0 auto' }}>
          {prefs.showEvalBar.value && <EvalBar
            perspective={prefs.perspective.value}
            evaluation={engineInfo.evaluation}
          />}
          {chessboardComponent}
          <div className='flex-column' style={{width: '16px'}}>
            <ActionIcon
              name='perspective'
              svgPath='M3 2v7m-2-2l2 2l2-2M7 9V2m2 2l-2-2l-2 2'
            />
            <ActionIcon
              name='resetPosition'
              svgPath='M2 5A3 3 0 1 0 2.5 2.5 M3 0L2.5 2.5l2 0.5'
            />
            <ActionIcon
              name='undoMove'
              svgPath='M7 2L3 5L7 8'
            />
            <ActionIcon
              name='recognizeBoard'
              svgPath='M5 2.5a4 2.5 0 1 0 0.01 0M5 3.5a1.5 1.5 0 1 0 0.01 0'
            />
            <ActionIcon
              name='loadHashes'
              svgPath='M3.5 1v8M6.5 1v8M1 3.5h8M1 6.5h8'
            />
            <ActionIcon
              name='selectRegion'
              svgPath='M2 2v6h6v-6z'
            />
            <ActionIcon
              name='showEngine'
              svgPath='M1 2A2 1 36 1 0 9 5M9 5A2 1 -36 1 0 1 8L1 2'
            />
          </div>
        </div>
        <p className='status'>Status: {statusText}</p>
        <p className='status'>Hovered action: {hoveredActionDescription}</p>
        <div className='flex-row'>
          {panelType === 'edit'
            ? <button onClick={() => setPanelType('main')}>Return</button>
            : <button onClick={() => setPanelType('edit')}>Edit board</button>}
          {panelType === 'settings'
            ? <button onClick={() => setPanelType('main')}>Return</button>
            : <button onClick={() => setPanelType('settings')}>Settings</button>}
        </div>
        {panels[panelType]}
      </div>
    </div>
  </ChessboardProvider>);
}

export default App;
