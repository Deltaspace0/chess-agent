import ActionButton from '../components/ActionButton.tsx';
import CheckboxPref from '../components/CheckboxPref.tsx';
import SliderPref from '../components/SliderPref.tsx';

function SettingsPanel() {
  return (<fieldset className='scroll-field'>
    <legend>Settings</legend>
    <div className='flex-column'>
      <div className='flex-row'>
        <ActionButton name='loadConfig' label='Load config'/>
        <ActionButton name='saveConfig' label='Save config'/>
        <ActionButton name='resetConfig' label='Reset config'/>
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
          <CheckboxPref name='autoPromotion'/>
          <CheckboxPref name='draggingMode'/>
          <CheckboxPref name='recognizerPutKings'/>
          <CheckboxPref name='autoCastling'/>
        </div>
        <div className='flex-column' style={{margin: 'auto 0'}}>
          <CheckboxPref name='alwaysOnTop'/>
          <CheckboxPref name='showEvalBar'/>
          <CheckboxPref name='showArrows'/>
          <CheckboxPref name='showNotation'/>
          <CheckboxPref name='showCursor'/>
          <CheckboxPref name='showRegion'/>
          <CheckboxPref name='showActionRegion'/>
        </div>
      </div>
    </div>
  </fieldset>);
}

export default SettingsPanel;
