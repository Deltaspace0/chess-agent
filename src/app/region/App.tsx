import '../App.css';
import { useEffect, useMemo, useState } from 'react';
import ActionButton from '../components/ActionButton.tsx';
import RegionSelection from '../components/RegionSelection.tsx';
import { usePreferences } from '../hooks.ts';

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
  useEffect(() => {
    if (prefRegion) {
      setRegion(prefRegion);
    }
  }, [prefRegion]);
  const handleSetRegion = () => {
    prefs.region.send(multiplyRegion(region, dpr));
  }
  return (<div className='Region'>
    <div className='region-panel'>
      <button onClick={handleSetRegion}>Set region</button>
      <button
        onClick={() => prefs.region.send(null)}
        disabled={!prefRegion}>
          Remove region
      </button>
      <ActionButton name='hideRegion'/>
    </div>
    {prefRegion && <div className='region-highlight' style={prefRegion}/>}
    <RegionSelection region={region} setRegion={setRegion}/>
  </div>);
}

export default App;
