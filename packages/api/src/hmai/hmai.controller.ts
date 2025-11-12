/**
 * HMAI Controller
 * REST endpoints for HMAI data ingestion and query
 */
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HMAIService } from './hmai.service';
import { HMAIIngestionService } from './hmai-ingestion.service';
import type { 
  HMAIStartIngestionRequestDTO,
  HMAIStartIngestionResponseDTO,
  HMAIIngestionStatusRequestDTO,
  HMAIIngestionStatusResponseDTO,
  HMAIQueryRequestDTO,
  HMAIQueryResponseDTO,
} from '@zebra/shared/dtos';

@ApiTags('HMAI')
@Controller('hmai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class HMAIController {
  constructor(
    private readonly hmaiService: HMAIService,
    private readonly ingestionService: HMAIIngestionService,
  ) {}

  @Get('metrics')
  @ApiOperation({
    summary: 'Get list of available HMAI metrics',
    description: 'Returns a list of all supported HMAI metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'List of metric names',
    type: [String],
  })
  getMetrics(): string[] {
    return ['clpr', 'ldev', 'mpb', 'mprank20', 'pgrp', 'port'];
  }

  @Post(':lpar/ingestion/start')
  @ApiOperation({
    summary: 'Start HMAI ingestion job',
    description: 'Start a background job to ingest HMAI data from FTP into MySQL',
  })
  @ApiParam({
    name: 'lpar',
    description: 'LPAR name',
    example: 'LPAR1',
  })
  @ApiBody({
    type: Object,
    description: 'Ingestion parameters',
    schema: {
      type: 'object',
      required: ['metrics', 'startDate'],
      properties: {
        metrics: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of metrics to ingest (clpr, ldev, mpb, mprank20, pgrp, port)',
          example: ['clpr', 'ldev'],
        },
        startDate: {
          type: 'string',
          format: 'date',
          description: 'Start date for data ingestion (YYYY-MM-DD)',
          example: '2024-01-01',
        },
        endDate: {
          type: 'string',
          format: 'date',
          description: 'End date for data ingestion (YYYY-MM-DD). If not provided, uses current date.',
          example: '2024-01-31',
        },
        continuousMonitoring: {
          type: 'boolean',
          description: 'If true, continuously monitor for new data',
          example: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Ingestion job started successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid parameters or job already running',
  })
  async startIngestion(
    @Param('lpar') lpar: string,
    @Body() body: Omit<HMAIStartIngestionRequestDTO, 'lpar'>,
  ): Promise<HMAIStartIngestionResponseDTO> {
    return this.ingestionService.startIngestion({
      ...body,
      lpar,
    });
  }

  @Post(':lpar/ingestion/stop')
  @ApiOperation({
    summary: 'Stop HMAI ingestion job',
    description: 'Stop the currently running HMAI ingestion job for the specified LPAR',
  })
  @ApiParam({
    name: 'lpar',
    description: 'LPAR name',
    example: 'LPAR1',
  })
  @ApiResponse({
    status: 200,
    description: 'Ingestion job stopped successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'No running job found',
  })
  async stopIngestion(@Param('lpar') lpar: string) {
    return this.ingestionService.stopIngestion(lpar);
  }

  @Get(':lpar/ingestion/status')
  @ApiOperation({
    summary: 'Get HMAI ingestion job status',
    description: 'Get the current status of the HMAI ingestion job for the specified LPAR',
  })
  @ApiParam({
    name: 'lpar',
    description: 'LPAR name',
    example: 'LPAR1',
  })
  @ApiResponse({
    status: 200,
    description: 'Job status retrieved successfully',
    type: Object,
  })
  async getIngestionStatus(@Param('lpar') lpar: string): Promise<HMAIIngestionStatusResponseDTO> {
    return this.ingestionService.getStatus({
      lpar,
      includeDetails: true,
    });
  }

  @Get(':lpar/:metric')
  @ApiOperation({
    summary: 'Query HMAI data',
    description: 'Query HMAI data for a specific LPAR and metric',
  })
  @ApiParam({
    name: 'lpar',
    description: 'LPAR name',
    example: 'LPAR1',
  })
  @ApiParam({
    name: 'metric',
    description: 'Metric name',
    enum: ['clpr', 'ldev', 'mpb', 'mprank20', 'pgrp', 'port'],
    example: 'clpr',
  })
  @ApiResponse({
    status: 200,
    description: 'Data retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'LPAR or metric not found',
  })
  async queryData(
    @Param('lpar') lpar: string,
    @Param('metric') metric: string,
    @Query() query: Omit<HMAIQueryRequestDTO, 'metric'>,
  ): Promise<HMAIQueryResponseDTO> {
    return this.hmaiService.queryData(lpar, {
      ...query,
      metric: metric as 'clpr' | 'ldev' | 'mpb' | 'mprank20' | 'pgrp' | 'port',
    });
  }

  @Post(':lpar/clear-database')
  @ApiOperation({
    summary: 'Clear HMAI database and memory',
    description: 'Truncate all HMAI tables and clear memory files for the specified LPAR',
  })
  @ApiParam({
    name: 'lpar',
    description: 'LPAR name',
    example: 'LPAR1',
  })
  @ApiResponse({
    status: 200,
    description: 'Database and memory cleared successfully',
  })
  async clearDatabase(@Param('lpar') lpar: string) {
    return this.ingestionService.clearDatabase(lpar);
  }

  @Post('ingestion/start-all')
  @ApiOperation({
    summary: 'Start HMAI ingestion for all configured LPARs',
    description: 'Start HMAI data ingestion for all LPARs that have complete HMAI configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'HMAI started for configured LPARs',
  })
  async startAllLpars() {
    return this.ingestionService.startAllLpars();
  }

  @Get('running-processes')
  @ApiOperation({
    summary: 'Get running HMAI processes',
    description: 'Get list of all LPARs with currently running HMAI ingestion jobs',
  })
  @ApiResponse({
    status: 200,
    description: 'Running processes retrieved',
    type: Object,
  })
  async getRunningProcesses() {
    return this.ingestionService.getRunningProcesses();
  }
}
