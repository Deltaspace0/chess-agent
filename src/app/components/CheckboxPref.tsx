import Checkbox from './Checkbox.tsx';
import { preferenceConfig } from '../../config.ts';
import { usePreference } from '../hooks.ts';

export interface CheckboxPrefProps {
  name: BooleanPreference;
}

function CheckboxPref({ name }: CheckboxPrefProps) {
  const [value, sendValue] = usePreference(name);
  return <Checkbox
    label={preferenceConfig[name].label}
    title={preferenceConfig[name].description}
    checked={value}
    onChange={sendValue}
  />;
}

export default CheckboxPref;
