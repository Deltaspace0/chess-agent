import { useEffect, useState } from 'react';
import type { Preference, Preferences } from '../../interface';
import { defaultValues } from '../../config.ts';

type NumberPreference = {
  [T in Preference]: Preferences[T] extends number ? T : never;
}[Preference];

interface SliderHookOptions {
  label: string;
  list: number[];
  preferenceName: NumberPreference;
}

function useSliderProps({ label, list, preferenceName }: SliderHookOptions) {
  const [value, setValue] = useState(defaultValues[preferenceName]);
  useEffect(() => {
    window.electronAPI.onUpdatePreference(preferenceName, setValue);
  }, [preferenceName]);
  return {
    label,
    value: list.indexOf(value),
    setValue: (value: number) => {
      window.electronAPI.preferenceValue(preferenceName, value);
    },
    min: 0,
    max: list.length-1,
    step: 1,
    map: (x: number) => list[x]
  };
}

export default useSliderProps;
