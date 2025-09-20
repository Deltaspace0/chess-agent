import '../App.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import ActionButton from '../components/ActionButton.tsx';
import Canvas from '../components/Canvas.tsx';
import { usePreferences } from '../hooks.ts';

type EngineType = 'internal' | 'external';

function App() {
  const electron = window.electronAPI;
  const prefs = usePreferences();
  const engineType = prefs.enginePath.value ? 'external' : 'internal';
  const isInternalEngine = prefs.enginePath.value === null;
  const [engineInput, setEngineInput] = useState('');
  const engineDataRef = useRef<Record<EngineType, string[]>>(null);
  if (engineDataRef.current === null) {
    engineDataRef.current = { internal: [], external: [] };
  }
  const engineData = engineDataRef.current;
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
  return (<div className='App'>
    <div className='flex-column'>
      <div className='flex-row'>
        <ActionButton name='dialogEngine'/>
        <ActionButton name='reloadEngine' disabled={isInternalEngine}/>
        <button
          onClick={() => prefs.enginePath.send(null)}
          disabled={isInternalEngine}>
            Disable
        </button>
      </div>
      <p className='text'>
        Engine path: {prefs.enginePath.value ?? '(Internal engine)'}
      </p>
      <div className='engine-div'>
        <Canvas draw={draw} className='engine-canvas'/>
      </div>
      <div className='flex-row'>
        <input
          type="text"
          style={{minWidth: 'calc(100vw - 100px)'}}
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
    </div>
  </div>);
}

export default App;
