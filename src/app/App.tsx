import './App.css';
import { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Arrow, ChessboardOptions } from 'react-chessboard';
import type { RegionStatus } from '../interface';
import Gauge from './components/Gauge.tsx';
import { useListSlider, Slider } from './components/Slider.tsx';
import useCheckboxProps from './hooks/use-checkbox-props.ts';
import { sliders, defaultValues } from '../config.ts';

function App() {
  const electron = window.electronAPI;
  const [statusText, setStatusText] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isWhitePerspective, setIsWhitePerspective] = useState(defaultValues.isWhitePerspective);
  const autoResponseProps = useCheckboxProps({
    initialValue: defaultValues.autoResponse,
    sendValue: electron.autoResponseValue,
    onUpdateValue: electron.onUpdateAutoResponse
  });
  const autoScanProps = useCheckboxProps({
    initialValue: defaultValues.autoScan,
    sendValue: electron.autoScanValue,
    onUpdateValue: electron.onUpdateAutoScan
  });
  const draggingModeProps = useCheckboxProps({
    initialValue: defaultValues.draggingMode,
    sendValue: electron.draggingValue,
    onUpdateValue: electron.onUpdateDragging
  });
  const actionRegionProps = useCheckboxProps({
    initialValue: defaultValues.actionRegion,
    sendValue: electron.actionRegionValue,
    onUpdateValue: electron.onUpdateActionRegion
  });
  const showEvalBarProps = useCheckboxProps({
    initialValue: defaultValues.showEvalBar,
    sendValue: electron.showEvalBarValue,
    onUpdateValue: electron.onUpdateShowEvalBar
  });
  const showArrowsProps = useCheckboxProps({
    initialValue: defaultValues.showArrows,
    sendValue: electron.showArrowsValue,
    onUpdateValue: electron.onUpdateShowArrows
  });
  const showLinesProps = useCheckboxProps({
    initialValue: defaultValues.showLines,
    sendValue: electron.showLinesValue,
    onUpdateValue: electron.onUpdateShowLines
  });
  const showNotationProps = useCheckboxProps({
    initialValue: defaultValues.showNotation,
    sendValue: electron.showNotationValue,
    onUpdateValue: electron.onUpdateShowNotation
  });
  const [regionStatus, setRegionStatus] = useState<RegionStatus>('none');
  const [analysisDuration, setAnalysisDuration] = useState(defaultValues.analysisDuration);
  const [multiPV, setMultiPV] = useState(defaultValues.multiPV);
  const [mouseSpeed, setMouseSpeed] = useState(defaultValues.mouseSpeed);
  const [positionFEN, setPositionFEN] = useState('');
  const [evaluation, setEvaluation] = useState('cp 0');
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [principalVariations, setPrincipalVariations] = useState<string[]>([]);
  useEffect(() => {
    electron.onUpdateStatus(setStatusText);
    electron.onUpdatePerspective(setIsWhitePerspective);
    electron.onUpdateRegion(setRegionStatus);
    electron.onUpdateDuration(setAnalysisDuration);
    electron.onUpdateMultiPV(setMultiPV);
    electron.onUpdateMouseSpeed(setMouseSpeed);
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
  const durationProps = useListSlider({
    label: 'Analysis duration (ms)',
    value: analysisDuration,
    list: sliders.analysisDurations,
    callback: (value) => electron.durationValue(value),
    noState: true
  });
  const multiPVProps = useListSlider({
    label: 'Multiple lines',
    value: multiPV,
    list: sliders.multiPVs,
    callback: (value) => electron.multiPVValue(value),
    noState: true
  });
  const mouseProps = useListSlider({
    label: 'Mouse speed',
    value: mouseSpeed,
    list: sliders.mouseSpeeds,
    callback: (value) => electron.mouseSpeedValue(value),
    noState: true
  });
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
                <label>
                  <input {...autoResponseProps}/>
                  <p>Auto response</p>
                </label>
                <label>
                  <input {...autoScanProps}/>
                  <p>Auto scan</p>
                </label>
                <label>
                  <input {...actionRegionProps}/>
                  <p>Invisible action regions</p>
                </label>
                <label>
                  <input {...draggingModeProps}/>
                  <p>Dragging mode</p>
                </label>
              </div>
              <div className='flex-column'>
                <label>
                  <input {...showEvalBarProps}/>
                  <p>Show eval bar</p>
                </label>
                <label>
                  <input {...showArrowsProps}/>
                  <p>Show arrows</p>
                </label>
                <label>
                  <input {...showLinesProps}/>
                  <p>Show lines</p>
                </label>
                <label>
                  <input {...showNotationProps}/>
                  <p>Show notation</p>
                </label>
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
              <button onClick={() => electron.perspectiveValue(!isWhitePerspective)}>
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
