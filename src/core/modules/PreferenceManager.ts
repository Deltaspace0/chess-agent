import EventEmitter from 'events';
import fs from 'fs';
import { preferenceConfig, preferenceNames } from '../../config.ts';

type PreferenceUpdateEvents = {
  [K in Preference as `update:${K}`]: [value: Preferences[K]];
};

type PreferenceManagerEventMap = PreferenceUpdateEvents & {
  update: [ { [K in Preference]: [name: K, value: Preferences[K]] }[Preference] ];
};

class PreferenceManager extends EventEmitter<PreferenceManagerEventMap> {
  private preferences: Preferences;

  constructor() {
    super();
    const preferences: Partial<Record<Preference, unknown>> = {};
    for (const name of preferenceNames) {
      preferences[name] = preferenceConfig[name].defaultValue;
    }
    this.preferences = preferences as Preferences;
    this.addListener('newListener', (name, listener) => {
      if (typeof name !== 'string' || !name.startsWith('update:')) {
        return;
      }
      listener(this.preferences[name.replace('update:', '') as Preference]);
    });
  }

  setPreference<T extends Preference>(name: T, value: Preferences[T]) {
    this.preferences[name] = value;
    (this.emit as (key: 'update', args: [T, Preferences[T]]) => boolean)(
      'update', 
      [name, value]
    );
    (this.emit as (key: string, val: Preferences[T]) => boolean)(
      `update:${name}`, 
      value
    );
  }

  getPreference<T extends Preference>(name: T): Preferences[T] {
    return this.preferences[name];
  }

  togglePreference(name: BooleanPreference): boolean {
    const value = !this.preferences[name];
    this.setPreference(name, value);
    return value;
  }

  saveToFile(path: string) {
    fs.writeFileSync(path, JSON.stringify(this.preferences, null, 2));
  }

  loadFromFile(path: string) {
    try {
      const data = fs.readFileSync(path, { encoding: 'ascii' });
      const preferences = JSON.parse(data);
      for (const name of Object.keys(preferences) as Preference[]) {
        this.setPreference(name, preferences[name]);
      }
    } catch (e) {
      console.log(e);
    }
  }

  reset() {
    for (const name of preferenceNames) {
      this.setPreference(name, preferenceConfig[name].defaultValue);
    }
  }
}

export default PreferenceManager;
