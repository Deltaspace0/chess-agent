import fs from 'fs';
import type { Preference, Preferences, PreferenceListeners } from '../../interface';
import { defaultValues } from '../../config.ts';

class PreferencesManager {
  private preferences: Preferences;
  private generalListener: typeof this.setPreference = () => {};
  private listeners: Partial<PreferenceListeners> = {};

  constructor() {
    this.preferences = {...defaultValues};
  }

  setPreference<T extends Preference>(name: T, value: Preferences[T]) {
    this.preferences[name] = value;
    this.generalListener(name, value);
    this.listeners[name]?.(value);
  }

  getPreference<T extends Preference>(name: T): Preferences[T] {
    try {
      return this.preferences[name];
    } catch (e) {
      console.log(e);
      return defaultValues[name];
    }
  }

  onUpdate(listener: typeof this.generalListener) {
    this.generalListener = listener;
    for (const name of Object.keys(this.preferences) as Preference[]) {
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
      this.preferences = JSON.parse(fs.readFileSync(path, {encoding: 'ascii'}));
    } catch (e) {
      console.log(e);
    }
  }
}

export default PreferencesManager;
