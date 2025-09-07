import usePreference from './use-preference.ts';
import type { Preference, Preferences } from '../../interface';

type BooleanPreference = {
  [T in Preference]: Preferences[T] extends boolean ? T : never;
}[Preference];

interface CheckboxHookOptions {
  label: string;
  preferenceName: BooleanPreference;
}

function useCheckboxProps({ label, preferenceName }: CheckboxHookOptions) {
  const [value, sendValue] = usePreference(preferenceName);
  return {
    label,
    type: 'checkbox',
    checked: value,
    onChange: sendValue
  };
}

export default useCheckboxProps;
