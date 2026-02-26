import 'tippy.js/dist/tippy.css';
import '../App.css';
import { useEffect, useMemo, useRef, useState, type JSX } from 'react';
import tippy, { type Instance, type Placement } from 'tippy.js';
import ActionButton from '../components/ActionButton.tsx';
import ToggleButton from '../components/ToggleButton.tsx';
import ToggleButtonPref from '../components/ToggleButtonPref.tsx';
import RegionSelection from './RegionSelection.tsx';
import { usePreference, useSignal } from '../hooks.ts';
import { actionDescriptions, possibleLocations } from '../../config.ts';
import { findRegion } from '../../util.ts';

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
  const electron = window.electronAPI;
  const dpr = window.devicePixelRatio;
  const booleanPreferences: Record<string, boolean> = {
    autoResponse: usePreference('autoResponse')[0],
    autoScan: usePreference('autoScan')[0],
    autoQueen: usePreference('autoQueen')[0],
    perspective: usePreference('perspective')[0],
    draggingMode: usePreference('draggingMode')[0]
  };
  const [prefRegion, sendPrefRegion] = usePreference('region');
  const [actionLocations, sendActionLocations] = usePreference('actionLocations');
  const [actionRegion] = usePreference('actionRegion');
  const [showRegion] = usePreference('showRegion');
  const [showActionRegion] = usePreference('showActionRegion');
  const region = useMemo(() => {
    return multiplyRegion(prefRegion, 1/dpr);
  }, [prefRegion, dpr]);
  const selectingRegion = useSignal('selectingRegion');
  const [autoAdjust, setAutoAdjust] = useState(true);
  const [hideAll, setHideAll] = useState(false);
  const actionSelectsRef = useRef<Record<string, HTMLSelectElement | null>>({});
  const tooltipInstancesRef = useRef<Record<string, Instance>>({});
  const adjustRegion = () => {
    setHideAll(true);
    setTimeout(() => electron.sendSignal('action', 'adjustRegion'), 10);
    setTimeout(() => setHideAll(false), 20);
  };
  const handleRegionChange = (changedRegion: Region) => {
    const newRegion = multiplyRegion(changedRegion, dpr);
    sendPrefRegion(newRegion);
    if (autoAdjust) {
      adjustRegion();
    }
  };
  const optionComponents = [<option value=''>None</option>];
  for (const [action, description] of Object.entries(actionDescriptions)) {
    optionComponents.push(<option value={action}>{description}</option>);
  }
  const actionRegionDivs: JSX.Element[] = [];
  const actionOverlayDivs: JSX.Element[] = [];
  if (region) {
    for (const location of possibleLocations) {
      const selectedRegion = findRegion(region, location);
      const action = actionLocations[location];
      const backgroundColor = action
        ? 'rgba(255, 0, 0, 0.8)'
        : 'rgba(255, 255, 255, 0.8)';
      actionRegionDivs.push(<select
        ref={(e) => { actionSelectsRef.current[location] = e; }}
        className='select-action'
        style={selectedRegion}
        value={action}
        onChange={(e) => {
          const newActionLocations = {...actionLocations};
          newActionLocations[location] = e.target.value === ''
            ? undefined
            : e.target.value as Action;
          sendActionLocations(newActionLocations);
        }}>
          {optionComponents}
      </select>);
      actionRegionDivs.push(<div
        onClick={() => actionSelectsRef.current[location]?.showPicker()}
        title={action && actionDescriptions[action]}
        className='region-action'
        style={{...selectedRegion, backgroundColor}}>
      </div>);
      if (!action) {
        continue;
      }
      const preferenceValue = booleanPreferences[action];
      const overlayColor = preferenceValue !== undefined
        ? (preferenceValue ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)')
        : 'rgba(255, 255, 255, 0.5)';
      actionOverlayDivs.push(<div
        id={`region-action-${location}`}
        className='region-action'
        style={{...selectedRegion, backgroundColor: overlayColor}}>
      </div>);
    }
  }
  useEffect(() => {
    const tooltipInstances = tooltipInstancesRef.current;
    const placements: Record<string, string | undefined> = {
      'N': 'top',
      'S': 'bottom',
      'W': 'left',
      'E': 'right'
    };
    for (const location of possibleLocations) {
      const action = actionLocations[location];
      if (!action) {
        continue;
      }
      tooltipInstances[location] = tippy(`#region-action-${location}`, {
        duration: 0,
        content: actionDescriptions[action],
        placement: placements[location[0]] as Placement,
        popperOptions: {
          modifiers: [{
            name: 'flip',
            options: { fallbackPlacements: ['right'] }
          }]
        }
      })[0];
    }
    return () => {
      for (const location in tooltipInstances) {
        tooltipInstances[location]?.destroy();
        delete tooltipInstances[location];
      }
    };
  }, [actionLocations, selectingRegion, region]);
  useEffect(() => {
    const tooltipInstances = tooltipInstancesRef.current;
    return electron.onSignal('hoveredAction', (location) => {
      for (const instance of Object.values(tooltipInstances)) {
        instance?.hide();
      }
      if (location) {
        tooltipInstances[location]?.show();
      }
    });
  }, [electron]);
  useEffect(() => {
    const escapeCallback = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        electron.sendSignal('action', 'hideRegion');
      }
    };
    window.addEventListener('keydown', escapeCallback);
    return () => window.removeEventListener('keydown', escapeCallback);
  }, [electron]);
  const regionModeDiv = <div className={hideAll ? 'Region hidden' : 'Region'}>
    <div className='region-panel'>
      <button
        onClick={() => sendPrefRegion(null)}
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
      <ActionButton name='hideRegion' label='Return'/>
    </div>
    {region && <div className='region-highlight' style={region}/>}
    <RegionSelection onChange={handleRegionChange}/>
    {actionRegion && actionRegionDivs}
  </div>;
  const overlayModeDiv = <div style={{position: 'relative'}}>
    {showRegion && region && <div className='region-border' style={region}/>}
    {showActionRegion && actionRegion && actionOverlayDivs}
  </div>;
  return (<>
    {selectingRegion ? regionModeDiv : overlayModeDiv}
  </>);
}

export default App;
