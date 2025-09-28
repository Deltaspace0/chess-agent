import '../App.css';
import { useEffect, useState } from 'react';
import { Chessboard, ChessboardProvider, SparePiece } from 'react-chessboard';
import type { Arrow, ChessboardOptions } from 'react-chessboard';
import ActionButton from '../components/ActionButton.tsx';
import Gauge from '../components/Gauge.tsx';
import EditPanel from './EditPanel.tsx';
import { usePreferences, useVariable } from '../hooks.ts';

type Panel = 'main' | 'promotion' | 'edit';

function App() {
  const electron = window.electronAPI;
  const prefs = usePreferences();
  const statusText = useVariable('status');
  const isNoRegion = !prefs.region.value;
  const engineInfo = useVariable('engineInfo');
  const principalVariations = useVariable('principalVariations');
  const [positionFEN, setPositionFEN] = useState('');
  const [arrows1, setArrows1] = useState<Arrow[]>([]);
  const [arrows2, setArrows2] = useState<Arrow[]>([]);
  const [panelType, setPanelType] = useState<Panel>('main');
  const [showActions, setShowActions] = useState(true);
  useEffect(() => {
    const offPosition = electron.onVariable('positionFEN', (value) => {
      setPositionFEN(value);
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
        electron.pieceDroppedEdit(data);
      } else if (targetSquare) {
        electron.pieceDropped(data);
      }
      return true;
    }
  };
  const panels = {
    main: <>
      {showActions ? (<fieldset>
        <legend>Actions</legend>
        <div className='flex-row'>
          <ActionButton name='bestMove' disabled={isNoRegion}/>
          <ActionButton name='scanMove' disabled={isNoRegion}/>
          <ActionButton name='resetPosition'/>
          <button
            title={prefs.perspective.checkboxProps.title}
            onClick={() => prefs.perspective.send(!prefs.perspective.value)}>
              {prefs.perspective.value ? 'White' : 'Black'} (flip)
          </button>
        </div>
        <div className='flex-row'>
          <ActionButton name='recognizeBoard' disabled={isNoRegion}/>
          <ActionButton name='loadHashes' disabled={isNoRegion}/>
          <ActionButton name='undoMove'/>
          <button onClick={() => setShowActions(false)}>Hide actions</button>
        </div>
      </fieldset>) : (<div className='flex-row'>
        <button onClick={() => setShowActions(true)}>Show actions</button>
      </div>)}
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
        <ActionButton name='promoteQueen'/>
        <ActionButton name='promoteRook'/>
        <ActionButton name='promoteBishop'/>
        <ActionButton name='promoteKnight'/>
      </div>
      <div className='flex-row'>
        <button onClick={() => setPanelType('main')}>Cancel</button>
      </div>
    </fieldset>,
    edit: <EditPanel positionFEN={positionFEN}/>
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
  </div>;
  return (<ChessboardProvider options={chessboardOptions}>
    <div className='App'>
      <div className='flex-column'>
        {prefs.showEvalBar.value ? (<div className='board-gauge-div'>
          {chessboardComponent}
          <Gauge
            perspective={prefs.perspective.value}
            evaluation={engineInfo.evaluation}
          />
        </div>) : chessboardComponent}
        <p className='status'>{statusText}</p>
        <div className='flex-row'>
          <ActionButton name='showRegion'/>
          <ActionButton name='showEngine'/>
          {panelType === 'edit'
            ? <button onClick={() => setPanelType('main')}>Return</button>
            : <button onClick={() => setPanelType('edit')}>Edit board</button>}
          <ActionButton name='showSettings'/>
        </div>
        {panels[panelType]}
      </div>
    </div>
  </ChessboardProvider>);
}

export default App;
