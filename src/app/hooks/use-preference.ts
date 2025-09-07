import { useEffect, useState } from 'react';
import type { Preference, Preferences, PreferenceListeners } from '../../interface';
import { defaultValues } from '../../config';

function usePreference<T extends Preference>(preferenceName: T) {
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

export default usePreference;
