/**
 * Authentication Service
 * Handles user authentication, JWT token generation, and password management
 */
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoggerService } from '../logger/logger.service';
import * as bcrypt from 'bcryptjs';
import * as sqlite3 from 'sqlite3';
import { promisify } from 'node:util';
import type {
  LoginRequestDTO,
  LoginResponseDTO,
  TokenRefreshRequestDTO,
  TokenRefreshResponseDTO,
  PasswordChangeRequestDTO,
  PasswordChangeResponseDTO,
  UserInfoResponseDTO,
} from '@zebra/shared/dtos';

interface AdminUser {
  id: number;
  name: string;
  password: string;
  refreshToken: string | null;
  accessToken: string | null;
}

@Injectable()
export class AuthService implements OnModuleInit, OnModuleDestroy {
  private db: sqlite3.Database;
  private dbGet: (sql: string, params?: unknown) => Promise<AdminUser | undefined>;
  private dbRun: (sql: string, params?: unknown) => Promise<void>;

  constructor(
    private readonly jwtService: JwtService,
    private readonly logger: LoggerService,
  ) {
    // Initialize SQLite database connection
    const dbPath = process.env.ADMIN_DB_PATH || './admin.db';
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        this.logger.error(`Failed to connect to admin database: ${err.message}`, err.stack, 'AuthService');
        throw new InternalServerErrorException('Database connection failed');
      }
      this.logger.log(`Connected to admin database at ${dbPath}`, 'AuthService');
    });

    // Promisify database methods
    this.dbGet = promisify(this.db.get.bind(this.db)) as (sql: string, params?: unknown) => Promise<AdminUser | undefined>;
    this.dbRun = promisify(this.db.run.bind(this.db)) as (sql: string, params?: unknown) => Promise<void>;
  }

  async onModuleInit() {
    // Ensure admin table exists
    await this.initializeDatabase();
  }

  async onModuleDestroy() {
    // Close database connection
    return new Promise<void>((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          this.logger.error('Error closing database', err.stack, 'AuthService');
          reject(err);
        } else {
          this.logger.log('Database connection closed', 'AuthService');
          resolve();
        }
      });
    });
  }

  /**
   * Initialize database schema
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await this.dbRun(`
        CREATE TABLE IF NOT EXISTS adm (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          password TEXT NOT NULL,
          refreshToken TEXT,
          accessToken TEXT
        )
      `);

      // Check if default admin user exists
      const adminUser = await this.dbGet('SELECT * FROM adm WHERE id = ?', 1);
      
      if (!adminUser) {
        // Create default admin user (Admin/Admin)
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync('Admin', salt);
        
        await this.dbRun(
          'INSERT INTO adm (id, name, password, refreshToken, accessToken) VALUES (?, ?, ?, NULL, NULL)',
          [1, 'Admin', hashedPassword],
        );
        
        this.logger.log('✅ Default admin credentials created → Username: Admin | Password: Admin', 'AuthService');
      }
    } catch (error) {
      this.logger.error('Database initialization failed', error.stack, 'AuthService');
      throw new InternalServerErrorException('Failed to initialize database');
    }
  }

  /**
   * Authenticate user and generate tokens
   */
  async login(credentials: LoginRequestDTO): Promise<LoginResponseDTO> {
    try {
      const user = await this.dbGet('SELECT * FROM adm WHERE id = ?', 1);

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Verify username
      if (user.name !== credentials.name) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = bcrypt.compareSync(credentials.password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Generate tokens
      const { accessToken, refreshToken } = await this.generateTokens(user.name);

      // Update tokens in database
      await this.updateTokens(refreshToken, accessToken);

      this.logger.log(`User ${user.name} logged in successfully`, 'AuthService');

      return {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: 900, // 15 minutes
        user: {
          name: user.name,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Login failed', error.stack, 'AuthService');
      throw new InternalServerErrorException('Login failed');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(request: TokenRefreshRequestDTO): Promise<TokenRefreshResponseDTO> {
    try {
      const user = await this.dbGet('SELECT * FROM adm WHERE id = ?', 1);

      if (!user || user.refreshToken !== request.token) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify refresh token
      const payload = this.jwtService.verify(request.token, {
        secret: process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-change-me',
      });

      // Generate new access token
      const accessToken = this.generateAccessToken(payload.name);

      // Update access token in database
      await this.dbRun('UPDATE adm SET accessToken = ? WHERE id = ?', [accessToken, 1]);

      this.logger.log(`Access token refreshed for user ${payload.name}`, 'AuthService');

      return {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: 900,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Token refresh failed', error.stack, 'AuthService');
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    username: string,
    request: PasswordChangeRequestDTO,
  ): Promise<PasswordChangeResponseDTO> {
    try {
      const user = await this.dbGet('SELECT * FROM adm WHERE id = ?', 1);

      if (!user || user.name !== username) {
        throw new UnauthorizedException('User not found');
      }

      // Verify old password
      const isOldPasswordValid = bcrypt.compareSync(request.oldPassword, user.password);
      if (!isOldPasswordValid) {
        throw new BadRequestException('Current password is incorrect');
      }

      // Verify new passwords match
      if (request.newPassword !== request.confirmPassword) {
        throw new BadRequestException('New passwords do not match');
      }

      // Hash new password
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(request.newPassword, salt);

      // Generate new tokens
      const { accessToken, refreshToken } = await this.generateTokens(user.name);

      // Update password and tokens
      await this.dbRun(
        'UPDATE adm SET password = ?, refreshToken = ?, accessToken = ? WHERE id = ?',
        [hashedPassword, refreshToken, accessToken, 1],
      );

      this.logger.log(`Password changed successfully for user ${user.name}`, 'AuthService');

      return {
        success: true,
        message: 'Password changed successfully',
        tokens: {
          accessToken,
          refreshToken,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Password change failed', error.stack, 'AuthService');
      throw new InternalServerErrorException('Failed to change password');
    }
  }

  /**
   * Get current user info
   */
  async getUserInfo(username: string): Promise<UserInfoResponseDTO> {
    try {
      const user = await this.dbGet('SELECT * FROM adm WHERE id = ?', 1);

      if (!user || user.name !== username) {
        throw new UnauthorizedException('User not found');
      }

      const isDefaultPassword = bcrypt.compareSync('Admin', user.password);

      return {
        name: user.name,
        isDefaultPassword,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Failed to get user info', error.stack, 'AuthService');
      throw new InternalServerErrorException('Failed to get user information');
    }
  }

  /**
   * Validate user by username (used by JWT strategy)
   */
  async validateUser(username: string): Promise<{ name: string } | null> {
    try {
      const user = await this.dbGet('SELECT name FROM adm WHERE id = ? AND name = ?', [1, username]);
      return user ? { name: user.name } : null;
    } catch (error) {
      this.logger.error('User validation failed', error.stack, 'AuthService');
      return null;
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(username: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { name: username };

    const accessToken = this.generateAccessToken(username);
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-change-me',
      expiresIn: '7d', // Refresh token expires in 7 days
    });

    return { accessToken, refreshToken };
  }

  /**
   * Generate access token
   */
  private generateAccessToken(username: string): string {
    const payload = { name: username };
    return this.jwtService.sign(payload);
  }

  /**
   * Update tokens in database
   */
  private async updateTokens(refreshToken: string, accessToken: string): Promise<void> {
    await this.dbRun('UPDATE adm SET refreshToken = ?, accessToken = ? WHERE id = ?', [
      refreshToken,
      accessToken,
      1,
    ]);
  }
}

