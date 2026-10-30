import { optimize } from './engine';
import { data } from './data/game';
import type { Settings } from './types';

// Each request carries an id so a later settings change cannot show an older result.
self.onmessage = (event: MessageEvent<{ id: number; settings: Settings }>) => {
  const { id, settings } = event.data;
  try {
    self.postMessage({ id, result: optimize(data, settings) });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : 'The optimizer failed.' });
  }
};
