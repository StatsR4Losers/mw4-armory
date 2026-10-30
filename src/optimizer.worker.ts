import { optimize } from './engine';
import type { Catalog, OptimizeSettings } from './types';

// Each request carries an id so a later settings change cannot show an older result.
self.onmessage = (event: MessageEvent<{ id: number; catalog: Catalog; settings: OptimizeSettings }>) => {
  const { id, catalog, settings } = event.data;
  try {
    self.postMessage({ id, result: optimize(catalog, settings) });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : 'Optimization failed.' });
  }
};
