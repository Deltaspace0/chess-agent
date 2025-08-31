import './App.css';
import { useEffect, useState } from 'react';
import type { SquarePiece, RegionSelection } from './interface';
import Board from './components/Board.tsx';
import Gauge from './components/Gauge.tsx';
import { useListSlider, Slider } from './components/Slider.tsx';
import { analysisDurations, multiPVs, mouseSpeeds, defaultValues } from '../config.ts';

function App() {
  const [statusText, setStatusText] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [autoResponse, setAutoResponse] = useState(defaultValues.autoResponse);
  const [autoScan, setAutoScan] = useState(defaultValues.autoScan);
  const [isWhitePerspective, setIsWhitePerspective] = useState(defaultValues.isWhitePerspective);
  const [draggingMode, setDraggingMode] = useState(defaultValues.draggingMode);
  const [actionRegion, setActionRegion] = useState(defaultValues.actionRegion);
  const [showEvalBar, setShowEvalBar] = useState(defaultValues.showEvalBar);
  const [showArrows, setShowArrows] = useState(defaultValues.showArrows);
  const [regionSelection, setRegionSelection] = useState<RegionSelection>('first');
  const [analysisDuration, setAnalysisDuration] = useState(defaultValues.analysisDuration);
  const [positionPieces, setPositionPieces] = useState<(SquarePiece | null)[]>([]);
  const [evaluation, setEvaluation] = useState('cp 0');
  const [highlightMoves, setHighlightMoves] = useState<string[]>([]);
  const electron = window.electronAPI;
  useEffect(() => {
    electron.onUpdateStatus(setStatusText);
    electron.onUpdateAutoResponse(setAutoResponse);
    electron.onUpdateAutoScan(setAutoScan);
    electron.onUpdatePerspective(setIsWhitePerspective);
    electron.onUpdateDragging(setDraggingMode);
    electron.onUpdateRegion(setRegionSelection);
    electron.onUpdateDuration(setAnalysisDuration);
    electron.onUpdatePosition(setPositionPieces);
    electron.onEvaluation(setEvaluation);
    electron.onHighlightMoves(setHighlightMoves);
  }, [electron]);
  const mouseProps = useListSlider({
    label: 'Mouse speed',
    initialValue: defaultValues.mouseSpeed,
    list: mouseSpeeds,
    callback: (value) => electron.mouseSpeedValue(value)
  });
  const multiPVProps = useListSlider({
    label: 'Multiple lines',
    initialValue: defaultValues.multiPV,
    list: multiPVs,
    callback: (value) => electron.multiPVValue(value)
  });
  const detectingRegion = regionSelection !== 'none';
  const handleActionRegion = (value: boolean) => {
    setActionRegion(value);
    electron.actionRegionValue(value);
  }
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
          <Board
            positionPieces={positionPieces}
            isWhitePerspective={isWhitePerspective}
            highlightMoves={showArrows ? highlightMoves : []}
          />
          {showEvalBar && <Gauge evaluation={evaluation} isWhitePerspective={isWhitePerspective}/>}
        </div>
        <p className='status'>{statusText}</p>
        {showSettings ? (<>
          <Slider
            label='Analysis duration (ms)'
            value={analysisDurations.indexOf(analysisDuration)}
            setValue={(value) => electron.durationValue(value)}
            min={0}
            max={analysisDurations.length-1}
            step={1}
            map={(x) => analysisDurations[x]}
            disabled={detectingRegion}
          />
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
            </div>
            <div className='flex-column'>
              <label>
                <input
                  type='checkbox'
                  checked={showEvalBar}
                  onChange={(e) => setShowEvalBar(e.target.checked)}
                  disabled={detectingRegion}/>
                <p>Show eval bar</p>
              </label>
              <label>
                <input
                  type='checkbox'
                  checked={showArrows}
                  onChange={(e) => setShowArrows(e.target.checked)}
                  disabled={detectingRegion}/>
                <p>Show arrows</p>
              </label>
            </div>
          </div>
          <label>
            <input
              type='checkbox'
              checked={actionRegion}
              onChange={(e) => handleActionRegion(e.target.checked)}
              disabled={detectingRegion}/>
            <p>Invisible action regions</p>
          </label>
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
        </>)}
      </div>
    </div>
  );
}

export default App;
