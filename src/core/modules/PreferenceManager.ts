import fs from 'fs';
import { preferenceConfig, preferenceNames } from '../../config.ts';

class PreferenceManager {
  private preferences: Preferences;

  constructor() {
    const preferences: Partial<Record<Preference, unknown>> = {};
    for (const name of preferenceNames) {
      preferences[name] = preferenceConfig[name].defaultValue;
    }
    this.preferences = preferences as Preferences;
  }

  setPreference<T extends Preference>(name: T, value: Preferences[T]) {
    this.preferences[name] = value;
  }

  getPreference<T extends Preference>(name: T): Preferences[T] {
    return this.preferences[name];
  }

  getPreferences(): Preferences {
    return this.preferences;
  }

  saveToFile(path: string) {
    fs.writeFileSync(path, JSON.stringify(this.preferences, null, 2));
  }

  loadFromFile(path: string) {
    const data = fs.readFileSync(path, { encoding: 'ascii' });
    const preferences = JSON.parse(data);
    for (const name of Object.keys(preferences) as Preference[]) {
      this.setPreference(name, preferences[name]);
    }
  }

  reset() {
    for (const name of preferenceNames) {
      this.setPreference(name, preferenceConfig[name].defaultValue);
    }
  }
}

export default PreferenceManager;
