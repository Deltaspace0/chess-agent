import ToggleButton from './ToggleButton.tsx';
import { preferenceConfig } from '../../config.ts';
import { usePreference } from '../hooks.ts';

export interface ToggleButtonPrefProps {
  name: BooleanPreference;
}

function ToggleButtonPref({ name }: ToggleButtonPrefProps) {
  const [value, sendValue] = usePreference(name);
  return <ToggleButton
    label={preferenceConfig[name].label}
    title={preferenceConfig[name].description}
    checked={value}
    onChange={sendValue}
  />;
}

export default ToggleButtonPref;
