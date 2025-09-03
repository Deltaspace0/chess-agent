import './App.css';
import { useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { Chessboard } from 'react-chessboard';
import type { Arrow, ChessboardOptions } from 'react-chessboard';
import type { RegionSelection } from './interface';
import Gauge from './components/Gauge.tsx';
import { useListSlider, Slider } from './components/Slider.tsx';
import { analysisDurations, multiPVs, mouseSpeeds, defaultValues } from '../config.ts';

function useCheckboxProps(initialValue: boolean) {
  const [value, setValue] = useState(initialValue);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.checked);
  }
  return {
    type: 'checkbox',
    checked: value,
    onChange: handleChange
  };
}

function App() {
  const [statusText, setStatusText] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [autoResponse, setAutoResponse] = useState(defaultValues.autoResponse);
  const [autoScan, setAutoScan] = useState(defaultValues.autoScan);
  const [isWhitePerspective, setIsWhitePerspective] = useState(defaultValues.isWhitePerspective);
  const [draggingMode, setDraggingMode] = useState(defaultValues.draggingMode);
  const [actionRegion, setActionRegion] = useState(defaultValues.actionRegion);
  const showEvalBarProps = useCheckboxProps(defaultValues.showEvalBar);
  const showArrowsProps = useCheckboxProps(defaultValues.showArrows);
  const showLinesProps = useCheckboxProps(defaultValues.showLines);
  const [regionSelection, setRegionSelection] = useState<RegionSelection>('first');
  const [analysisDuration, setAnalysisDuration] = useState(defaultValues.analysisDuration);
  const [positionFEN, setPositionFEN] = useState('');
  const [evaluation, setEvaluation] = useState('cp 0');
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [debouncedArrows] = useDebounce(arrows, 50);
  const [principalVariations, setPrincipalVariations] = useState<string[]>([]);
  const electron = window.electronAPI;
  useEffect(() => {
    electron.onUpdateStatus(setStatusText);
    electron.onUpdateAutoResponse(setAutoResponse);
    electron.onUpdateAutoScan(setAutoScan);
    electron.onUpdatePerspective(setIsWhitePerspective);
    electron.onUpdateDragging(setDraggingMode);
    electron.onUpdateRegion(setRegionSelection);
    electron.onUpdateDuration(setAnalysisDuration);
    electron.onUpdatePosition(setPositionFEN);
    electron.onEvaluation(setEvaluation);
    electron.onHighlightMoves((evalMoves) => {
      const newArrows: Arrow[] = [];
      for (let i = evalMoves.length-1; i >= 0; i--) {
        const [type, evaluation, move] = evalMoves[i];
        const opacity = i === 0 ? 0.8 : 0.5;
        const n = Math.tanh(Number(evaluation)/300);
        newArrows.push({
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
        });
      }
      setArrows(newArrows);
    });
    electron.onPrincipalVariations(setPrincipalVariations);
  }, [electron]);
  const durationProps = useListSlider({
    label: 'Analysis duration (ms)',
    value: analysisDuration,
    list: analysisDurations,
    callback: (value) => electron.durationValue(value),
    noState: true
  });
  const multiPVProps = useListSlider({
    label: 'Multiple lines',
    value: defaultValues.multiPV,
    list: multiPVs,
    callback: (value) => electron.multiPVValue(value)
  });
  const mouseProps = useListSlider({
    label: 'Mouse speed',
    value: defaultValues.mouseSpeed,
    list: mouseSpeeds,
    callback: (value) => electron.mouseSpeedValue(value)
  });
  const detectingRegion = regionSelection !== 'none';
  const handleActionRegion = (value: boolean) => {
    setActionRegion(value);
    electron.actionRegionValue(value);
  }
  const pvComponents = [];
  for (const variation of principalVariations) {
    pvComponents.push(<p className='variation'>{variation}</p>);
  }
  const chessboardOptions: ChessboardOptions = {
    arrows: showArrowsProps.checked ? debouncedArrows : [],
    allowDrawingArrows: false,
    boardOrientation: isWhitePerspective ? 'white' : 'black',
    position: positionFEN
  };
  return (
    <div className='App'>
      <div className='flex-column'>
        <div className='flex-row'>
          <button
            onClick={() => electron.newRegion()}
            disabled={regionSelection === 'first'}>
              {regionSelection === 'new' ? 'Cancel selection' : 'Select new region'}
          </button>
          <button
            onClick={() => electron.reloadHashes()}
            disabled={detectingRegion}>
              Reload piece hashes
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
        <p className='status'>{statusText}</p>
        {showSettings ? (<>
          <Slider {...durationProps} disabled={detectingRegion}/>
          <Slider {...multiPVProps} disabled={detectingRegion}/>
          <Slider {...mouseProps} disabled={detectingRegion}/>
          <div className='flex-row'>
            <div className='flex-column'>
              <label>
                <input
                  type='checkbox'
                  checked={autoResponse}
                  onChange={(e) => electron.autoResponseValue(e.target.checked)}
                  disabled={detectingRegion}/>
                <p>Auto response</p>
              </label>
              <label>
                <input
                  type='checkbox'
                  checked={autoScan}
                  onChange={(e) => electron.autoScanValue(e.target.checked)}
                  disabled={detectingRegion}/>
                <p>Auto scan</p>
              </label>
              <label>
                <input
                  type='checkbox'
                  checked={actionRegion}
                  onChange={(e) => handleActionRegion(e.target.checked)}
                  disabled={detectingRegion}/>
                <p>Invisible action regions</p>
              </label>
            </div>
            <div className='flex-column'>
              <label>
                <input {...showEvalBarProps} disabled={detectingRegion}/>
                <p>Show eval bar</p>
              </label>
              <label>
                <input {...showArrowsProps} disabled={detectingRegion}/>
                <p>Show arrows</p>
              </label>
              <label>
                <input {...showLinesProps} disabled={detectingRegion}/>
                <p>Show lines</p>
              </label>
            </div>
          </div>
          <div className='flex-row'>
            <button
              onClick={() => setShowSettings(false)}
              disabled={detectingRegion}>
                Close settings
            </button>
          </div>
        </>) : (<>
          <div className='flex-row'>
            <button
              onClick={() => electron.bestMove()}
              disabled={detectingRegion}>
                Best move
            </button>
            <button
              onClick={() => electron.scanMove()}
              disabled={detectingRegion}>
                Scan move
            </button>
            <button
              onClick={() => electron.resetPosition()}
              disabled={detectingRegion}>
                Reset
            </button>
            <button
              onClick={() => electron.perspectiveValue(!isWhitePerspective)}
              disabled={detectingRegion}>
                {isWhitePerspective ? 'White' : 'Black'}
            </button>
          </div>
          <div className='flex-row'>
            <button
              onClick={() => electron.recognizeBoard()}
              disabled={detectingRegion}>
                Recognize
            </button>
            <button
              onClick={() => electron.undoMove()}
              disabled={detectingRegion}>
                Undo move
            </button>
            <button
              onClick={() => electron.skipMove()}
              disabled={detectingRegion}>
                Skip move
            </button>
            <button
              onClick={() => electron.draggingValue(!draggingMode)}
              disabled={detectingRegion}>
                {draggingMode ? 'Dragging' : 'Clicking'}
            </button>
          </div>
          <div className='flex-row'>
            <button
              onClick={() => setShowSettings(true)}
              disabled={detectingRegion}>
                Open settings
            </button>
          </div>
          {showLinesProps.checked && pvComponents}
        </>)}
      </div>
    </div>
  );
}

export default App;
