import './App.css';
import { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Arrow, ChessboardOptions } from 'react-chessboard';
import type { RegionStatus } from '../interface';
import Checkbox from './components/Checkbox.tsx';
import Gauge from './components/Gauge.tsx';
import Slider from './components/Slider.tsx';
import useCheckboxProps from './hooks/use-checkbox-props.ts';
import useSliderProps from './hooks/use-slider-props.ts';
import { sliders, defaultValues } from '../config.ts';

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
  const [statusText, setStatusText] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isWhitePerspective, setIsWhitePerspective] = useState(defaultValues.isWhitePerspective);
  const [regionStatus, setRegionStatus] = useState<RegionStatus>('none');
  const [positionFEN, setPositionFEN] = useState('');
  const [evaluation, setEvaluation] = useState('cp 0');
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [principalVariations, setPrincipalVariations] = useState<string[]>([]);
  useEffect(() => {
    electron.onUpdatePreference('isWhitePerspective', setIsWhitePerspective);
    electron.onUpdateStatus(setStatusText);
    electron.onUpdateRegion(setRegionStatus);
    electron.onUpdatePosition(setPositionFEN);
    electron.onEvaluation(setEvaluation);
    electron.onHighlightMoves((evalMoves) => {
      const newArrows: Arrow[] = [];
      for (let i = evalMoves.length-1; i >= 0; i--) {
        const [type, evaluation, move] = evalMoves[i];
        const opacity = i === 0 ? 0.8 : 0.5;
        const n = Math.tanh(Number(evaluation)/300);
        const newArrow = {
          startSquare: move.substring(0, 2),
          endSquare: move.substring(2, 4),
          color: type === 'mate'
            ? (n > 0
              ? `rgba(0, 255, 238, ${opacity})`
              : `rgba(255, 98, 0, ${opacity})`
            ) : (n > 0
              ? `rgba(${255*(1-n)}, ${255*(1-n)}, 255, ${opacity})`
              : `rgba(255, ${255*(1+n)}, ${255*(1+n)}, ${opacity})`
            )
        };
        let exists = false;
        for (const arrow of newArrows) {
          let same = arrow.startSquare === newArrow.startSquare;
          same &&= arrow.endSquare === newArrow.endSquare;
          if (same) {
            exists = true;
            break;
          }
        }
        if (!exists) {
          newArrows.push(newArrow);
        }
      }
      setArrows(newArrows);
    });
    electron.onPrincipalVariations(setPrincipalVariations);
  }, [electron]);
  const pvComponents = [];
  for (const variation of principalVariations) {
    pvComponents.push(<p className='variation'>{variation}</p>);
  }
  const chessboardOptions: ChessboardOptions = {
    showNotation: showNotationProps.checked,
    arrows: showArrowsProps.checked ? arrows : [],
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
          <button onClick={() => setShowSettings(!showSettings)}>
            {showSettings ? 'Close' : 'Open'} settings
          </button>
        </div>
        {showSettings ? (<>
          <fieldset className='settings'>
            <legend>Settings</legend>
            <Slider {...durationProps}/>
            <Slider {...multiPVProps}/>
            <Slider {...mouseProps}/>
            <div className='flex-row'>
              <div className='flex-column'>
                <Checkbox {...autoResponseProps}/>
                <Checkbox {...autoScanProps}/>
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
        </>) : (<>
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
              <button onClick={() => {
                electron.preferenceValue('isWhitePerspective', !isWhitePerspective);}}>
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
        </>)}
      </div>
    </div>
  );
}

export default App;
