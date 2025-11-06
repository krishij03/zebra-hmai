/**
 * OpenAPI specification validation test
 */
import { describe, expect, it } from 'vitest';
import SwaggerParser from '@apidevtools/swagger-parser';
import { resolve } from 'node:path';

describe('OpenAPI Specification', () => {
  it('should validate the OpenAPI v2 spec', async () => {
    const specPath = resolve(__dirname, '../../openapi-v2.yaml');
    
    // Parse and validate the OpenAPI spec
    const api = await SwaggerParser.validate(specPath);
    
    expect(api).toBeDefined();
    expect(api.openapi).toBe('3.1.0');
    expect(api.info.title).toBe('Zebra HMAI API');
    expect(api.info.version).toBe('2.0.0');
  });

  it('should have all required paths defined', async () => {
    const specPath = resolve(__dirname, '../../openapi-v2.yaml');
    const api = await SwaggerParser.parse(specPath);
    
    // Check essential paths exist
    expect(api.paths).toBeDefined();
    expect(api.paths['/auth/login']).toBeDefined();
    expect(api.paths['/rmf3/{lpar}/{report}']).toBeDefined();
    expect(api.paths['/hmai/{lpar}/query']).toBeDefined();
    expect(api.paths['/metrics']).toBeDefined();
  });

  it('should have security schemes defined', async () => {
    const specPath = resolve(__dirname, '../../openapi-v2.yaml');
    const api = await SwaggerParser.parse(specPath);
    
    expect(api.components?.securitySchemes).toBeDefined();
    expect(api.components?.securitySchemes?.bearerAuth).toBeDefined();
  });

  it('should have all required schemas', async () => {
    const specPath = resolve(__dirname, '../../openapi-v2.yaml');
    const api = await SwaggerParser.parse(specPath);
    
    const schemas = api.components?.schemas || {};
    
    // Auth schemas
    expect(schemas.LoginRequest).toBeDefined();
    expect(schemas.LoginResponse).toBeDefined();
    
    // RMF schemas
    expect(schemas.RMFMonitor3Response).toBeDefined();
    
    // HMAI schemas
    expect(schemas.HMAIQueryRequest).toBeDefined();
    expect(schemas.HMAIQueryResponse).toBeDefined();
    
    // Error schema
    expect(schemas.ErrorResponse).toBeDefined();
  });
});

