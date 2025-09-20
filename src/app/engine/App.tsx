import '../App.css';
import { useEffect, useState } from 'react';
import ActionButton from '../components/ActionButton.tsx';
import { usePreferences } from '../hooks.ts';

function App() {
  const electron = window.electronAPI;
  const prefs = usePreferences();
  const engineType = prefs.enginePath.value ? 'external' : 'internal';
  const isInternalEngine = prefs.enginePath.value === null;
  const [engineInput, setEngineInput] = useState('');
  const [internalEngineData, setInternalEngineData] = useState('');
  const [externalEngineData, setExternalEngineData] = useState('');
  const [externalActive, setExternalActive] = useState(false);
  useEffect(() => {
    electron.onEngineData((name, data) => {
      if (name === 'external-event') {
        setExternalActive(data !== 'exit');
        return;
      }
      const f = (x: string) => x.split('\n').concat(data).slice(-1000).join('\n');
      (name === 'internal' ? setInternalEngineData : setExternalEngineData)(f);
    });
  }, [electron]);
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
      <input
        type='text'
        value={prefs.enginePath.value ?? '(Internal engine)'}
        readOnly={true}
      />
      <div className='engine-uci-div'>
        {isInternalEngine ? internalEngineData : externalEngineData}
      </div>
      {(isInternalEngine || externalActive) ? (<div className='flex-row'>
        <input
          type='text'
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
      </div>) : (<p className='status'>External engine is closed</p>)}
    </div>
  </div>);
}

export default App;
