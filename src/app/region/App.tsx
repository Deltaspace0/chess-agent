import '../App.css';
import { useMemo, useState, type JSX } from 'react';
import ActionButton from '../components/ActionButton.tsx';
import ToggleButton from '../components/ToggleButton.tsx';
import ToggleButtonPref from '../components/ToggleButtonPref.tsx';
import RegionSelection from './RegionSelection.tsx';
import { usePreferences } from '../hooks.ts';
import { actionDescriptions, possibleLocations } from '../../config.ts';
import { selectRegion } from '../../util.ts';

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
  const region = useMemo(() => {
    return multiplyRegion(prefs.region.value, 1/dpr);
  }, [prefs.region.value, dpr]);
  const [autoAdjust, setAutoAdjust] = useState(true);
  const [hideAll, setHideAll] = useState(false);
  const adjustRegion = () => {
    setHideAll(true);
    setTimeout(() => window.electronAPI.doAction('adjustRegion'), 10);
    setTimeout(() => setHideAll(false), 20);
  };
  const handleRegionChange = (changedRegion: Region) => {
    const newRegion = multiplyRegion(changedRegion, dpr);
    prefs.region.send(newRegion);
    if (autoAdjust) {
      adjustRegion();
    }
  };
  const actionRegionDivs: JSX.Element[] = [];
  if (region) {
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
  }
  return (<div className={hideAll ? 'Region hidden' : 'Region'}>
    <div className='region-panel'>
      <button
        onClick={() => prefs.region.send(null)}
        disabled={!region}>
          Remove
      </button>
      <ToggleButton
        label='Adjust'
        title='Automatically adjust selected region'
        checked={autoAdjust}
        onChange={(value) => {
          if (value && region) {
            adjustRegion();
          }
          setAutoAdjust(value);
        }}
      />
      <ToggleButtonPref name='actionRegion'/>
      <ActionButton name='hideRegion'/>
    </div>
    {region && <div className='region-highlight' style={region}/>}
    <RegionSelection onChange={handleRegionChange}/>
    {prefs.actionRegion.value && actionRegionDivs}
  </div>);
}

export default App;
