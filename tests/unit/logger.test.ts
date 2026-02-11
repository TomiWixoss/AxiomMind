import { describe, test, expect } from 'bun:test';
import logger from '../../src/utils/logger.js';

describe('Logger', () => {
  test('should log info messages', () => {
    expect(() => {
      logger.info('Test info message');
    }).not.toThrow();
  });
  
  test('should log error messages', () => {
    expect(() => {
      logger.error('Test error message');
    }).not.toThrow();
  });
  
  test('should log with metadata', () => {
    expect(() => {
      logger.info('Test with metadata', { userId: 123, action: 'test' });
    }).not.toThrow();
  });
});
