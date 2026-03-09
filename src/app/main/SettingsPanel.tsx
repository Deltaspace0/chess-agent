import CheckboxPref from '../components/CheckboxPref.tsx';
import SliderPref from '../components/SliderPref.tsx';

function SettingsPanel() {
  return (<div className='flex-column' style={{overflow: 'auto'}}>
    <div className='section-line'>Agent</div>
    <SliderPref name='mouseSpeed'/>
    <CheckboxPref name='autoResponse'/>
    <CheckboxPref name='autoRecognition'/>
    <CheckboxPref name='autoPremove'/>
    <CheckboxPref name='draggingMode'/>
    <CheckboxPref name='autoPromotion'/>
    <div className='section-line'>Engine</div>
    <SliderPref name='analysisDuration'/>
    <SliderPref name='multiPV'/>
    <SliderPref name='engineThreads'/>
    <SliderPref name='engineLevel'/>
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
  </div>);
}

export default SettingsPanel;
