import { useEffect, useState } from 'react';
import { preferenceConfig, preferenceNames } from '../config.ts';

interface PreferenceHook<T> {
  value: T;
  send: (x: T) => void;
}

type PreferenceHooks = {
  [T in Preference]: PreferenceHook<Preferences[T]>;
};

export function usePreferences(): PreferenceHooks {
  const preferences: Partial<Record<Preference, unknown>> = {};
  for (const name of preferenceNames) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, send] = usePreference(name);
    preferences[name] = { value, send };
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

export function useSignal<T extends Signal>(name: T) {
  const [value, setValue] = useState<Signals[T] | undefined>();
  useEffect(() => {
    const listener = setValue as SignalListeners[T];
    return window.electronAPI.onSignal(name, listener);
  }, [name]);
  return value;
}
