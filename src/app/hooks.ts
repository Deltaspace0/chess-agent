import { useEffect, useState } from 'react';
import { defaultVariables, preferenceConfig, preferenceNames } from '../config.ts';

interface PreferenceHook<T> {
  value: T;
  send: (x: T) => void;
}

interface BooleanPreferenceHook extends PreferenceHook<boolean> {
  checkboxProps: {
    label: string;
    checked: boolean;
    onChange: (x: boolean) => void;
  };
}

interface NumberPreferenceHook extends PreferenceHook<number> {
  sliderProps: {
    label: string;
    value: number;
    setValue: (x: number) => void;
    min: number;
    max: number;
    step: number;
    map: (x: number) => number;
  };
}

type PreferenceHooks = {
  [T in Preference]: Preferences[T] extends boolean
    ? BooleanPreferenceHook : Preferences[T] extends number
      ? NumberPreferenceHook : PreferenceHook<Preferences[T]>;
};

export function usePreferences(): PreferenceHooks {
  const preferences: Partial<Record<Preference, unknown>> = {};
  for (const name of preferenceNames) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, send] = usePreference(name);
    if (preferenceConfig[name].type === 'boolean') {
      const checkboxProps = {
        label: preferenceConfig[name].label,
        checked: value,
        onChange: send
      };
      preferences[name] = { value, send, checkboxProps };
    } else if (preferenceConfig[name].type === 'number') {
      const list = preferenceConfig[name].sliderValues ?? [];
      const sliderProps = {
        label: preferenceConfig[name].label,
        value: list.indexOf(value as number),
        setValue: send,
        min: 0,
        max: list.length-1,
        step: 1,
        map: (x: number) => list[x]
      };
      preferences[name] = { value, send, sliderProps };
    } else {
      preferences[name] = { value, send };
    }
  }
  return preferences as PreferenceHooks;
}

export function usePreference<T extends Preference>(name: T) {
  const [value, setValue] = useState(preferenceConfig[name].defaultValue);
  useEffect(() => {
    const listener = setValue as PreferenceListeners[T];
    return window.electronAPI.onPreference(name, listener);
  }, [name]);
  const sendValue = (x: Preferences[T]) => {
    window.electronAPI.preferenceValue(name, x);
  }
  return [value, sendValue] as const;
}

export function useVariable<T extends Variable>(name: T) {
  const [value, setValue] = useState(defaultVariables[name]);
  useEffect(() => {
    const listener = setValue as VariableListeners[T];
    return window.electronAPI.onVariable(name, listener);
  }, [name]);
  return value;
}
