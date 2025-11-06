/**
 * DCOL Controller
 * REST endpoints for DCOL data collection metrics
 */
import { Controller, Post, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { DCOLService } from './dcol.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import type { DCOLQueryRequestDTO, DCOLQueryResponseDTO } from '@zebra/shared/dtos';
import { dcolQueryRequestSchema } from '@zebra/shared/dtos';

@ApiTags('DCOL')
@Controller('dcol')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class DCOLController {
  constructor(private readonly dcolService: DCOLService) {}

  @Post(':lpar/query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Query DCOL data',
    description: 'Query data collection metrics from MySQL',
  })
  @ApiParam({
    name: 'lpar',
    description: 'LPAR name',
    example: 'LPAR1',
  })
  @ApiResponse({
    status: 200,
    description: 'Data retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'LPAR or DCOL configuration not found',
  })
  async queryData(
    @Param('lpar') lpar: string,
    @Body(new ZodValidationPipe(dcolQueryRequestSchema)) request: DCOLQueryRequestDTO,
  ): Promise<DCOLQueryResponseDTO> {
    return this.dcolService.queryData(lpar, request);
  }
}

