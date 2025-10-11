import '../App.css';
import { useEffect } from 'react';
import Radio from '../components/Radio.tsx';
import { usePreference, useVariable } from '../hooks.ts';
import { actionDescriptions } from '../../config.ts';

function App() {
  const [actionLocations, sendLocations] = usePreference('actionLocations');
  const location = useVariable('editedActionLocation');
  const choiceComponents = [<Radio
    label='None'
    name='action'
    checked={!actionLocations[location]}
    onChange={() => {
      const newActionLocations = {...actionLocations};
      delete newActionLocations[location];
      sendLocations(newActionLocations);
    }}
  />];
  for (const [action, description] of Object.entries(actionDescriptions)) {
    choiceComponents.push(<Radio
      label={description}
      name='action'
      value={action}
      checked={actionLocations[location] === action}
      onChange={() => {
        const newActionLocations = {...actionLocations};
        newActionLocations[location] = action as Action;
        sendLocations(newActionLocations);
      }}
    />);
  }
  useEffect(() => {
    const escapeCallback = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.electronAPI.doAction('hideAction');
      }
    }
    window.addEventListener('keydown', escapeCallback);
    return () => window.removeEventListener('keydown', escapeCallback);
  }, []);
  return (<div className='App'>
    <fieldset className='action-field'>
      <legend>Select action for this region</legend>
      {choiceComponents}
    </fieldset>
  </div>);
}

export default App;
