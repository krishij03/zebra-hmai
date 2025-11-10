/**
 * RMF Post Processor Service
 * Fetches and parses historical RMF metrics from DDS
 */
import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '../config/config.service';
import { LoggerService } from '../logger/logger.service';
import { XMLParser } from 'fast-xml-parser';
import { firstValueFrom } from 'rxjs';
import type { RMFPostProcessorResponseDTO } from '@zebra/shared/dtos';

interface RMFPPParams {
  reports: string;
  date?: string;
  resource?: string;
  [key: string]: string | undefined;
}

interface DDSMLReport {
  ddsml?: {
    report?: Array<{
      'time-data'?: Array<{
        'display-start'?: Array<{ _?: string }>;
        'display-end'?: Array<{ _?: string }>;
      }>;
      'column-headers'?: Array<{
        col?: Array<{ _?: string }>;
      }>;
      metric?: Array<{
        description?: Array<string>;
      }>;
      caption?: Array<{
        var?: Array<{
          name?: Array<string>;
          value?: Array<string>;
        }>;
      }>;
      row?: Array<{
        col?: Array<string>;
      }>;
    }>;
  };
}

@Injectable()
export class RMFPPService {
  private readonly parser: XMLParser;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    // Initialize fast-xml-parser
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '_',
      parseAttributeValue: false,
      trimValues: true,
    });
  }

  /**
   * Fetch RMF Post Processor report for a specific LPAR
   */
  async getReport(
    lpar: string,
    report: string,
    dateRange?: { start?: string; end?: string },
    params?: Record<string, string>,
  ): Promise<RMFPostProcessorResponseDTO> {
    // Validate LPAR exists
    const lparConfig = this.config.getLparConfig(lpar);
    if (!lparConfig) {
      throw new NotFoundException(`LPAR '${lpar}' not found in configuration`);
    }

    // Build DDS URL
    const baseUrl = this.buildDDSUrl(lparConfig);
    const rmfppFilename = lparConfig.rmfppfilename || 'rmfpp.xml';

    // Build query parameters
    const queryParams: RMFPPParams = {
      reports: report,
      ...params,
    };

    // Add date range if provided
    if (dateRange?.start || dateRange?.end) {
      const startDate = dateRange.start ? this.formatDate(dateRange.start) : '';
      const endDate = dateRange.end ? this.formatDate(dateRange.end) : '';
      queryParams.date = `${startDate},${endDate}`;
    }

    const fullUrl = this.buildRequestUrl(baseUrl, rmfppFilename, queryParams);

    try {
      this.logger.log(`Fetching RMFPP report: ${report} for LPAR: ${lpar}`, 'RMFPPService');

      // Make HTTP request
      const response = await firstValueFrom(
        this.http.get(fullUrl, {
          auth:
            lparConfig.ddsauth === 'true'
              ? {
                  username: lparConfig.ddsuser || '',
                  password: lparConfig.ddspwd || '',
                }
              : undefined,
          headers: {
            Accept: 'application/xml, text/xml',
          },
        }),
      );

      // Parse XML response
      const parsedData = this.parseXML(response.data);

      // Add metadata
      const result: RMFPostProcessorResponseDTO = {
        ...parsedData,
        metadata: {
          lpar,
          report,
          fetchedAt: new Date().toISOString(),
        },
      };

      this.logger.log(`Successfully fetched RMFPP report: ${report} for LPAR: ${lpar}`, 'RMFPPService');

      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch RMFPP report: ${report} for LPAR: ${lpar}`, error.stack, 'RMFPPService');

      if (error.response?.status === 404) {
        throw new NotFoundException(`RMFPP report '${report}' not found for LPAR '${lpar}'`);
      }

      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new BadRequestException('Authentication failed for DDS server');
      }

      throw new InternalServerErrorException(`Failed to fetch RMFPP data: ${error.message}`);
    }
  }

  /**
   * Parse XML response from DDS
   */
  private parseXML(xml: string): Omit<RMFPostProcessorResponseDTO, 'metadata'> {
    try {
      const result: DDSMLReport = this.parser.parse(xml);

      if (!result?.ddsml?.report?.[0]) {
        throw new Error('Invalid XML structure: missing ddsml.report');
      }

      const report = result.ddsml.report[0];

      // Extract basic information
      const timestart = report['time-data']?.[0]?.['display-start']?.[0]?._ || '';
      const timeend = report['time-data']?.[0]?.['display-end']?.[0]?._ || '';
      const title = report.metric?.[0]?.description?.[0] || 'RMF Post Processor Report';

      // Extract column headers
      const columnHeaders = report['column-headers']?.[0]?.col || [];
      const columnhead = columnHeaders.map((col) => (typeof col === 'object' && col._ ? col._ : String(col)));

      // Extract caption (optional)
      let caption: Record<string, string> | undefined;
      if (report.caption?.[0]?.var) {
        caption = {};
        for (const v of report.caption[0].var) {
          const name = v.name?.[0];
          const value = v.value?.[0];
          if (name && value) {
            caption[name] = value;
          }
        }
      }

      // Extract table data
      const table: Array<Record<string, string>> = [];
      if (report.row) {
        for (const row of report.row) {
          if (row.col) {
            const rowData: Record<string, string> = {};
            for (let i = 0; i < columnhead.length && i < row.col.length; i++) {
              rowData[columnhead[i]] = row.col[i];
            }
            table.push(rowData);
          }
        }
      }

      return {
        title,
        timestart,
        timeend,
        columnhead,
        caption,
        table,
      };
    } catch (error) {
      this.logger.error('XML parsing failed', error.stack, 'RMFPPService');
      throw new InternalServerErrorException('Failed to parse RMFPP XML response');
    }
  }

  /**
   * Build DDS base URL
   */
  private buildDDSUrl(lparConfig: any): string {
    const protocol = lparConfig.ddshhttptype || 'http';
    const host = lparConfig.ddsbaseurl;
    const port = lparConfig.ddsbaseport;

    if (!host || !port) {
      throw new BadRequestException('Invalid DDS configuration: missing baseurl or baseport');
    }

    return `${protocol}://${host}:${port}`;
  }

  /**
   * Build full request URL with query parameters
   */
  private buildRequestUrl(baseUrl: string, filename: string, params: RMFPPParams): string {
    const queryString = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== '')
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    return `${baseUrl}/gpm/${filename}?${queryString}`;
  }

  /**
   * Format date from ISO string to YYYYMMDD
   */
  private formatDate(isoDate: string): string {
    try {
      const date = new Date(isoDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    } catch (error) {
      this.logger.warn(`Failed to parse date: ${isoDate}`, 'RMFPPService');
      return isoDate; // Return as-is if parsing fails
    }
  }
}


