/**
 * Configuration Controller
 * Provides endpoints for managing Zconfig.json
 * Based on legacy v1 config.js
 */
import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from './config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  UpdateConfigRequestDTO,
  UpdateConfigRequestDTOSchema,
  UpdateDdsRequestDTO,
  UpdateDdsRequestDTOSchema,
  DeleteDdsRequestDTO,
  DeleteDdsRequestDTOSchema,
} from '@zebra/shared/dtos';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

@ApiTags('config')
@Controller('api/v2/config')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Get full configuration
   */
  @Get()
  @ApiOperation({ summary: 'Get full Zconfig' })
  @ApiResponse({ status: 200, description: 'Configuration retrieved successfully' })
  getConfig() {
    return {
      success: true,
      message: 'Configuration retrieved successfully',
      data: this.configService.getConfig(),
    };
  }

  /**
   * Get list of configured LPARs
   */
  @Get('lpars')
  @ApiOperation({ summary: 'Get all configured LPARs' })
  @ApiResponse({ status: 200, description: 'LPARs retrieved successfully' })
  getLpars() {
    return {
      success: true,
      message: 'LPARs retrieved successfully',
      data: this.configService.getLpars(),
    };
  }

  /**
   * Get specific LPAR configuration
   */
  @Get('lpars/:lpar')
  @ApiOperation({ summary: 'Get LPAR configuration' })
  @ApiResponse({ status: 200, description: 'LPAR configuration retrieved successfully' })
  @ApiResponse({ status: 404, description: 'LPAR not found' })
  getLparConfig(@Param('lpar') lpar: string) {
    try {
      return {
        success: true,
        message: `LPAR ${lpar} configuration retrieved successfully`,
        data: this.configService.getLparConfig(lpar),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'LPAR not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Update general configuration
   * Endpoint: PUT /api/v2/config
   * Legacy equivalent: /addSettings, /updateconfig
   */
  @Put()
  @ApiOperation({ summary: 'Update general Zconfig settings' })
  @ApiResponse({ status: 200, description: 'Configuration updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid configuration' })
  async updateConfig(
    @Body(new ZodValidationPipe(UpdateConfigRequestDTOSchema))
    dto: UpdateConfigRequestDTO,
  ) {
    try {
      await this.configService.updateConfig(dto as any);
      return {
        success: true,
        message: 'Configuration updated successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to update configuration',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Update LPAR (DDS) configuration
   * Endpoint: PUT /api/v2/config/lpars/:lpar
   * Legacy equivalent: /updatedds
   */
  @Put('lpars/:lpar')
  @ApiOperation({ summary: 'Update LPAR configuration' })
  @ApiResponse({ status: 200, description: 'LPAR configuration updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid configuration' })
  async updateLparConfig(
    @Param('lpar') lpar: string,
    @Body(new ZodValidationPipe(UpdateDdsRequestDTOSchema))
    dto: UpdateDdsRequestDTO,
  ) {
    try {
      await this.configService.updateLparConfig(lpar, dto as any);
      return {
        success: true,
        message: `LPAR ${lpar} configuration updated successfully`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to update LPAR configuration',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Save/replace entire LPAR configuration
   * Endpoint: POST /api/v2/config/lpars/:lpar
   * Legacy equivalent: /savedds
   */
  @Post('lpars/:lpar')
  @ApiOperation({ summary: 'Save/replace entire LPAR configuration' })
  @ApiResponse({ status: 200, description: 'LPAR configuration saved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid configuration' })
  async saveLparConfig(
    @Param('lpar') lpar: string,
    @Body(new ZodValidationPipe(UpdateDdsRequestDTOSchema))
    dto: UpdateDdsRequestDTO,
  ) {
    try {
      await this.configService.saveLparConfig(lpar, dto as any);
      return {
        success: true,
        message: `LPAR ${lpar} configuration saved successfully`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to save LPAR configuration',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Delete LPAR configuration
   * Endpoint: DELETE /api/v2/config/lpars/:lpar
   * Legacy equivalent: /deletedds
   */
  @Delete('lpars/:lpar')
  @ApiOperation({ summary: 'Delete LPAR configuration' })
  @ApiResponse({ status: 200, description: 'LPAR configuration deleted successfully' })
  @ApiResponse({ status: 400, description: 'Failed to delete LPAR' })
  async deleteLparConfig(@Param('lpar') lpar: string) {
    try {
      await this.configService.deleteLparConfig(lpar);
      return {
        success: true,
        message: `LPAR ${lpar} configuration deleted successfully`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to delete LPAR configuration',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Create new Zconfig file (utility endpoint)
   * Endpoint: POST /api/v2/config/create
   * Legacy equivalent: /createZconfig
   */
  @Post('create')
  @ApiOperation({ summary: 'Create new Zconfig file with defaults' })
  @ApiResponse({ status: 200, description: 'Zconfig created successfully' })
  async createConfig() {
    const defaultConfig = {
      mongourl: 'localhost',
      dbinterval: 100,
      dbname: 'Zebrav2',
      appurl: 'localhost',
      appport: 3090,
      mongoport: 27017,
      ppminutesInterval: 30,
      rmf3interval: 100,
      zebra_httptype: 'http' as const,
      useDbAuth: 'true' as const,
      dbUser: 'admin',
      dbPassword: 'password',
      authSource: 'admin',
      use_cert: 'false' as const,
      grafanaurl: 'localhost',
      grafanaport: 3000,
      grafanahttptype: 'http' as const,
      dds: {},
      apiml_IP: 'localhost',
      apiml_http_type: 'https' as const,
      apiml_password: 'password',
      apiml_username: 'username',
      apiml_port: 10010,
      apiml_auth_type: 'bypass' as const,
    };

    try {
      await this.configService.updateConfig(defaultConfig);
      return {
        success: true,
        message: 'Zconfig file created successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to create Zconfig',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

