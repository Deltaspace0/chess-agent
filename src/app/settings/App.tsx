import '../App.css';
import ActionButton from '../components/ActionButton.tsx';
import Checkbox from '../components/Checkbox.tsx';
import Slider from '../components/Slider.tsx';
import { usePreferences } from '../hooks.ts';

function App() {
  const prefs = usePreferences();
  return (<div className='App'>
    <div className='flex-column'>
      <div className='flex-row'>
        <ActionButton name='loadConfig'/>
        <ActionButton name='saveConfig'/>
      </div>
      <Slider {...prefs.analysisDuration.sliderProps}/>
      <Slider {...prefs.multiPV.sliderProps}/>
      <Slider {...prefs.engineThreads.sliderProps}/>
      <Slider {...prefs.mouseSpeed.sliderProps}/>
      <div className='flex-row'>
        <div className='flex-column'>
          <Checkbox {...prefs.autoResponse.checkboxProps}/>
          <Checkbox {...prefs.autoScan.checkboxProps}/>
          <Checkbox {...prefs.autoQueen.checkboxProps}/>
          <Checkbox {...prefs.draggingMode.checkboxProps}/>
          <Checkbox {...prefs.saveConfigToFile.checkboxProps}/>
        </div>
        <div className='flex-column'>
          <Checkbox {...prefs.alwaysOnTop.checkboxProps}/>
          <Checkbox {...prefs.showEvalBar.checkboxProps}/>
          <Checkbox {...prefs.showArrows.checkboxProps}/>
          <Checkbox {...prefs.showLines.checkboxProps}/>
          <Checkbox {...prefs.showNotation.checkboxProps}/>
        </div>
      </div>
    </div>
  </div>);
}

export default App;
