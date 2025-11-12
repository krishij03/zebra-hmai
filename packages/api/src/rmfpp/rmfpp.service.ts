/**
 * RMF Post Processor Service
 * Fetches and parses historical RMF metrics from DDS
 */
import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '../config/config.service';
import { LoggerService } from '../logger/logger.service';
import * as xml2js from 'xml2js';
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
  private readonly parser: xml2js.Parser;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    // Initialize xml2js parser (same as legacy code)
    this.parser = new xml2js.Parser();
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

      // Make HTTP request with TLS v1.0 support
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
          httpsAgent: new (require('https').Agent)({
            minVersion: 'TLSv1',
            maxVersion: 'TLSv1.2',
            rejectUnauthorized: false, // Allow self-signed certs for mainframe
          }),
        }),
      );

      // Parse XML response
      const parsedData = await this.parseXML(response.data);

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
   * Parse XML response from DDS (using xml2js - same as legacy code)
   */
  private async parseXML(xml: string): Promise<Omit<RMFPostProcessorResponseDTO, 'metadata'>> {
    return new Promise((resolve, reject) => {
      this.parser.parseString(xml, (err, result: any) => {
        if (err) {
          this.logger.error('XML parsing error', err.stack || err.message, 'RMFPPService');
          return reject(new InternalServerErrorException('Failed to parse RMFPP XML response'));
        }

        try {
          if (!result?.ddsml?.postprocessor) {
            throw new Error('Invalid XML structure: missing ddsml.postprocessor');
          }

          const postprocessors = result.ddsml.postprocessor;
          const finalJSON: any = {};

          for (const pp of postprocessors) {
            const singleReport: any = {};
            const segments = pp.segment;
            const resourceName = pp.resource?.[0]?.resname?.[0];
            const reportId = pp.metric?.[0]?.$?.id;
            const allSegmentCollection: any = {};

            if (segments) {
              for (const segment of segments) {
                const parts = segment.part;
                const segmentName = segment.name?.[0];
                const message = segment.message;
                const partCollection: any = {};

                if (parts) {
                  for (const part of parts) {
                    const partName = part.name;
                    const varlist = part['var-list'];
                    const table = part.table;
                    let fieldCollection: any = {};

                    if (varlist) {
                      const variables = varlist[0].var;
                      for (const v of variables) {
                        fieldCollection[v.name[0]] = v.value[0];
                      }
                    }

                    if (table) {
                      const tableColumnHeader = table[0]['column-headers'][0].col;
                      const tableBody = table[0].row;
                      const columnheadCollection: string[] = [];
                      const finalTableReport: any[] = [];

                      for (const col of tableColumnHeader) {
                        columnheadCollection.push(col._ ? col._ : 'Name');
                      }

                      if (tableBody) {
                        for (const row of tableBody) {
                          const partTable: any = {};
                          for (let j = 0; j < columnheadCollection.length; j++) {
                            partTable[columnheadCollection[j]] = row.col[j];
                          }
                          finalTableReport.push(partTable);
                        }
                      }

                      if (!varlist) {
                        fieldCollection = finalTableReport;
                      } else {
                        fieldCollection['Table'] = finalTableReport;
                      }
                    }

                    const pName = Array.isArray(partName) ? partName[0] : partName;
                    if (pName && pName !== '') {
                      partCollection[pName] = fieldCollection;
                    } else {
                      partCollection['Info'] = fieldCollection;
                    }

                    if (Object.keys(partCollection).length === 1 && Object.keys(partCollection)[0] === 'Info') {
                      Object.assign(partCollection, partCollection['Info']);
                      delete partCollection['Info'];
                    }

                    if (message) {
                      const messageDescription = message[0].description[0];
                      const messageSeverity = message[0].severity[0];
                      partCollection['Message'] = {
                        Description: messageDescription,
                        Severity: messageSeverity,
                      };
                    }
                  }
                }

                allSegmentCollection[segmentName] = partCollection;
              }
            }

            singleReport['Report'] = pp.metric?.[0]?.description?.[0];
            singleReport['System'] = resourceName;
            singleReport['Timestamp'] = pp['time-data']?.[0]?.['display-start']?.[0]?._;

            if (reportId === 'WLMGL') {
              const segKeys = Object.keys(allSegmentCollection);
              singleReport['Classes'] = segKeys.map((key) => ({
                Name: key,
                ...allSegmentCollection[key],
              }));
            } else {
              Object.assign(singleReport, allSegmentCollection);
            }

            if (finalJSON[reportId]) {
              finalJSON[reportId].push(singleReport);
            } else {
              finalJSON[reportId] = [singleReport];
            }
          }

          // If only one report ID, extract data into root object
          const finalKeys = Object.keys(finalJSON);
          let parsedData = finalJSON;
          if (finalKeys.length === 1) {
            parsedData = finalJSON[finalKeys[0]];
          }

          resolve({
            data: parsedData,
            title: 'RMF Post Processor Report',
            timestart: parsedData[0]?.Timestamp || '',
            timeend: parsedData[parsedData.length - 1]?.Timestamp || '',
          });
        } catch (error) {
          this.logger.error('XML structure parsing failed', error.stack, 'RMFPPService');
          reject(new InternalServerErrorException('Failed to parse RMFPP XML structure'));
        }
      });
    });
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


