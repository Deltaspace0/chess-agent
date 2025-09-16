import { useEffect, useState } from 'react';
import { defaultValues, preferenceLabels, sliders } from '../config.ts';

export function useElectronValue<T>(initialValue: T, onUpdate: Listener<T>): T {
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    onUpdate(setValue);
  }, [onUpdate]);
  return value;
}

export function usePreference<T extends Preference>(preferenceName: T) {
  const [value, setValue] = useState(defaultValues[preferenceName]);
  useEffect(() => {
    const listener = setValue as PreferenceListeners[T];
    window.electronAPI.onUpdatePreference(preferenceName, listener);
  }, [preferenceName]);
  const sendValue = (x: Preferences[T]) => {
    window.electronAPI.preferenceValue(preferenceName, x);
  }
  return [value, sendValue] as const;
}

export function useCheckboxProps(preferenceName: BooleanPreference) {
  const [value, sendValue] = usePreference(preferenceName);
  return {
    label: preferenceLabels[preferenceName],
    type: 'checkbox',
    checked: value,
    onChange: sendValue
  };
}

export function useSliderProps(preferenceName: NumberPreference) {
  const [value, sendValue] = usePreference(preferenceName);
  const list = sliders[preferenceName];
  return {
    label: preferenceLabels[preferenceName],
    value: list.indexOf(value),
    setValue: sendValue,
    min: 0,
    max: list.length-1,
    step: 1,
    map: (x: number) => list[x]
  };
}
