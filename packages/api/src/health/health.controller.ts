/**
 * Health check controller
 * Provides /health and /ready endpoints for Kubernetes probes
 */
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Health check',
    description: 'Comprehensive health check including memory and disk',
  })
  @ApiResponse({
    status: 200,
    description: 'The service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: { type: 'object' },
        error: { type: 'object' },
        details: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'The service is unhealthy',
  })
  check() {
    return this.health.check([
      // Memory heap check - max 300MB
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      // Memory RSS check - max 600MB
      () => this.memory.checkRSS('memory_rss', 600 * 1024 * 1024),
      // Disk storage check - min 10% free
      () =>
        this.disk.checkStorage('disk_storage', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness check',
    description:
      'Lightweight readiness check for Kubernetes - checks if app is ready to accept traffic',
  })
  @ApiResponse({
    status: 200,
    description: 'The service is ready',
  })
  @ApiResponse({
    status: 503,
    description: 'The service is not ready',
  })
  ready() {
    // Lightweight check - just memory
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 400 * 1024 * 1024),
    ]);
  }

  @Get('live')
  @HealthCheck()
  @ApiOperation({
    summary: 'Liveness check',
    description: 'Minimal liveness check for Kubernetes - checks if app should be restarted',
  })
  @ApiResponse({
    status: 200,
    description: 'The service is alive',
  })
  @ApiResponse({
    status: 503,
    description: 'The service is not alive and should be restarted',
  })
  live() {
    // Very lightweight - just returns ok if the process is running
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

