import usePreference from './use-preference.ts';
import type { Preference, Preferences } from '../../interface';

type NumberPreference = {
  [T in Preference]: Preferences[T] extends number ? T : never;
}[Preference];

interface SliderHookOptions {
  label: string;
  list: number[];
  preferenceName: NumberPreference;
}

function useSliderProps({ label, list, preferenceName }: SliderHookOptions) {
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

export default useSliderProps;
