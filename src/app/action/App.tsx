import '../App.css';
import Radio from '../components/Radio.tsx';
import { usePreferences, useVariable } from '../hooks.ts';
import { actionDescriptions } from '../../config.ts';

function App() {
  const prefs = usePreferences();
  const actionLocations = prefs.actionLocations.value;
  const location = useVariable('editedActionLocation');
  const choiceComponents = [<Radio
    label='None'
    name='action'
    checked={!actionLocations[location]}
    onChange={() => {
      const newActionLocations = {...actionLocations};
      delete newActionLocations[location];
      prefs.actionLocations.send(newActionLocations);
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
        prefs.actionLocations.send(newActionLocations);
      }}
    />);
  }
  return (<div className='App'>
    <fieldset className='action-field'>
      <legend>Select action for this region</legend>
      {choiceComponents}
    </fieldset>
  </div>);
}

export default App;
