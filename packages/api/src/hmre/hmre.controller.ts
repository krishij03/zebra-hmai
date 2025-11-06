/**
 * HMRE Controller
 * REST endpoints for HMRE data
 */
import { Controller, Post, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { HMREService } from './hmre.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import type { HMREQueryRequestDTO, HMREQueryResponseDTO } from '@zebra/shared/dtos';
import { hmreQueryRequestSchema } from '@zebra/shared/dtos';

@ApiTags('HMRE')
@Controller('hmre')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class HMREController {
  constructor(private readonly hmreService: HMREService) {}

  @Post(':lpar/query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Query HMRE data',
    description: 'Query health monitoring and reporting enhancements data from MySQL',
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
    description: 'LPAR or HMRE configuration not found',
  })
  async queryData(
    @Param('lpar') lpar: string,
    @Body(new ZodValidationPipe(hmreQueryRequestSchema)) request: HMREQueryRequestDTO,
  ): Promise<HMREQueryResponseDTO> {
    return this.hmreService.queryData(lpar, request);
  }
}

