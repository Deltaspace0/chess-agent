import './App.css';
import { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Arrow, ChessboardOptions } from 'react-chessboard';
import type { RegionStatus } from '../interface';
import Checkbox from './components/Checkbox.tsx';
import Gauge from './components/Gauge.tsx';
import Slider from './components/Slider.tsx';
import { useCheckboxProps, useElectronValue, usePreference, useSliderProps } from './hooks.ts';
import { sliders } from '../config.ts';

type Panel = 'main' | 'settings' | 'promotion';

function App() {
  const electron = window.electronAPI;
  const autoResponseProps = useCheckboxProps({
    label: 'Auto response',
    preferenceName: 'autoResponse'
  });
  const autoScanProps = useCheckboxProps({
    label: 'Auto scan',
    preferenceName: 'autoScan'
  });
  const autoQueenProps = useCheckboxProps({
    label: 'Auto queen',
    preferenceName: 'autoQueen'
  });
  const draggingModeProps = useCheckboxProps({
    label: 'Dragging mode',
    preferenceName: 'draggingMode'
  });
  const actionRegionProps = useCheckboxProps({
    label: 'Invisible action regions',
    preferenceName: 'actionRegion'
  });
  const saveConfigToFileProps = useCheckboxProps({
    label: 'Save config on exit',
    preferenceName: 'saveConfigToFile'
  });
  const showEvalBarProps = useCheckboxProps({
    label: 'Show eval bar',
    preferenceName: 'showEvalBar'
  });
  const showArrowsProps = useCheckboxProps({
    label: 'Show arrows',
    preferenceName: 'showArrows'
  });
  const showLinesProps = useCheckboxProps({
    label: 'Show lines',
    preferenceName: 'showLines'
  });
  const showNotationProps = useCheckboxProps({
    label: 'Show notation',
    preferenceName: 'showNotation'
  });
  const durationProps = useSliderProps({
    label: 'Analysis duration (ms)',
    list: sliders.analysisDurations,
    preferenceName: 'analysisDuration'
  });
  const multiPVProps = useSliderProps({
    label: 'Multiple lines',
    list: sliders.multiPVs,
    preferenceName: 'multiPV'
  });
  const mouseProps = useSliderProps({
    label: 'Mouse speed',
    list: sliders.mouseSpeeds,
    preferenceName: 'mouseSpeed'
  });
  const [isWhitePerspective, sendPerspective] = usePreference('isWhitePerspective');
  const [enginePath, sendEnginePath] = usePreference('enginePath');
  const statusText = useElectronValue('', electron.onUpdateStatus);
  const regionStatus = useElectronValue<RegionStatus>('none', electron.onUpdateRegion);
  const evaluation = useElectronValue('cp 0', electron.onEvaluation);
  const principalVariations = useElectronValue([], electron.onPrincipalVariations);
  const [positionFEN, setPositionFEN] = useState('');
  const [arrows1, setArrows1] = useState<Arrow[]>([]);
  const [arrows2, setArrows2] = useState<Arrow[]>([]);
  const [panelType, setPanelType] = useState<Panel>('main');
  useEffect(() => {
    electron.onUpdatePosition((value) => {
      setPositionFEN(value);
      setPanelType((x) => x === 'promotion' ? 'main' : x);
    });
    electron.onHighlightMoves((evalMoves) => {
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
    electron.onPromotion(() => setPanelType('promotion'));
  }, [electron]);
  const pvComponents = [];
  for (const variation of principalVariations) {
    pvComponents.push(<p className='variation'>{variation}</p>);
  }
  const chessboardOptions: ChessboardOptions = {
    showNotation: showNotationProps.checked,
    arrows: showArrowsProps.checked
      ? (isWhitePerspective ? arrows1 : arrows2)
      : [],
    allowDrawingArrows: false,
    boardOrientation: isWhitePerspective ? 'white' : 'black',
    position: positionFEN,
    onPieceDrop: ({ sourceSquare, targetSquare }) => {
      if (targetSquare === null || targetSquare === sourceSquare) {
        return false;
      }
      electron.pieceDropped(sourceSquare+targetSquare);
      return true;
    }
  };
  const panels = {
    main: <>
      <fieldset>
        <legend>Actions</legend>
        <div className='flex-row'>
          <button
            onClick={() => electron.bestMove()}
            disabled={regionStatus !== 'exist'}>
              Best move
          </button>
          <button
            onClick={() => electron.scanMove()}
            disabled={regionStatus !== 'exist'}>
              Scan move
          </button>
          <button onClick={() => electron.resetPosition()}>Reset</button>
          <button onClick={() => sendPerspective(!isWhitePerspective)}>
            {isWhitePerspective ? 'White' : 'Black'} (flip)
          </button>
        </div>
        <div className='flex-row'>
          <button
            onClick={() => electron.recognizeBoard()}
            disabled={regionStatus !== 'exist'}>
              Recognize
          </button>
          <button
            onClick={() => electron.loadHashes()}
            disabled={regionStatus !== 'exist'}>
              Load hashes
          </button>
          <button onClick={() => electron.undoMove()}>Undo move</button>
          <button onClick={() => electron.skipMove()}>Skip move</button>
        </div>
      </fieldset>
      {showLinesProps.checked && <fieldset className='pv'>
        <legend>Principal variations</legend>
        {pvComponents}
      </fieldset>}
    </>,
    settings: <>
      <fieldset className='settings'>
        <legend>Settings</legend>
        <div className='flex-row'>
          <button onClick={() => electron.dialogEngine()}>Load external engine</button>
          <button
            onClick={() => sendEnginePath(null)}
            disabled={enginePath === null}>
              Remove external engine
          </button>
        </div>
        {enginePath !== null && <p className='status'>{enginePath}</p>}
        <Slider {...durationProps}/>
        <Slider {...multiPVProps}/>
        <Slider {...mouseProps}/>
        <div className='flex-row'>
          <div className='flex-column'>
            <Checkbox {...autoResponseProps}/>
            <Checkbox {...autoScanProps}/>
            <Checkbox {...autoQueenProps}/>
            <Checkbox {...actionRegionProps}/>
            <Checkbox {...draggingModeProps}/>
            <Checkbox {...saveConfigToFileProps}/>
          </div>
          <div className='flex-column'>
            <Checkbox {...showEvalBarProps}/>
            <Checkbox {...showArrowsProps}/>
            <Checkbox {...showLinesProps}/>
            <Checkbox {...showNotationProps}/>
          </div>
        </div>
      </fieldset>
    </>,
    promotion: <>
      <fieldset>
        <legend>Promote pawn to</legend>
        <div className='flex-row'>
          <button onClick={() => electron.promoteTo('q')}>Queen</button>
          <button onClick={() => electron.promoteTo('r')}>Rook</button>
          <button onClick={() => electron.promoteTo('b')}>Bishop</button>
          <button onClick={() => electron.promoteTo('n')}>Knight</button>
        </div>
        <div className='flex-row'>
          <button onClick={() => setPanelType('main')}>Cancel</button>
        </div>
      </fieldset>
    </>
  };
  return (
    <div className='App'>
      <div className='flex-column'>
        <div className='flex-row'>
          <button onClick={() => electron.newRegion()}>
            {regionStatus === 'selecting' ? 'Cancel selection' : 'Select new region'}
          </button>
          <button
            onClick={() => electron.showRegion()}
            disabled={regionStatus !== 'exist'}>
              Show region
          </button>
          <button
            onClick={() => electron.removeRegion()}
            disabled={regionStatus !== 'exist'}>
              Remove region
          </button>
        </div>
        <div className='flex-row'>
          <div className='board'>
            <Chessboard options={chessboardOptions}/>
          </div>
          {showEvalBarProps.checked && <Gauge
            evaluation={evaluation}
            isWhitePerspective={isWhitePerspective}
          />}
        </div>
        <div className='flex-row'>
          <p className='status'>{statusText}</p>
          {panelType === 'settings' ? (
            <button onClick={() => setPanelType('main')}>Close settings</button>
          ) : (
            <button onClick={() => setPanelType('settings')}>Show settings</button>
          )}
        </div>
        {panels[panelType]}
      </div>
    </div>
  );
}

export default App;
