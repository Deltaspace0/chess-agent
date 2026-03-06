import { useEffect, useState } from 'react';
import { preferenceConfig } from '../config.ts';

export function usePreferences(names: Preference[]) {
  const [values, setValues] = useState(() => {
    const initial: Partial<Preferences> = {};
    names.forEach(<T extends Preference>(name: T) => {
      initial[name] = preferenceConfig[name].defaultValue;
    });
    return initial;
  });
  useEffect(() => {
    const cleanups = names.map(<T extends Preference>(name: T) => {
      const listener = ((value: Preferences[T]) => {
        setValues((prev) => ({ ...prev, [name]: value }));
      }) as PreferenceListeners[T];
      const offPreference = window.electronAPI.onPreference(name, listener);
      window.electronAPI.sendSignal('requestPreference', name);
      return offPreference;
    });
    return () => cleanups.forEach((off) => off());
  }, [names]);
  return values;
}

export function usePreference<T extends Preference>(name: T) {
  const [value, setValue] = useState(preferenceConfig[name].defaultValue);
  useEffect(() => {
    const listener = setValue as PreferenceListeners[T];
    const offPreference = window.electronAPI.onPreference(name, listener);
    window.electronAPI.sendSignal('requestPreference', name);
    return offPreference;
  }, [name]);
  const sendValue = (x: Preferences[T]) => {
    window.electronAPI.setPreference(name, x);
  };
  return [value, sendValue] as const;
}

export function useSignal<T extends Signal>(name: T) {
  const [value, setValue] = useState<Signals[T] | undefined>();
  useEffect(() => {
    const listener = setValue as SignalListeners[T];
    return window.electronAPI.onSignal(name, listener);
  }, [name]);
  return value;
}
