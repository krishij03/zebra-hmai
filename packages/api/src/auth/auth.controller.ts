/**
 * Authentication Controller
 * REST endpoints for user authentication
 */
import { Controller, Post, Get, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import {
  type LoginRequestDTO,
  type LoginResponseDTO,
  type TokenRefreshRequestDTO,
  type TokenRefreshResponseDTO,
  type PasswordChangeRequestDTO,
  type PasswordChangeResponseDTO,
  loginRequestSchema,
  tokenRefreshRequestSchema,
  passwordChangeRequestSchema,
} from '@zebra/shared/dtos';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user and return JWT access and refresh tokens',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or default password needs to be changed',
  })
  async login(
    @Body(new ZodValidationPipe(loginRequestSchema)) credentials: LoginRequestDTO,
  ): Promise<LoginResponseDTO> {
    return this.authService.login(credentials);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Get a new access token using a valid refresh token',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  async refreshToken(
    @Body(new ZodValidationPipe(tokenRefreshRequestSchema)) request: TokenRefreshRequestDTO,
  ): Promise<TokenRefreshResponseDTO> {
    return this.authService.refreshToken(request);
  }

  @Post('password/change')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change password',
    description: 'Change the current user password (requires authentication)',
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or passwords do not match',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async changePassword(
    @Request() req: { user: { name: string } },
    @Body(new ZodValidationPipe(passwordChangeRequestSchema)) request: PasswordChangeRequestDTO,
  ): Promise<PasswordChangeResponseDTO> {
    return this.authService.changePassword(req.user.name, request);
  }

  /**
   * Get current user profile
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Returns the currently authenticated user profile',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Admin' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async getProfile(@Request() req: { user: { name: string } }) {
    return {
      name: req.user.name,
    };
  }
}

