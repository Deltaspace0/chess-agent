import './App.css';
import { useEffect, useState } from 'react';
import type { SquarePiece } from './interface';
import Board from './components/Board.tsx';
import Gauge from './components/Gauge.tsx';
import { Slider } from './components/Slider.tsx';

function App() {
  const [statusText, setStatusText] = useState('');
  const [autoResponse, setAutoResponse] = useState(false);
  const [isWhitePerspective, setIsWhitePerspective] = useState(true);
  const [draggingMode, setDraggingMode] = useState(true);
  const [detectingRegion, setDetectingRegion] = useState(true);
  const [analysisDuration, setAnalysisDuration] = useState(5000);
  const [positionPieces, setPositionPieces] = useState<(SquarePiece | null)[]>([]);
  const [evaluation, setEvaluation] = useState('cp 0');
  const electron = window.electronAPI;
  useEffect(() => {
    electron.onUpdateStatus(setStatusText);
    electron.onUpdateAutoResponse(setAutoResponse);
    electron.onUpdatePerspective(setIsWhitePerspective);
    electron.onUpdateDragging(setDraggingMode);
    electron.onDetectingRegion(setDetectingRegion);
    electron.onUpdateDuration(setAnalysisDuration);
    electron.onUpdatePosition(setPositionPieces);
    electron.onEvaluation(setEvaluation);
  }, [electron]);
  const analysisDurations = [100, 300, 1000, 3000, 5000];
  return (
    <div className='App'>
      <div className='flex-column'>
        <div className='flex-row'>
          <button
            onClick={() => electron.newRegion()}
            disabled={detectingRegion}>
              Select new region
          </button>
          <button
            onClick={() => electron.reloadHashes()}
            disabled={detectingRegion}>
              Reload piece hashes
          </button>
        </div>
        <div className='flex-row'>
          <Board positionPieces={positionPieces} isWhitePerspective={isWhitePerspective}/>
          <Gauge evaluation={evaluation} isWhitePerspective={isWhitePerspective}/>
        </div>
        <p className='status'>{statusText}</p>
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
        <label>
          <input
            type='checkbox'
            checked={autoResponse}
            onChange={(e) => electron.autoResponseValue(e.target.checked)}
            disabled={detectingRegion}/>
          <p>Auto response</p>
        </label>
      </div>
    </div>
  );
}

export default App;
