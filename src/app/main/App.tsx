import '../App.css';
import { useEffect, useRef, useState } from 'react';
import { Chessboard, ChessboardProvider, SparePiece } from 'react-chessboard';
import type { Arrow, ChessboardOptions } from 'react-chessboard';
import ActionButton from '../components/ActionButton.tsx';
import EvalBar from '../components/EvalBar.tsx';
import EditPanel from './EditPanel.tsx';
import SettingsPanel from './SettingsPanel.tsx';
import { usePreference, useSignal } from '../hooks.ts';
import ActionIcon from '../components/ActionIcon.tsx';

type Panel = 'main' | 'promotion' | 'edit' | 'settings';

function App() {
  const electron = window.electronAPI;
  const [showNotation] = usePreference('showNotation');
  const [showArrows] = usePreference('showArrows');
  const [showEvalBar] = usePreference('showEvalBar');
  const [showCursor] = usePreference('showCursor');
  const [perspective] = usePreference('perspective');
  const [region] = usePreference('region');
  const [recognizerModel] = usePreference('recognizerModel');
  const statusText = useSignal('status');
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
      const x = (!value || value.x > 1 || value.x < 0) ? -1 : value.x;
      const y = (!value || value.y > 1 || value.y < 0) ? -1 : value.y;
      virtualCursor.style.left = `calc(4px + ${x} * (100% - 8px))`;
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
    showNotation,
    arrows: showArrows ? (perspective ? arrows1 : arrows2) : [],
    allowDrawingArrows: false,
    boardOrientation: perspective ? 'white' : 'black',
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
      {perspective ? blackSparePieces : whiteSparePieces}
      <div className='board'>
        <Chessboard/>
      </div>
      {perspective ? whiteSparePieces : blackSparePieces}
    </>) : <Chessboard/>}
    {showCursor && <div ref={virtualCursorRef} className='virtual-cursor'/>}
  </div>;
  const mainPanelIcon = <ActionIcon
    title='Return'
    onClick={() => setPanelType('main')}
    svgPath='M1 1l8 8M9 1l-8 8'
  />;
  return (<ChessboardProvider options={chessboardOptions}>
    <div className='App'>
      <div className='flex-column'>
        <div style={{ display: 'flex', margin: '0 auto' }}>
          {showEvalBar && <EvalBar
            perspective={perspective}
            evaluation={engineInfo.evaluation}
          />}
          {chessboardComponent}
          <div className='flex-column' style={{width: '16px'}}>
            <ActionIcon
              name='perspective'
              svgPath='M3 1v7m-2-2l2 2l2-2M7 9V2m2 2l-2-2l-2 2'
            />
            <ActionIcon
              name='resetPosition'
              svgPath='M1 5a4 4 0 1 0 0.5-2m0-3v3h3'
            />
            {panelType === 'edit' ? <>
              <ActionIcon
                name='clearPosition'
                title='Clear position on the board'
                svgPath='M1 2h8M2.5 2L3 9h4L7.5 2M4 2v-1h2v1M5 2v7'
              />
            </> : <>
              <ActionIcon
                name='undoMove'
                svgPath='M8 1L2 5L8 9'
              />
              <ActionIcon
                name='recognizeBoard'
                disabled={!region || !recognizerModel}
                disabledTitle={region ? 'Please load hashes' : 'Please select region'}
                svgPath='M5 2.5a4 2.5 0 1 0 0.01 0M5 3.5a1.5 1.5 0 1 0 0.01 0'
              />
              <ActionIcon
                name='loadHashes'
                disabled={!region}
                disabledTitle='Please select region'
                svgPath='M3.5 1v8M6.5 1v8M1 3.5h8M1 6.5h8'
              />
            </>}
          </div>
        </div>
        <div className='flex-row' style={{justifyContent: 'left', margin: '0 4px'}}>
          {panelType === 'settings' ? <>
            {mainPanelIcon}
            <ActionIcon
              name='loadConfig'
              svgPath='M2 1v8h6v-6l-2-2zm4 0v2h2'
            />
            <ActionIcon
              name='saveConfig'
              svgPath='M1 1v8h8v-6l-2-2zm2 0v2h2v-2M3 9v-4h4v4'
            />
            <ActionIcon
              name='resetConfig'
              svgPath='M1 2h8M2.5 2L3 9h4L7.5 2M4 2v-1h2v1M5 2v7'
            />
          </> : <>
            <ActionIcon
              title='Settings'
              onClick={() => setPanelType('settings')}
              svgPath='M1 2.5h8m-2-1v2M1 5h8m-6-1v2M1 7.5h8m-4-1v2'
            />
            {panelType === 'edit' ? mainPanelIcon : <ActionIcon
              title='Edit board'
              onClick={() => setPanelType('edit')}
              svgPath='M7 1l-6 6v2h2l6-6zm-2 2l2 2'
            />}
            <ActionIcon
              name='showEngine'
              svgPath='M1 2A2 1 36 1 0 9 5M9 5A2 1 -36 1 0 1 8L1 2M7 5h1'
            />
            <ActionIcon
              name='selectRegion'
              svgPath='M1 1l2 8l1.5-4l4-1z'
            />
          </>}
          <p className='status'>Status: {statusText}</p>
        </div>
        {panels[panelType]}
      </div>
    </div>
  </ChessboardProvider>);
}

export default App;
