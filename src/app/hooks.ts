import { useEffect, useState } from 'react';
import type { Listener, Preference, Preferences, PreferenceListeners } from '../interface';
import { defaultValues } from '../config.ts';

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

type BooleanPreference = {
  [T in Preference]: Preferences[T] extends boolean ? T : never;
}[Preference];

interface CheckboxHookOptions {
  label: string;
  preferenceName: BooleanPreference;
}

export function useCheckboxProps({ label, preferenceName }: CheckboxHookOptions) {
  const [value, sendValue] = usePreference(preferenceName);
  return {
    label,
    type: 'checkbox',
    checked: value,
    onChange: sendValue
  };
}

type NumberPreference = {
  [T in Preference]: Preferences[T] extends number ? T : never;
}[Preference];

interface SliderHookOptions {
  label: string;
  list: number[];
  preferenceName: NumberPreference;
}

export function useSliderProps({ label, list, preferenceName }: SliderHookOptions) {
  const [value, sendValue] = usePreference(preferenceName);
  return {
    label,
    value: list.indexOf(value),
    setValue: sendValue,
    min: 0,
    max: list.length-1,
    step: 1,
    map: (x: number) => list[x]
  };
}
