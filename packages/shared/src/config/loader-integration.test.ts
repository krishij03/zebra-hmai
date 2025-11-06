/**
 * Config loader integration tests with sample Zconfig.json
 */
import { describe, expect, it } from 'vitest';
import { validateConfig } from './loader.js';

describe('Config Loader Integration', () => {
  it('should validate sample Zconfig from Phase 0 inventory', () => {
    const sampleConfig = {
      mongourl: 'localhost',
      dbinterval: '100',
      dbname: 'Zebrav1111',
      appurl: 'localhost',
      appport: '3090',
      mongoport: '27017',
      ppminutesInterval: '30',
      rmf3interval: '100',
      zebra_httptype: 'http',
      useDbAuth: 'true',
      dbUser: 'myUserAdmin',
      dbPassword: 'salisu',
      authSource: 'admin',
      use_cert: 'false',
      grafanaurl: 'localhost',
      grafanaport: '3000',
      grafanahttptype: 'http',
      dds: {
        LPAR1: {
          ddshhttptype: 'https',
          ddsbaseurl: 'example.lpar1.com',
          ddsbaseport: '8803',
          ddsauth: 'true',
          ddsuser: 'lpar1user',
          ddspwd: 'lpar1password',
          rmf3filename: 'rmfm3.xml',
          rmfppfilename: 'rmfpp.xml',
          mvsResource: ',LPAR1,MVS_IMAGE',
          PCI: '2951',
          useMongo: 'false',
          usePrometheus: 'false',
          hmai: {
            ftp: {
              directory: '/u/lpar1/hmaicsv',
            },
            mysql: {
              host: 'localhost',
              user: 'lpar1user',
              password: 'lpar1password',
            },
            dataRetention: {
              clpr: '3',
              ldev: '3',
              mpb: '3',
              mprank20: '3',
              pgrp: '3',
              port: '3',
            },
            checkInterval: '30',
            defaultStartDate: '2024-07-01',
            continuousMonitoring: false,
          },
          hmre: {
            ftp: {
              directory: '/u/lpar1/hmrecsv',
            },
            mysql: {
              host: 'localhost',
              user: 'lpar1user',
              password: 'lpar1password',
            },
            dataRetention: {
              hmrecsvs: '2',
              hmrecsvd: '2',
            },
            checkInterval: '2',
            defaultStartDate: '2024-07-01',
            continuousMonitoring: false,
          },
          dcol: {
            ftp: {
              directory: '/u/lpar1/hmaidcol',
            },
            mysql: {
              host: 'localhost',
              user: 'lpar1user',
              password: 'lpar1password',
            },
            dataRetention: {
              hmaidcol: '2',
            },
            checkInterval: '2',
            defaultStartDate: '2024-07-01',
            continuousMonitoring: false,
          },
          rmfmon1: {
            mysql: {
              host: 'localhost',
              user: 'lpar1user',
              password: 'lpar1password',
            },
            cache: {
              checkInterval: '2',
              dataRetention: '5',
              startDate: '2024-07-01',
              continuousMonitoring: false,
            },
            device: {
              checkInterval: '2',
              dataRetention: '5',
              startDate: '2024-07-01',
              continuousMonitoring: false,
            },
            continuousMonitoring: false,
          },
        },
      },
      apiml_IP: 'localhost',
      apiml_http_type: 'https',
      apiml_password: 'password',
      apiml_username: 'username',
      apiml_port: '10010',
      apiml_auth_type: 'bypass',
    };

    // Should validate successfully
    const validated = validateConfig(sampleConfig);
    
    expect(validated).toBeDefined();
    expect(validated.appurl).toBe('localhost');
    expect(validated.appport).toBe(3090); // coerced to number
    expect(validated.dds.LPAR1).toBeDefined();
    expect(validated.dds.LPAR1.hmai).toBeDefined();
    expect(validated.dds.LPAR1.hmai?.checkInterval).toBe(30); // coerced to number
  });

  it('should validate minimal config', () => {
    const minimalConfig = {
      dds: {
        TEST_LPAR: {
          ddsbaseurl: 'test.example.com',
          mvsResource: ',TEST,MVS_IMAGE',
        },
      },
    };

    const validated = validateConfig(minimalConfig);
    
    expect(validated).toBeDefined();
    expect(validated.appurl).toBe('localhost'); // default
    expect(validated.appport).toBe(3090); // default
    expect(validated.zebra_httptype).toBe('http'); // default
  });

  it('should reject invalid date formats', () => {
    const invalidConfig = {
      dds: {
        LPAR1: {
          ddsbaseurl: 'example.com',
          mvsResource: ',LPAR1,MVS_IMAGE',
          hmai: {
            ftp: { directory: '/test' },
            mysql: { host: 'localhost', user: 'user', password: 'pass' },
            defaultStartDate: '01-07-2024', // Invalid format
          },
        },
      },
    };

    expect(() => validateConfig(invalidConfig)).toThrow();
  });

  it('should reject missing required fields', () => {
    const invalidConfig = {
      dds: {
        LPAR1: {
          // Missing required mvsResource
          ddsbaseurl: 'example.com',
        },
      },
    };

    expect(() => validateConfig(invalidConfig)).toThrow();
  });
});

