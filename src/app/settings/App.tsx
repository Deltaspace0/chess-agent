import '../App.css';
import { useEffect } from 'react';
import ActionButton from '../components/ActionButton.tsx';
import CheckboxPref from '../components/CheckboxPref.tsx';
import SliderPref from '../components/SliderPref.tsx';

function App() {
  useEffect(() => {
    const escapeCallback = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.electronAPI.doAction('hideSettings');
      }
    }
    window.addEventListener('keydown', escapeCallback);
    return () => window.removeEventListener('keydown', escapeCallback);
  }, []);
  return (<div className='App'>
    <div className='flex-column'>
      <div className='flex-row'>
        <ActionButton name='loadConfig'/>
        <ActionButton name='saveConfig'/>
        <ActionButton name='resetConfig'/>
      </div>
      <SliderPref name='analysisDuration'/>
      <SliderPref name='multiPV'/>
      <SliderPref name='engineThreads'/>
      <SliderPref name='mouseSpeed'/>
      <div className='flex-row'>
        <div className='flex-column'>
          <CheckboxPref name='autoResponse'/>
          <CheckboxPref name='autoScan'/>
          <CheckboxPref name='autoQueen'/>
          <CheckboxPref name='draggingMode'/>
        </div>
        <div className='flex-column'>
          <CheckboxPref name='alwaysOnTop'/>
          <CheckboxPref name='showEvalBar'/>
          <CheckboxPref name='showArrows'/>
          <CheckboxPref name='showNotation'/>
        </div>
      </div>
    </div>
  </div>);
}

export default App;
