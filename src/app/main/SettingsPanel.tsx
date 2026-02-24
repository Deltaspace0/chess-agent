import ActionButton from '../components/ActionButton.tsx';
import CheckboxPref from '../components/CheckboxPref.tsx';
import SliderPref from '../components/SliderPref.tsx';

function SettingsPanel() {
  return (<fieldset className='scroll-field'>
    <legend>Settings</legend>
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
      <div className='flex-row' style={{margin: 'auto 0'}}>
        <div className='flex-column' style={{margin: 'auto 0'}}>
          <CheckboxPref name='autoResponse'/>
          <CheckboxPref name='autoScan'/>
          <CheckboxPref name='autoQueen'/>
          <CheckboxPref name='draggingMode'/>
          <CheckboxPref name='recognizerPutKings'/>
        </div>
        <div className='flex-column' style={{margin: 'auto 0'}}>
          <CheckboxPref name='alwaysOnTop'/>
          <CheckboxPref name='showEvalBar'/>
          <CheckboxPref name='showArrows'/>
          <CheckboxPref name='showNotation'/>
          <CheckboxPref name='showCursor'/>
        </div>
      </div>
    </div>
  </fieldset>);
}

export default SettingsPanel;
