import { describe, it, expect } from '@jest/globals';

import { formatUrl } from './url.utils';

describe('formatUrl', () => {
  it('should replace [::1] with localhost', () => {
    const result = formatUrl('http://[::1]:3000');
    expect(result).toEqual('http://localhost:3000');
  });

  it('should replace 0.0.0.0 with 127.0.0.1', () => {
    const result = formatUrl('http://0.0.0.0:3000');
    expect(result).toEqual('http://127.0.0.1:3000');
  });

  it('should not alter already correct URLs', () => {
    const result = formatUrl('http://127.0.0.1:3000');
    expect(result).toEqual('http://127.0.0.1:3000');
  });
});
