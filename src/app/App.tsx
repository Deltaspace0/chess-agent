import './App.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Arrow, ChessboardOptions } from 'react-chessboard';
import Canvas from './components/Canvas.tsx';
import Checkbox from './components/Checkbox.tsx';
import Gauge from './components/Gauge.tsx';
import Radio from './components/Radio.tsx';
import Slider from './components/Slider.tsx';
import { useCheckboxProps, useElectronValue, usePreference, useSliderProps } from './hooks.ts';

type Panel = 'main' | 'settings' | 'engine' | 'promotion' | 'edit';
type EngineType = 'internal' | 'external';

function App() {
  const electron = window.electronAPI;
  const alwaysOnTopProps = useCheckboxProps('alwaysOnTop');
  const autoResponseProps = useCheckboxProps('autoResponse');
  const autoScanProps = useCheckboxProps('autoScan');
  const autoQueenProps = useCheckboxProps('autoQueen');
  const draggingModeProps = useCheckboxProps('draggingMode');
  const actionRegionProps = useCheckboxProps('actionRegion');
  const saveConfigToFileProps = useCheckboxProps('saveConfigToFile');
  const showEvalBarProps = useCheckboxProps('showEvalBar');
  const showArrowsProps = useCheckboxProps('showArrows');
  const showLinesProps = useCheckboxProps('showLines');
  const showNotationProps = useCheckboxProps('showNotation');
  const durationProps = useSliderProps('analysisDuration');
  const multiPVProps = useSliderProps('multiPV');
  const threadsProps = useSliderProps('engineThreads');
  const mouseProps = useSliderProps('mouseSpeed');
  const [isWhitePerspective, sendPerspective] = usePreference('isWhitePerspective');
  const [enginePath, sendEnginePath] = usePreference('enginePath');
  const statusText = useElectronValue('', electron.onUpdateStatus);
  const regionStatus = useElectronValue<RegionStatus>('none', electron.onUpdateRegion);
  const engineInfo = useElectronValue({}, electron.onUpdateEngineInfo);
  const principalVariations = useElectronValue([], electron.onPrincipalVariations);
  const positionInfo = useElectronValue<PositionInfo>({
    whiteCastlingRights: { 'k': true, 'q': true },
    blackCastlingRights: { 'k': true, 'q': true },
    isWhiteTurn: true
  }, electron.onUpdatePositionInfo);
  const [positionFEN, setPositionFEN] = useState('');
  const [inputFEN, setInputFEN] = useState('');
  const [arrows1, setArrows1] = useState<Arrow[]>([]);
  const [arrows2, setArrows2] = useState<Arrow[]>([]);
  const [panelType, setPanelType] = useState<Panel>('main');
  const [showEngineData, setShowEngineData] = useState(false);
  const [engineInput, setEngineInput] = useState('');
  const engineDataRef = useRef<Record<EngineType, string[]>>(null);
  if (engineDataRef.current === null) {
    engineDataRef.current = { internal: [], external: [] };
  }
  const engineData = engineDataRef.current;
  const engineType = enginePath ? 'external' : 'internal';
  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, 4000, 4000);
    ctx.font = `11px Courier New`;
    ctx.fillStyle = '#fff';
    const engineLines = engineData[engineType];
    for (let i = 0; i < engineLines.length; i++) {
      const y = 4000-10*(engineLines.length-i);
      ctx.fillText(engineLines[i], 10, y);
    }
  }, [engineData, engineType]);
  useEffect(() => {
    electron.onUpdatePosition((value) => {
      setPositionFEN(value);
      setInputFEN(value);
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
    electron.onEngineData((name, data) => {
      if (name in engineData) {
        const engineLines = engineData[name as EngineType];
        engineLines.push(data);
        if (engineLines.length > 1000) {
          engineLines.splice(0, 1);
        }
      }
    });
  }, [electron, engineData]);
  const handleEngineSend = () => {
    electron.sendToEngine(engineType, engineInput);
    setEngineInput('');
  };
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
  const mainStatusButtons = <>
    <button onClick={() => setPanelType('edit')}>Edit board</button>
    <button onClick={() => setPanelType('settings')}>Settings</button>
  </>;
  const statusButtons = {
    main: mainStatusButtons,
    settings: <button onClick={() => setPanelType('main')}>Close settings</button>,
    engine: <button onClick={() => setPanelType('main')}>Close engine</button>,
    promotion: mainStatusButtons,
    edit: <button onClick={() => setPanelType('main')}>Return</button>
  };
  const engineButton = <button
    onClick={() => setPanelType('engine')}
    style={{width: '64px'}}>
      Engine
  </button>;
  const panels = {
    main: <>
      <fieldset className='actions'>
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
      {showLinesProps.checked ? (
        <fieldset className='pv'>
          <legend>{engineButton}</legend>
          <p className='variation'>
            Depth: {engineInfo.depth},
            time: {engineInfo.time} ms,
            nodes: {engineInfo.nodes}
          </p>
          {pvComponents}
        </fieldset>
      ) : (
        <div className='flex-row'>{engineButton}</div>
      )}
    </>,
    settings: <>
      <fieldset className='settings'>
        <legend>Settings</legend>
        <Slider {...durationProps}/>
        <Slider {...multiPVProps}/>
        <Slider {...threadsProps}/>
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
            <Checkbox {...alwaysOnTopProps}/>
            <Checkbox {...showEvalBarProps}/>
            <Checkbox {...showArrowsProps}/>
            <Checkbox {...showLinesProps}/>
            <Checkbox {...showNotationProps}/>
          </div>
        </div>
      </fieldset>
    </>,
    engine: <>
      <fieldset className='full-field'>
        <legend>Engine</legend>
        <div className='flex-row'>
          <button onClick={() => electron.dialogEngine()}>Load external engine</button>
          <button
            onClick={() => sendEnginePath(null)}
            disabled={enginePath === null}>
              Remove external engine
          </button>
        </div>
        {enginePath !== null && <p className='status'>{enginePath}</p>}
        <div className='flex-row'>
          <button onClick={() => setShowEngineData(!showEngineData)}>
            {showEngineData ? 'Close engine UCI' : 'Show engine UCI'}
          </button>
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
    </>,
    edit: <>
      <fieldset className='full-field'>
        <legend>Edit board</legend>
        <div className='flex-column'>
          <div className='flex-row'>
            <input
              type="text"
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
            <button onClick={() => electron.setPosition(inputFEN)}>Set FEN</button>
          </div>
          <div className='flex-row'>
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
              <p style={{margin: '4px 0'}}>White castling:</p>
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
              <p style={{margin: '4px 0'}}>Black castling:</p>
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
          {(panelType === 'engine' && showEngineData) ? (
            <div className='engine-canvas-div'>
              <div className='flex-row'>
                <input
                  type="text"
                  style={{minWidth: '280px'}}
                  value={engineInput}
                  onChange={(e) => setEngineInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleEngineSend();
                      e.preventDefault();
                    }
                  }}
                />
                <button onClick={handleEngineSend}>Send</button>
              </div>
              <Canvas draw={draw} className='engine-canvas'/>
            </div>
          ) : (<>
            <div className='board'>
              <Chessboard options={chessboardOptions}/>
            </div>
            {showEvalBarProps.checked && <Gauge
              evaluation={engineInfo.evaluation ?? 'cp 0'}
              isWhitePerspective={isWhitePerspective}
            />}
          </>)}
        </div>
        <div className='flex-row'>
          <p className='status'>{statusText}</p>
          {statusButtons[panelType]}
        </div>
        {panels[panelType]}
      </div>
    </div>
  );
}

export default App;
