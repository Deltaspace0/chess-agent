import '../App.css';
import { useEffect, useMemo, useState, type JSX } from 'react';
import ActionButton from '../components/ActionButton.tsx';
import ToggleButton from '../components/ToggleButton.tsx';
import ToggleButtonPref from '../components/ToggleButtonPref.tsx';
import RegionSelection from './RegionSelection.tsx';
import { usePreferences } from '../hooks.ts';
import { actionDescriptions, possibleLocations } from '../../config.ts';
import { selectRegion } from '../../util.ts';

const defaultRegion = {
  left: 50,
  top: 50,
  width: 240,
  height: 240
};

function multiplyRegion(region: Region | null, factor: number): Region | null {
  if (!region) {
    return null;
  }
  return {
    left: region.left*factor,
    top: region.top*factor,
    width: region.width*factor,
    height: region.height*factor
  };
}

function App() {
  const dpr = window.devicePixelRatio;
  const prefs = usePreferences();
  const prefRegion = useMemo(() => {
    return multiplyRegion(prefs.region.value, 1/dpr);
  }, [prefs.region.value, dpr]);
  const [region, setRegion] = useState<Region>(defaultRegion);
  const [squareAspect, setSquareAspect] = useState(true);
  const [hideAll, setHideAll] = useState(false);
  useEffect(() => {
    if (prefRegion) {
      setRegion(prefRegion);
    }
  }, [prefRegion]);
  const handleSetRegion = () => {
    setHideAll(true);
    setTimeout(() => {
      prefs.region.send(multiplyRegion(region, dpr));
      window.electronAPI.doAction('adjustRegion');
    }, 10);
    setTimeout(() => setHideAll(false), 20);
  }
  const actionRegionDivs: JSX.Element[] = [];
  for (const location of possibleLocations) {
    const selectedRegion = selectRegion(region, location);
    const action = prefs.actionLocations.value[location];
    const backgroundColor = action
      ? 'rgba(255, 0, 0, 0.8)'
      : 'rgba(255, 255, 255, 0.8)';
    actionRegionDivs.push(<div
      onClick={() => window.electronAPI.editActionLocation(location)}
      title={action && actionDescriptions[action]}
      className='region-action'
      style={{...selectedRegion, backgroundColor}}></div>);
  }
  return (<div className='Region'>
    {!hideAll && <>
      <div className='region-panel'>
        <button onClick={handleSetRegion}>Set region</button>
        <button
          onClick={() => prefs.region.send(null)}
          disabled={!prefRegion}>
            Remove
        </button>
        <ToggleButton
          label='Square'
          checked={squareAspect}
          onChange={setSquareAspect}
        />
        <ToggleButtonPref name='actionRegion'/>
        <ActionButton name='hideRegion'/>
      </div>
      {prefRegion && <div className='region-highlight' style={prefRegion}/>}
      {prefs.actionRegion.value && actionRegionDivs}
      <RegionSelection
        region={region}
        setRegion={setRegion}
        isSquare={squareAspect}
      />
    </>}
  </div>);
}

export default App;
