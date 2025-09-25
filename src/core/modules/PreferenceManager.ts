import fs from 'fs';
import { preferenceConfig, preferenceNames } from '../../config.ts';

class PreferenceManager {
  private preferences: Preferences;
  private generalListener: typeof this.setPreference = () => {};
  private listeners: Partial<PreferenceListeners> = {};

  constructor() {
    const preferences: Partial<Record<Preference, unknown>> = {};
    for (const name of preferenceNames) {
      preferences[name] = preferenceConfig[name].defaultValue;
    }
    this.preferences = preferences as Preferences;
  }

  setPreference<T extends Preference>(name: T, value: Preferences[T]) {
    this.preferences[name] = value;
    this.generalListener(name, value);
    this.listeners[name]?.(value);
  }

  getPreference<T extends Preference>(name: T): Preferences[T] {
    return this.preferences[name];
  }

  togglePreference(name: BooleanPreference): boolean {
    const value = !this.preferences[name];
    this.setPreference(name, value);
    return value;
  }

  onUpdate(listener: typeof this.generalListener) {
    this.generalListener = listener;
    for (const name of preferenceNames) {
      listener(name, this.preferences[name]);
    }
  }

  onUpdatePreference<T extends Preference>(name: T, listener: PreferenceListeners[T]) {
    this.listeners[name] = listener;
    try {
      listener(this.preferences[name]);
    } catch (e) {
      console.log(e);
    }
  }

  saveToFile(path: string) {
    fs.writeFileSync(path, JSON.stringify(this.preferences));
  }

  loadFromFile(path: string) {
    try {
      const preferences = JSON.parse(fs.readFileSync(path, {encoding: 'ascii'}));
      this.preferences = {...this.preferences, ...preferences};
    } catch (e) {
      console.log(e);
    }
  }
}

export default PreferenceManager;
