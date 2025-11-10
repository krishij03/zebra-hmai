/**
 * Configuration loader with Zod validation
 * Loads and validates Zconfig.json at runtime
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { zconfigSchema, type ZConfig } from './zconfig.schema.js';

/**
 * Error thrown when config validation fails
 */
export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: Array<{
      path: (string | number)[];
      message: string;
      code: string;
    }>,
  ) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Config loader options
 */
export interface ConfigLoaderOptions {
  /**
   * Path to Zconfig.json file
   * @default './config/Zconfig.json'
   */
  configPath?: string;

  /**
   * Whether to throw on validation errors
   * @default true
   */
  throwOnError?: boolean;

  /**
   * Whether to log validation errors
   * @default true
   */
  logErrors?: boolean;
}

/**
 * Result of config loading
 */
export type ConfigLoadResult =
  | {
      success: true;
      data: ZConfig;
    }
  | {
      success: false;
      error: ConfigValidationError;
    };

/**
 * Load and validate Zconfig.json
 *
 * @param options - Loader options
 * @returns Validated config object
 * @throws ConfigValidationError if validation fails and throwOnError is true
 *
 * @example
 * ```typescript
 * // Load config (throws on error)
 * const config = loadConfig();
 *
 * // Load config with custom path
 * const config = loadConfig({ configPath: '/path/to/Zconfig.json' });
 *
 * // Load config without throwing
 * const result = loadConfigSafe();
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function loadConfig(options: ConfigLoaderOptions = {}): ZConfig {
  const { configPath = './config/Zconfig.json', throwOnError = true, logErrors = true } = options;

  try {
    // Read config file
    const absolutePath = resolve(process.cwd(), configPath);
    const fileContent = readFileSync(absolutePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);

    // Validate with Zod
    const parseResult = zconfigSchema.safeParse(jsonData);

    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
        code: issue.code,
      }));

      const errorMessage = `Invalid Zconfig.json: ${issues.length} validation error(s) found`;

      if (logErrors) {
        console.error(`\n${errorMessage}:`);
        for (const issue of issues) {
          console.error(`  - ${issue.path.join('.')}: ${issue.message} (${issue.code})`);
        }
        console.error('');
      }

      if (throwOnError) {
        throw new ConfigValidationError(errorMessage, issues);
      }
    }

    return parseResult.data as ZConfig;
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      throw error;
    }

    // Handle file read or JSON parse errors
    const message =
      error instanceof Error
        ? `Failed to load config from ${configPath}: ${error.message}`
        : `Failed to load config from ${configPath}`;

    if (logErrors) {
      console.error(message);
    }

    if (throwOnError) {
      throw new Error(message);
    }

    throw error;
  }
}

/**
 * Safely load and validate Zconfig.json without throwing
 *
 * @param options - Loader options
 * @returns Result object with success flag and data or error
 *
 * @example
 * ```typescript
 * const result = loadConfigSafe();
 * if (result.success) {
 *   console.log('Config loaded:', result.data);
 * } else {
 *   console.error('Config validation failed:', result.error.issues);
 * }
 * ```
 */
export function loadConfigSafe(options: ConfigLoaderOptions = {}): ConfigLoadResult {
  try {
    const data = loadConfig({ ...options, throwOnError: false });
    return { success: true, data };
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      return { success: false, error };
    }
    // Convert other errors to ConfigValidationError
    const message = error instanceof Error ? error.message : 'Unknown error loading config';
    return {
      success: false,
      error: new ConfigValidationError(message, []),
    };
  }
}

/**
 * Validate a config object against the schema without loading from file
 *
 * @param config - Config object to validate
 * @returns Validated config object
 * @throws ConfigValidationError if validation fails
 *
 * @example
 * ```typescript
 * const config = { ... };
 * const validated = validateConfig(config);
 * ```
 */
export function validateConfig(config: unknown): ZConfig {
  const parseResult = zconfigSchema.safeParse(config);

  if (!parseResult.success) {
    const issues = parseResult.error.issues.map((issue) => ({
      path: issue.path,
      message: issue.message,
      code: issue.code,
    }));

    throw new ConfigValidationError(
      `Invalid config: ${issues.length} validation error(s) found`,
      issues,
    );
  }

  return parseResult.data;
}

/**
 * Validate a config object without throwing
 *
 * @param config - Config object to validate
 * @returns Result object with success flag and data or error
 */
export function validateConfigSafe(config: unknown): ConfigLoadResult {
  try {
    const data = validateConfig(config);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      return { success: false, error };
    }
    const message = error instanceof Error ? error.message : 'Unknown validation error';
    return {
      success: false,
      error: new ConfigValidationError(message, []),
    };
  }
}


