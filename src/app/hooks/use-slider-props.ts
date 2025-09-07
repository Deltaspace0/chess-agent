import { useEffect, useState } from 'react';
import type { Preference } from '../../interface';

interface SliderHookOptions {
  label: string;
  initialValue: number;
  list: number[];
  preferenceName: Preference;
}

function useSliderProps(options: SliderHookOptions) {
  const [value, setValue] = useState(options.initialValue);
  useEffect(() => {
    window.electronAPI.onUpdatePreference(options.preferenceName, setValue);
  }, [options]);
  return {
    label: options.label,
    value: options.list.indexOf(value),
    setValue: (value: number) => {
      window.electronAPI.preferenceValue(options.preferenceName, value);
    },
    min: 0,
    max: options.list.length-1,
    step: 1,
    map: (x: number) => options.list[x]
  };
}

export default useSliderProps;
