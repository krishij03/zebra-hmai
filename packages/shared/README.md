# @zebra/shared

Shared types, schemas, and utilities for Zebra HMAI TypeScript monorepo.

## Features

- **Type Safety**: Comprehensive TypeScript types for all Zebra HMAI domains (RMF, HMAI, HMRE, DCOL, Auth, Config)
- **Schema Validation**: Zod schemas for runtime validation of configuration and data
- **Config Loader**: Load and validate Zconfig.json with detailed error messages
- **DTOs**: Data Transfer Objects with Zod schemas for API request/response validation
- **OpenAPI**: Complete OpenAPI 3.1 specification for v2 API
- **Constants**: RMF report types, metric descriptions, and other constants
- **Dual Format**: Supports both CommonJS and ES Modules

## Installation

```bash
pnpm add @zebra/shared
```

## Usage

### Configuration Loader

```typescript
import { loadConfig, validateConfig, type ZConfig } from '@zebra/shared/config';

// Load and validate Zconfig.json from file
const config = loadConfig({ configPath: './config/Zconfig.json' });

// Safe load (doesn't throw)
const result = loadConfigSafe();
if (result.success) {
  console.log('Config loaded:', result.data);
} else {
  console.error('Validation errors:', result.error.issues);
}

// Validate object
const validated = validateConfig(configObject);
```

### Types

```typescript
import type {
  RMFMonitor3Data,
  HMAIMetric,
  CLPRRecord,
  AdminUser,
} from '@zebra/shared/types';

// Use types for type safety
const rmfData: RMFMonitor3Data = {
  title: 'CPC Activity',
  timestart: '11/06/2025 10:00:00',
  timeend: '11/06/2025 10:15:00',
  columnhead: ['CPCPPNAM', 'CPCPUPID', 'CPCPLEFU'],
  table: [
    /* ... */
  ],
};
```

### DTOs (Data Transfer Objects)

```typescript
import {
  rmfMonitor3RequestSchema,
  hmaiQueryRequestSchema,
  loginRequestSchema,
} from '@zebra/shared/dtos';

// Validate RMF request
const rmfRequest = rmfMonitor3RequestSchema.parse({
  lpar: 'LPAR1',
  report: 'CPC',
  resource: ',LPAR1,MVS_IMAGE',
});

// Validate HMAI query with pagination
const hmaiQuery = hmaiQueryRequestSchema.parse({
  lpar: 'LPAR1',
  metric: 'clpr',
  pagination: { page: 1, limit: 100 },
  sort: { field: 'TIMESTAMP', order: 'desc' },
});
```

### Constants

```typescript
import { RMFM3_REPORTS, REPORT_TYPE_MAP } from '@zebra/shared/constants';

// Check if report is valid
if (RMFM3_REPORTS.includes(reportName)) {
  const resourceType = REPORT_TYPE_MAP[reportName];
  // ...
}
```

### OpenAPI Specification

The package includes a complete OpenAPI 3.1 specification at `openapi-v2.yaml`. Use it with:

```typescript
import SwaggerParser from '@apidevtools/swagger-parser';
import { resolve } from 'node:path';

const specPath = resolve(__dirname, '../shared/openapi-v2.yaml');
const api = await SwaggerParser.validate(specPath);
```

## Package Structure

```
src/
├── config/            # Zconfig schemas, loader, validators
│   ├── zconfig.schema.ts
│   ├── loader.ts
│   └── *.test.ts
├── types/             # TypeScript type definitions
├── dtos/              # Data Transfer Objects with Zod schemas
│   ├── rmf.dto.ts
│   ├── hmai.dto.ts
│   ├── metrics.dto.ts
│   └── auth.dto.ts
├── constants/         # RMF constants and enums
├── schemas/           # Zod schemas (re-exports)
├── openapi-v2.yaml    # OpenAPI 3.1 specification
└── index.ts           # Main export
```

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Run tests
pnpm test

# Lint
pnpm lint

# Format
pnpm format
```

## License

EPL-2.0 (Eclipse Public License v2.0)

