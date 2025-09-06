import fs from 'fs';
import { defaultValues } from '../config.ts';

type Preference = keyof typeof defaultValues;

class PreferencesManager {
  private preferences: Record<string, string> = {};

  constructor() {
    for (const key in defaultValues) {
      this.preferences[key] = JSON.stringify(defaultValues[key as Preference]);
    }
  }

  setPreference<T>(name: Preference, value: T) {
    this.preferences[name] = JSON.stringify(value);
  }

  getPreference<T>(name: Preference): T {
    return JSON.parse(this.preferences[name]);
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
