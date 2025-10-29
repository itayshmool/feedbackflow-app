import { VirusScanService } from '../../../src/services/VirusScanService.js';
import { jest } from '@jest/globals';

describe('VirusScanService', () => {
  let virusScanService: VirusScanService;

  beforeEach(() => {
    virusScanService = new VirusScanService();
  });

  describe('scanFile', () => {
    it('should scan file successfully and return clean status', async () => {
      const mockFileBuffer = Buffer.from('clean file content');
      const mockScanResult = {
        status: 'clean',
        scanTime: 150,
        engine: 'clamav',
        version: '0.103.2',
        scannedAt: '2024-01-15T12:00:00Z'
      };

      // Mock the actual scan implementation
      jest.spyOn(virusScanService, 'performScan').mockResolvedValue(mockScanResult);

      const result = await virusScanService.scanFile(mockFileBuffer);

      expect(virusScanService.performScan).toHaveBeenCalledWith(mockFileBuffer);
      expect(result).toEqual(mockScanResult);
    });

    it('should detect infected file and return infected status', async () => {
      const mockFileBuffer = Buffer.from('infected file content');
      const mockScanResult = {
        status: 'infected',
        scanTime: 200,
        engine: 'clamav',
        version: '0.103.2',
        scannedAt: '2024-01-15T12:00:00Z',
        threats: [
          {
            name: 'EICAR-Test-File',
            type: 'test',
            severity: 'high'
          }
        ]
      };

      jest.spyOn(virusScanService, 'performScan').mockResolvedValue(mockScanResult);

      const result = await virusScanService.scanFile(mockFileBuffer);

      expect(result).toEqual(mockScanResult);
      expect(result.status).toBe('infected');
      expect(result.threats).toHaveLength(1);
    });

    it('should handle scan failures and return failed status', async () => {
      const mockFileBuffer = Buffer.from('file content');
      const mockScanResult = {
        status: 'failed',
        scanTime: 0,
        engine: 'clamav',
        version: '0.103.2',
        scannedAt: '2024-01-15T12:00:00Z',
        error: 'Scan engine unavailable'
      };

      jest.spyOn(virusScanService, 'performScan').mockResolvedValue(mockScanResult);

      const result = await virusScanService.scanFile(mockFileBuffer);

      expect(result).toEqual(mockScanResult);
      expect(result.status).toBe('failed');
      expect(result.error).toBe('Scan engine unavailable');
    });

    it('should handle empty file buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);
      const mockScanResult = {
        status: 'clean',
        scanTime: 50,
        engine: 'clamav',
        version: '0.103.2',
        scannedAt: '2024-01-15T12:00:00Z'
      };

      jest.spyOn(virusScanService, 'performScan').mockResolvedValue(mockScanResult);

      const result = await virusScanService.scanFile(emptyBuffer);

      expect(result).toEqual(mockScanResult);
    });

    it('should handle large file buffers', async () => {
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
      const mockScanResult = {
        status: 'clean',
        scanTime: 5000,
        engine: 'clamav',
        version: '0.103.2',
        scannedAt: '2024-01-15T12:00:00Z'
      };

      jest.spyOn(virusScanService, 'performScan').mockResolvedValue(mockScanResult);

      const result = await virusScanService.scanFile(largeBuffer);

      expect(result).toEqual(mockScanResult);
      expect(result.scanTime).toBeGreaterThan(1000); // Should take longer for large files
    });

    it('should handle scan timeout', async () => {
      const mockFileBuffer = Buffer.from('file content');
      const mockScanResult = {
        status: 'failed',
        scanTime: 30000,
        engine: 'clamav',
        version: '0.103.2',
        scannedAt: '2024-01-15T12:00:00Z',
        error: 'Scan timeout after 30 seconds'
      };

      jest.spyOn(virusScanService, 'performScan').mockResolvedValue(mockScanResult);

      const result = await virusScanService.scanFile(mockFileBuffer);

      expect(result).toEqual(mockScanResult);
      expect(result.status).toBe('failed');
      expect(result.error).toContain('timeout');
    });
  });

  describe('performScan', () => {
    it('should perform ClamAV scan successfully', async () => {
      const mockFileBuffer = Buffer.from('clean file content');
      const mockScanResult = {
        status: 'clean',
        scanTime: 150,
        engine: 'clamav',
        version: '0.103.2',
        scannedAt: '2024-01-15T12:00:00Z'
      };

      // Mock ClamAV scan
      jest.spyOn(virusScanService, 'scanWithClamAV').mockResolvedValue(mockScanResult);

      const result = await virusScanService.performScan(mockFileBuffer);

      expect(virusScanService.scanWithClamAV).toHaveBeenCalledWith(mockFileBuffer);
      expect(result).toEqual(mockScanResult);
    });

    it('should fallback to AWS S3 malware scanning when ClamAV fails', async () => {
      const mockFileBuffer = Buffer.from('file content');
      const mockClamAVError = new Error('ClamAV service unavailable');
      const mockS3ScanResult = {
        status: 'clean',
        scanTime: 300,
        engine: 'aws-s3-malware',
        version: '1.0.0',
        scannedAt: '2024-01-15T12:00:00Z'
      };

      jest.spyOn(virusScanService, 'scanWithClamAV').mockRejectedValue(mockClamAVError);
      jest.spyOn(virusScanService, 'scanWithAWSS3').mockResolvedValue(mockS3ScanResult);

      const result = await virusScanService.performScan(mockFileBuffer);

      expect(virusScanService.scanWithClamAV).toHaveBeenCalledWith(mockFileBuffer);
      expect(virusScanService.scanWithAWSS3).toHaveBeenCalledWith(mockFileBuffer);
      expect(result).toEqual(mockS3ScanResult);
    });

    it('should return failed status when all scan engines fail', async () => {
      const mockFileBuffer = Buffer.from('file content');
      const mockClamAVError = new Error('ClamAV service unavailable');
      const mockS3Error = new Error('AWS S3 service unavailable');

      jest.spyOn(virusScanService, 'scanWithClamAV').mockRejectedValue(mockClamAVError);
      jest.spyOn(virusScanService, 'scanWithAWSS3').mockRejectedValue(mockS3Error);

      const result = await virusScanService.performScan(mockFileBuffer);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('All scan engines failed');
    });
  });

  describe('scanWithClamAV', () => {
    it('should scan file with ClamAV successfully', async () => {
      const mockFileBuffer = Buffer.from('clean file content');
      const mockScanResult = {
        status: 'clean',
        scanTime: 150,
        engine: 'clamav',
        version: '0.103.2',
        scannedAt: '2024-01-15T12:00:00Z'
      };

      // Mock ClamAV daemon response
      const mockClamAVResponse = {
        stdout: 'stream: OK\n',
        stderr: '',
        exitCode: 0
      };

      jest.spyOn(virusScanService, 'executeClamAVCommand').mockResolvedValue(mockClamAVResponse);

      const result = await virusScanService.scanWithClamAV(mockFileBuffer);

      expect(virusScanService.executeClamAVCommand).toHaveBeenCalledWith(mockFileBuffer);
      expect(result).toEqual(mockScanResult);
    });

    it('should detect virus with ClamAV', async () => {
      const mockFileBuffer = Buffer.from('infected file content');
      const mockScanResult = {
        status: 'infected',
        scanTime: 200,
        engine: 'clamav',
        version: '0.103.2',
        scannedAt: '2024-01-15T12:00:00Z',
        threats: [
          {
            name: 'EICAR-Test-File',
            type: 'test',
            severity: 'high'
          }
        ]
      };

      const mockClamAVResponse = {
        stdout: 'stream: EICAR-Test-File FOUND\n',
        stderr: '',
        exitCode: 1
      };

      jest.spyOn(virusScanService, 'executeClamAVCommand').mockResolvedValue(mockClamAVResponse);

      const result = await virusScanService.scanWithClamAV(mockFileBuffer);

      expect(result).toEqual(mockScanResult);
      expect(result.status).toBe('infected');
      expect(result.threats).toHaveLength(1);
    });

    it('should handle ClamAV service errors', async () => {
      const mockFileBuffer = Buffer.from('file content');
      const mockClamAVResponse = {
        stdout: '',
        stderr: 'ERROR: Can\'t connect to clamd',
        exitCode: 2
      };

      jest.spyOn(virusScanService, 'executeClamAVCommand').mockResolvedValue(mockClamAVResponse);

      const result = await virusScanService.scanWithClamAV(mockFileBuffer);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Can\'t connect to clamd');
    });

    it('should handle ClamAV timeout', async () => {
      const mockFileBuffer = Buffer.from('file content');
      const mockClamAVResponse = {
        stdout: '',
        stderr: 'ERROR: Timeout',
        exitCode: 124
      };

      jest.spyOn(virusScanService, 'executeClamAVCommand').mockResolvedValue(mockClamAVResponse);

      const result = await virusScanService.scanWithClamAV(mockFileBuffer);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Timeout');
    });
  });

  describe('scanWithAWSS3', () => {
    it('should scan file with AWS S3 malware scanning successfully', async () => {
      const mockFileBuffer = Buffer.from('clean file content');
      const mockScanResult = {
        status: 'clean',
        scanTime: 300,
        engine: 'aws-s3-malware',
        version: '1.0.0',
        scannedAt: '2024-01-15T12:00:00Z'
      };

      // Mock AWS S3 malware scanning response
      const mockS3Response = {
        status: 'CLEAN',
        scanResult: {
          status: 'CLEAN',
          threatCount: 0
        }
      };

      jest.spyOn(virusScanService, 'uploadToS3ForScanning').mockResolvedValue(mockS3Response);

      const result = await virusScanService.scanWithAWSS3(mockFileBuffer);

      expect(virusScanService.uploadToS3ForScanning).toHaveBeenCalledWith(mockFileBuffer);
      expect(result).toEqual(mockScanResult);
    });

    it('should detect malware with AWS S3 scanning', async () => {
      const mockFileBuffer = Buffer.from('infected file content');
      const mockScanResult = {
        status: 'infected',
        scanTime: 400,
        engine: 'aws-s3-malware',
        version: '1.0.0',
        scannedAt: '2024-01-15T12:00:00Z',
        threats: [
          {
            name: 'Trojan.Generic',
            type: 'trojan',
            severity: 'high'
          }
        ]
      };

      const mockS3Response = {
        status: 'INFECTED',
        scanResult: {
          status: 'INFECTED',
          threatCount: 1,
          threats: [
            {
              name: 'Trojan.Generic',
              type: 'trojan',
              severity: 'high'
            }
          ]
        }
      };

      jest.spyOn(virusScanService, 'uploadToS3ForScanning').mockResolvedValue(mockS3Response);

      const result = await virusScanService.scanWithAWSS3(mockFileBuffer);

      expect(result).toEqual(mockScanResult);
      expect(result.status).toBe('infected');
      expect(result.threats).toHaveLength(1);
    });

    it('should handle AWS S3 scanning errors', async () => {
      const mockFileBuffer = Buffer.from('file content');
      const mockS3Error = new Error('AWS S3 service unavailable');

      jest.spyOn(virusScanService, 'uploadToS3ForScanning').mockRejectedValue(mockS3Error);

      const result = await virusScanService.scanWithAWSS3(mockFileBuffer);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('AWS S3 service unavailable');
    });

    it('should handle AWS S3 scanning timeout', async () => {
      const mockFileBuffer = Buffer.from('file content');
      const mockS3Error = new Error('Request timeout');

      jest.spyOn(virusScanService, 'uploadToS3ForScanning').mockRejectedValue(mockS3Error);

      const result = await virusScanService.scanWithAWSS3(mockFileBuffer);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Request timeout');
    });
  });

  describe('executeClamAVCommand', () => {
    it('should execute ClamAV command successfully', async () => {
      const mockFileBuffer = Buffer.from('file content');
      const mockResponse = {
        stdout: 'stream: OK\n',
        stderr: '',
        exitCode: 0
      };

      // Mock child_process.exec
      const mockExec = jest.fn((command, callback) => {
        callback(null, mockResponse.stdout, mockResponse.stderr);
      });

      jest.doMock('child_process', () => ({
        exec: mockExec
      }));

      const result = await virusScanService.executeClamAVCommand(mockFileBuffer);

      expect(result).toEqual(mockResponse);
    });

    it('should handle ClamAV command execution errors', async () => {
      const mockFileBuffer = Buffer.from('file content');
      const mockError = new Error('Command execution failed');

      const mockExec = jest.fn((command, callback) => {
        callback(mockError, '', '');
      });

      jest.doMock('child_process', () => ({
        exec: mockExec
      }));

      await expect(virusScanService.executeClamAVCommand(mockFileBuffer))
        .rejects.toThrow('Command execution failed');
    });
  });

  describe('uploadToS3ForScanning', () => {
    it('should upload file to S3 for scanning successfully', async () => {
      const mockFileBuffer = Buffer.from('file content');
      const mockS3Response = {
        status: 'CLEAN',
        scanResult: {
          status: 'CLEAN',
          threatCount: 0
        }
      };

      // Mock AWS SDK
      const mockS3Client = {
        upload: jest.fn().mockReturnValue({
          promise: jest.fn().mockResolvedValue({
            Location: 'https://bucket.s3.amazonaws.com/temp-scan-file'
          })
        })
      };

      const mockS3MalwareClient = {
        getMalwareScanningResult: jest.fn().mockReturnValue({
          promise: jest.fn().mockResolvedValue(mockS3Response)
        })
      };

      jest.doMock('@aws-sdk/client-s3', () => ({
        S3Client: jest.fn(() => mockS3Client)
      }));

      jest.doMock('@aws-sdk/client-s3-malware', () => ({
        S3MalwareClient: jest.fn(() => mockS3MalwareClient)
      }));

      const result = await virusScanService.uploadToS3ForScanning(mockFileBuffer);

      expect(mockS3Client.upload).toHaveBeenCalled();
      expect(mockS3MalwareClient.getMalwareScanningResult).toHaveBeenCalled();
      expect(result).toEqual(mockS3Response);
    });

    it('should handle S3 upload errors', async () => {
      const mockFileBuffer = Buffer.from('file content');
      const mockS3Error = new Error('S3 upload failed');

      const mockS3Client = {
        upload: jest.fn().mockReturnValue({
          promise: jest.fn().mockRejectedValue(mockS3Error)
        })
      };

      jest.doMock('@aws-sdk/client-s3', () => ({
        S3Client: jest.fn(() => mockS3Client)
      }));

      await expect(virusScanService.uploadToS3ForScanning(mockFileBuffer))
        .rejects.toThrow('S3 upload failed');
    });

    it('should handle S3 malware scanning errors', async () => {
      const mockFileBuffer = Buffer.from('file content');
      const mockScanError = new Error('Malware scanning failed');

      const mockS3Client = {
        upload: jest.fn().mockReturnValue({
          promise: jest.fn().mockResolvedValue({
            Location: 'https://bucket.s3.amazonaws.com/temp-scan-file'
          })
        })
      };

      const mockS3MalwareClient = {
        getMalwareScanningResult: jest.fn().mockReturnValue({
          promise: jest.fn().mockRejectedValue(mockScanError)
        })
      };

      jest.doMock('@aws-sdk/client-s3', () => ({
        S3Client: jest.fn(() => mockS3Client)
      }));

      jest.doMock('@aws-sdk/client-s3-malware', () => ({
        S3MalwareClient: jest.fn(() => mockS3MalwareClient)
      }));

      await expect(virusScanService.uploadToS3ForScanning(mockFileBuffer))
        .rejects.toThrow('Malware scanning failed');
    });
  });

  describe('isScanEngineAvailable', () => {
    it('should check if ClamAV is available', async () => {
      const mockResponse = {
        stdout: 'ClamAV 0.103.2\n',
        stderr: '',
        exitCode: 0
      };

      jest.spyOn(virusScanService, 'executeClamAVCommand').mockResolvedValue(mockResponse);

      const result = await virusScanService.isScanEngineAvailable('clamav');

      expect(result).toBe(true);
    });

    it('should return false when ClamAV is not available', async () => {
      const mockError = new Error('ClamAV not found');

      jest.spyOn(virusScanService, 'executeClamAVCommand').mockRejectedValue(mockError);

      const result = await virusScanService.isScanEngineAvailable('clamav');

      expect(result).toBe(false);
    });

    it('should check if AWS S3 malware scanning is available', async () => {
      const mockS3Response = {
        status: 'AVAILABLE',
        service: 's3-malware-scanning'
      };

      jest.spyOn(virusScanService, 'checkAWSS3Availability').mockResolvedValue(mockS3Response);

      const result = await virusScanService.isScanEngineAvailable('aws-s3');

      expect(result).toBe(true);
    });

    it('should return false when AWS S3 malware scanning is not available', async () => {
      const mockS3Error = new Error('AWS S3 malware scanning not available');

      jest.spyOn(virusScanService, 'checkAWSS3Availability').mockRejectedValue(mockS3Error);

      const result = await virusScanService.isScanEngineAvailable('aws-s3');

      expect(result).toBe(false);
    });

    it('should return false for unknown scan engine', async () => {
      const result = await virusScanService.isScanEngineAvailable('unknown-engine');

      expect(result).toBe(false);
    });
  });

  describe('getScanEngineStatus', () => {
    it('should get scan engine status successfully', async () => {
      const mockStatus = {
        clamav: {
          available: true,
          version: '0.103.2',
          lastCheck: '2024-01-15T12:00:00Z'
        },
        'aws-s3': {
          available: true,
          version: '1.0.0',
          lastCheck: '2024-01-15T12:00:00Z'
        }
      };

      jest.spyOn(virusScanService, 'isScanEngineAvailable').mockImplementation(async (engine) => {
        return mockStatus[engine]?.available || false;
      });

      const result = await virusScanService.getScanEngineStatus();

      expect(result).toEqual(mockStatus);
    });

    it('should handle errors when checking engine status', async () => {
      const mockStatus = {
        clamav: {
          available: false,
          error: 'Service unavailable',
          lastCheck: '2024-01-15T12:00:00Z'
        },
        'aws-s3': {
          available: false,
          error: 'Service unavailable',
          lastCheck: '2024-01-15T12:00:00Z'
        }
      };

      jest.spyOn(virusScanService, 'isScanEngineAvailable').mockRejectedValue(new Error('Service unavailable'));

      const result = await virusScanService.getScanEngineStatus();

      expect(result.clamav.available).toBe(false);
      expect(result['aws-s3'].available).toBe(false);
    });
  });
});
