/**
 * Metrics Controller
 * Prometheus metrics endpoints
 */
import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import type {
  MetricsConfigDTO,
  PrometheusScrapeStatusDTO,
  UpdateMetricsConfigRequestDTO,
  UpdateMetricsConfigResponseDTO,
  MetricDefinitionDTO,
  CreateMetricRequestDTO,
  UpdateMetricRequestDTO,
  MetricResponseDTO,
} from '@zebra/shared/dtos';
import {
  updateMetricsConfigRequestSchema,
  createMetricRequestSchema,
  updateMetricRequestSchema,
} from '@zebra/shared/dtos';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get Prometheus metrics',
    description: 'Returns metrics in Prometheus text format for scraping',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics in Prometheus format',
    content: {
      'text/plain': {
        example: '# HELP process_cpu_seconds_total Total user and system CPU time spent in seconds.\n# TYPE process_cpu_seconds_total counter\nprocess_cpu_seconds_total 0.25\n',
      },
    },
  })
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }

  @Get('config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get metrics configuration',
    description: 'Returns the current metrics.json configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Current metrics configuration',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  getConfig(): MetricsConfigDTO {
    return this.metricsService.getConfig();
  }

  @Put('config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update metrics configuration',
    description: 'Update or replace the metrics.json configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid configuration',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async updateConfig(
    @Body(new ZodValidationPipe(updateMetricsConfigRequestSchema)) request: UpdateMetricsConfigRequestDTO,
  ): Promise<UpdateMetricsConfigResponseDTO> {
    return this.metricsService.updateConfig(request);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get Prometheus scraping status',
    description: 'Returns information about the metrics scraping process',
  })
  @ApiResponse({
    status: 200,
    description: 'Scraping status',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  getStatus(): PrometheusScrapeStatusDTO {
    return this.metricsService.getStatus();
  }

  /**
   * Get a single metric by name
   * Legacy v1 endpoint: GET /:metric
   */
  @Get(':metric')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get a specific metric definition',
    description: 'Returns the configuration for a single metric',
  })
  @ApiResponse({
    status: 200,
    description: 'Metric retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Metric not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  getOneMetric(@Param('metric') metricName: string): MetricResponseDTO {
    const metric = this.metricsService.getMetric(metricName);
    
    if (!metric) {
      throw new NotFoundException({
        success: false,
        message: `Metric '${metricName}' not found`,
        error: true,
      });
    }

    return {
      success: true,
      message: `Metric '${metricName}' successfully retrieved`,
      data: metric,
      error: false,
    };
  }

  /**
   * Create a new metric
   * Legacy v1 endpoint: POST /:metric
   */
  @Post(':metric')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new metric',
    description: 'Adds a new metric to the metrics.json configuration',
  })
  @ApiResponse({
    status: 201,
    description: 'Metric created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid metric configuration',
  })
  @ApiResponse({
    status: 409,
    description: 'Metric already exists',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async createMetric(
    @Param('metric') metricName: string,
    @Body(new ZodValidationPipe(createMetricRequestSchema)) dto: CreateMetricRequestDTO,
  ): Promise<MetricResponseDTO> {
    try {
      await this.metricsService.createMetric(metricName, dto);
      
      return {
        success: true,
        message: `Metric '${metricName}' was successfully created`,
        error: false,
      };
    } catch (error) {
      if (error.message.includes('already exists')) {
        throw new ConflictException({
          success: false,
          message: error.message,
          error: true,
        });
      }
      
      throw new BadRequestException({
        success: false,
        message: error.message || 'Failed to create metric',
        error: true,
      });
    }
  }

  /**
   * Update an existing metric
   * Legacy v1 endpoint: PUT /:metric
   */
  @Put(':metric')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update an existing metric',
    description: 'Updates the configuration for an existing metric',
  })
  @ApiResponse({
    status: 200,
    description: 'Metric updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid metric configuration',
  })
  @ApiResponse({
    status: 404,
    description: 'Metric not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async updateOneMetric(
    @Param('metric') metricName: string,
    @Body(new ZodValidationPipe(updateMetricRequestSchema)) dto: UpdateMetricRequestDTO,
  ): Promise<MetricResponseDTO> {
    try {
      await this.metricsService.updateMetric(metricName, dto);
      
      return {
        success: true,
        message: `Metric '${metricName}' was successfully updated`,
        error: false,
      };
    } catch (error) {
      if (error.message.includes('does not exist')) {
        throw new NotFoundException({
          success: false,
          message: error.message,
          error: true,
        });
      }
      
      throw new BadRequestException({
        success: false,
        message: error.message || 'Failed to update metric',
        error: true,
      });
    }
  }

  /**
   * Delete a metric
   * Legacy v1 endpoint: DELETE /:metric
   */
  @Delete(':metric')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a metric',
    description: 'Removes a metric from the metrics.json configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Metric deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Metric not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async deleteMetric(@Param('metric') metricName: string): Promise<MetricResponseDTO> {
    try {
      await this.metricsService.deleteMetric(metricName);
      
      return {
        success: true,
        message: `Metric '${metricName}' was successfully deleted`,
        error: false,
      };
    } catch (error) {
      if (error.message.includes('does not exist')) {
        throw new NotFoundException({
          success: false,
          message: error.message,
          error: true,
        });
      }
      
      throw new BadRequestException({
        success: false,
        message: error.message || 'Failed to delete metric',
        error: true,
      });
    }
  }
}

