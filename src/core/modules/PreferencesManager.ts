import fs from 'fs';
import { defaultValues } from '../../config.ts';

type Preference = keyof typeof defaultValues;

class PreferencesManager {
  private preferences: Record<string, unknown> = {};

  constructor() {
    for (const key in defaultValues) {
      this.preferences[key] = defaultValues[key as Preference];
    }
  }

  setPreference<T>(name: Preference, value: T) {
    this.preferences[name] = value;
  }

  getPreference<T>(name: Preference): T {
    try {
      return this.preferences[name] as T;
    } catch (e) {
      console.log(e);
      return defaultValues[name] as T;
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
