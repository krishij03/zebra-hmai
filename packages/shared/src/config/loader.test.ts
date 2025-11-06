/**
 * Tests for config loader
 */
import { describe, expect, it } from 'vitest';
import {
  ConfigValidationError,
  validateConfig,
  validateConfigSafe,
} from './loader.js';

describe('Config Loader', () => {
  describe('validateConfig', () => {
    it('should validate a valid minimal config', () => {
      const validConfig = {
        appurl: 'localhost',
        appport: 3090,
        dds: {
          LPAR1: {
            ddsbaseurl: 'example.com',
            mvsResource: ',LPAR1,MVS_IMAGE',
          },
        },
      };

      const result = validateConfig(validConfig);
      expect(result).toBeDefined();
      expect(result.appurl).toBe('localhost');
      expect(result.appport).toBe(3090);
    });

    it('should apply default values', () => {
      const config = {
        dds: {
          LPAR1: {
            ddsbaseurl: 'example.com',
            mvsResource: ',LPAR1,MVS_IMAGE',
          },
        },
      };

      const result = validateConfig(config);
      expect(result.appurl).toBe('localhost'); // default
      expect(result.appport).toBe(3090); // default
      expect(result.zebra_httptype).toBe('http'); // default
      expect(result.rmf3interval).toBe(100); // default
    });

    it('should throw on invalid config structure', () => {
      const invalidConfig = {
        appurl: 'localhost',
        appport: 'not-a-number', // should be number
        dds: {},
      };

      expect(() => validateConfig(invalidConfig)).toThrow(ConfigValidationError);
    });

    it('should validate LPAR config with HMAI', () => {
      const config = {
        dds: {
          LPAR1: {
            ddsbaseurl: 'example.com',
            mvsResource: ',LPAR1,MVS_IMAGE',
            hmai: {
              ftp: {
                directory: '/u/test/hmaicsv',
              },
              mysql: {
                host: 'localhost',
                user: 'testuser',
                password: 'testpass',
              },
              defaultStartDate: '2024-01-01',
            },
          },
        },
      };

      const result = validateConfig(config);
      expect(result.dds.LPAR1.hmai).toBeDefined();
      expect(result.dds.LPAR1.hmai?.ftp.directory).toBe('/u/test/hmaicsv');
      expect(result.dds.LPAR1.hmai?.checkInterval).toBe(30); // default
    });

    it('should validate date format in HMAI config', () => {
      const config = {
        dds: {
          LPAR1: {
            ddsbaseurl: 'example.com',
            mvsResource: ',LPAR1,MVS_IMAGE',
            hmai: {
              ftp: { directory: '/test' },
              mysql: { host: 'localhost', user: 'user', password: 'pass' },
              defaultStartDate: 'invalid-date', // should be YYYY-MM-DD
            },
          },
        },
      };

      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
    });
  });

  describe('validateConfigSafe', () => {
    it('should return success result for valid config', () => {
      const validConfig = {
        dds: {
          LPAR1: {
            ddsbaseurl: 'example.com',
            mvsResource: ',LPAR1,MVS_IMAGE',
          },
        },
      };

      const result = validateConfigSafe(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dds.LPAR1.ddsbaseurl).toBe('example.com');
      }
    });

    it('should return error result for invalid config', () => {
      const invalidConfig = {
        appport: 'not-a-number',
        dds: {},
      };

      const result = validateConfigSafe(invalidConfig);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ConfigValidationError);
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe('ConfigValidationError', () => {
    it('should contain detailed error information', () => {
      const config = {
        appport: 'invalid',
        dds: {},
      };

      try {
        validateConfig(config);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigValidationError);
        if (error instanceof ConfigValidationError) {
          expect(error.issues.length).toBeGreaterThan(0);
          expect(error.issues[0]).toHaveProperty('path');
          expect(error.issues[0]).toHaveProperty('message');
          expect(error.issues[0]).toHaveProperty('code');
        }
      }
    });
  });
});

