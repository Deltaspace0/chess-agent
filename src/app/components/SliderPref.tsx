import Slider from './Slider.tsx';
import { preferenceConfig } from '../../config.ts';
import { usePreference } from '../hooks.ts';

export interface SliderPrefProps {
  name: NumberPreference;
  disabled?: boolean;
}

function SliderPref({ name, disabled }: SliderPrefProps) {
  const [value, sendValue] = usePreference(name);
  return <Slider
    label={preferenceConfig[name].label}
    title={preferenceConfig[name].description}
    list={preferenceConfig[name].sliderValues ?? []}
    value={value}
    setValue={sendValue}
    disabled={disabled}
  />;
}

export default SliderPref;
