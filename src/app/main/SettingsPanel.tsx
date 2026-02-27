import CheckboxPref from '../components/CheckboxPref.tsx';
import SliderPref from '../components/SliderPref.tsx';

function SettingsPanel() {
  return (<fieldset className='scroll-field'>
    <legend>Settings</legend>
    <div className='flex-column'>
      <div className='section-line'>Agent</div>
      <SliderPref name='mouseSpeed'/>
      <CheckboxPref name='autoResponse'/>
      <CheckboxPref name='autoScan'/>
      <CheckboxPref name='draggingMode'/>
      <CheckboxPref name='autoPromotion'/>
      <div className='section-line'>Engine</div>
      <SliderPref name='analysisDuration'/>
      <SliderPref name='multiPV'/>
      <SliderPref name='engineThreads'/>
      <div className='section-line'>Board</div>
      <CheckboxPref name='autoQueen'/>
      <CheckboxPref name='recognizerPutKings'/>
      <CheckboxPref name='autoCastling'/>
      <div className='section-line'>View</div>
      <CheckboxPref name='alwaysOnTop'/>
      <CheckboxPref name='showEvalBar'/>
      <CheckboxPref name='showArrows'/>
      <CheckboxPref name='showNotation'/>
      <CheckboxPref name='showCursor'/>
      <div className='section-line'>Overlay</div>
      <CheckboxPref name='showRegion'/>
      <CheckboxPref name='showActionRegion'/>
    </div>
  </fieldset>);
}

export default SettingsPanel;
