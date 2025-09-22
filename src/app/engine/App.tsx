import '../App.css';
import { type JSX, useEffect, useRef, useState } from 'react';
import ActionButton from '../components/ActionButton.tsx';
import { usePreferences, useVariable } from '../hooks.ts';

function App() {
  const electron = window.electronAPI;
  const prefs = usePreferences();
  const engineInfo = useVariable('engineInfo');
  const engineType = prefs.enginePath.value ? 'external' : 'internal';
  const isInternalEngine = prefs.enginePath.value === null;
  const [engineInput, setEngineInput] = useState('');
  const [internalLines, setInternalLines] = useState<JSX.Element[]>([]);
  const [externalLines, setExternalLines] = useState<JSX.Element[]>([]);
  const [externalActive, setExternalActive] = useState(false);
  const autoScrollDiv = useRef<HTMLDivElement>(null);
  useEffect(() => {
    electron.onEngineData((name, data) => {
      if (name === 'external-event') {
        setExternalActive(data !== 'exit');
        return;
      }
      let color = '#ffffff';
      if (data.substring(0, 3) === '<<<') {
        color = '#f6ee11ff';
      } else if (data.substring(0, 3) === '!>>') {
        color = '#fc9288ff';
      }
      const line = <span style={{color}}>{data}</span>;
      (name === 'internal' ? setInternalLines : setExternalLines)((x) => {
        return [line, ...x].slice(0, 1000);
      });
    });
  }, [electron]);
  const handleEngineSend = () => {
    setTimeout(() => {
      autoScrollDiv.current?.scrollIntoView(false);
    }, 50);
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
      <p className='text'>Name: {engineInfo.name}</p>
      <p className='text'>Author: {engineInfo.author}</p>
      <div className='engine-uci-div'>
        <div ref={autoScrollDiv}/>
        {isInternalEngine ? internalLines : externalLines}
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
