/**
 * RMF Monitor III Controller
 * REST endpoints for real-time RMF metrics
 */
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { RMF3Service } from './rmf3.service';
import { ConfigService } from '../config/config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RMFMonitor3ResponseDTO } from '@zebra/shared/dtos';

@ApiTags('RMF Monitor III')
@Controller('rmf3')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class RMF3Controller {
  constructor(
    private readonly rmf3Service: RMF3Service,
    private readonly configService: ConfigService,
  ) {}

  @Get('lpars')
  @ApiOperation({
    summary: 'Get list of available LPARs',
    description: 'Returns a list of all LPARs configured in Zconfig.json',
  })
  @ApiResponse({
    status: 200,
    description: 'List of LPAR names',
    type: [String],
  })
  getLpars(): string[] {
    return this.configService.getLpars();
  }

  @Get('report-types')
  @ApiOperation({
    summary: 'Get list of available report types',
    description: 'Returns a list of all supported RMF Monitor III report types',
  })
  @ApiResponse({
    status: 200,
    description: 'List of report types',
    type: [String],
  })
  getReportTypes(): string[] {
    return [
      'CHANNEL',
      'CPC',
      'DELAY',
      'DEV',
      'DEVR',
      'DSND',
      'EADM',
      'ENCLAVE',
      'ENQ',
      'HSM',
      'JES',
      'OPD',
      'PROC',
      'PROCU',
      'STOR',
      'STORC',
      'STORCR',
      'STORM',
      'SYSINFO',
      'USAGE',
      'SYSSUM',
    ];
  }

  @Get(':lpar/:report')
  @ApiOperation({
    summary: 'Get RMF Monitor III report',
    description: `Fetch real-time RMF Monitor III metrics for a specific LPAR and report type.
    
Available report types:
- CHANNEL: Channel activity and performance
- CPC: Central Processor Complex metrics
- DELAY: System delays and contention
- DEV: Device activity
- DEVR: Device response times
- DSND: Db2 subsystem data
- EADM: Extended Address Mode statistics
- ENCLAVE: Enclave workload data
- ENQ: Resource contention (ENQ)
- HSM: Hierarchical Storage Manager
- JES: Job Entry Subsystem
- OPD: Operations data
- PROC: Processor utilization
- PROCU: Processor utilization by address space
- STOR: Storage usage
- STORC: Storage class memory
- STORCR: Storage class memory rates
- STORM: Storage memory pools
- SYSINFO: System information
- USAGE: Resource usage summary
- SYSSUM: System summary`,
  })
  @ApiParam({
    name: 'lpar',
    description: 'LPAR name as configured in Zconfig.json',
    example: 'LPAR1',
  })
  @ApiParam({
    name: 'report',
    description: 'RMF Monitor III report type',
    example: 'CPC',
    enum: [
      'CHANNEL',
      'CPC',
      'DELAY',
      'DEV',
      'DEVR',
      'DSND',
      'EADM',
      'ENCLAVE',
      'ENQ',
      'HSM',
      'JES',
      'OPD',
      'PROC',
      'PROCU',
      'STOR',
      'STORC',
      'STORCR',
      'STORM',
      'SYSINFO',
      'USAGE',
      'SYSSUM',
    ],
  })
  @ApiQuery({
    name: 'resource',
    required: false,
    description: 'Resource filter (e.g., ",LPAR1,MVS_IMAGE")',
    example: ',LPAR1,MVS_IMAGE',
  })
  @ApiQuery({
    name: 'id',
    required: false,
    description: 'Field ID for specific metric filtering',
    example: 'CPU',
  })
  @ApiResponse({
    status: 200,
    description: 'RMF Monitor III report retrieved successfully',
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
    @Query() params: Record<string, string>,
  ): Promise<RMFMonitor3ResponseDTO> {
    return this.rmf3Service.getReport(lpar, report, params);
  }
}
