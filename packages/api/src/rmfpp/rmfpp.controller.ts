/**
 * RMF Post Processor Controller
 * REST endpoints for historical RMF metrics
 */
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { RMFPPService } from './rmfpp.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RMFPostProcessorResponseDTO } from '@zebra/shared/dtos';

@ApiTags('RMF Post Processor')
@Controller('rmfpp')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class RMFPPController {
  constructor(private readonly rmfppService: RMFPPService) {}

  @Get(':lpar/:report')
  @ApiOperation({
    summary: 'Get RMF Post Processor report',
    description: `Fetch historical RMF Post Processor metrics for a specific LPAR and report type.
    
Available report types:
- CACHE: Cache subsystem activity
- CHAN: Channel activity
- CPU: CPU utilization
- CRYPTO: Cryptographic activity
- DEVICE: Device activity
- EADM: Extended Address Mode statistics
- HFS: Hierarchical File System
- IOQ: I/O queuing activity
- OMVS: UNIX System Services
- PAGESP: Page space usage
- PAGING: Paging activity
- SDELAY: Service delays
- VSTOR: Virtual storage usage
- XCF: Cross-system coupling facility
- CF: Coupling facility
- WLMGL: Workload Manager goals`,
  })
  @ApiParam({
    name: 'lpar',
    description: 'LPAR name as configured in Zconfig.json',
    example: 'LPAR1',
  })
  @ApiParam({
    name: 'report',
    description: 'RMF Post Processor report type',
    example: 'CPU',
    enum: [
      'CACHE',
      'CHAN',
      'CPU',
      'CRYPTO',
      'DEVICE',
      'EADM',
      'HFS',
      'IOQ',
      'OMVS',
      'PAGESP',
      'PAGING',
      'SDELAY',
      'VSTOR',
      'XCF',
      'CF',
      'WLMGL',
    ],
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for historical data (ISO 8601 format)',
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for historical data (ISO 8601 format)',
    example: '2024-01-31T23:59:59Z',
  })
  @ApiResponse({
    status: 200,
    description: 'RMF Post Processor report retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'LPAR or report not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getReport(
    @Param('lpar') lpar: string,
    @Param('report') report: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query() additionalParams?: Record<string, string>,
  ): Promise<RMFPostProcessorResponseDTO> {
    const dateRange =
      startDate || endDate
        ? {
            start: startDate,
            end: endDate,
          }
        : undefined;

    // Filter out the startDate and endDate from additionalParams
    const { startDate: _, endDate: __, ...otherParams } = additionalParams || {};

    return this.rmfppService.getReport(lpar, report, dateRange, otherParams);
  }
}

