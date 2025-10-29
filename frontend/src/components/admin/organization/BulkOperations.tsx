import React, { useState, useRef } from 'react';
import { useOrganizationStore } from '../../../stores/organizationStore';
import Button from '../../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import LoadingSpinner from '../../ui/LoadingSpinner';
import { X, Download, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface BulkOperationsProps {
  onClose: () => void;
}

const BulkOperations: React.FC<BulkOperationsProps> = ({ onClose }) => {
  const {
    bulkImport,
    bulkExport,
    downloadExport,
    uploadImport,
    downloadTemplate,
    bulkImportResult,
    bulkExportResult,
    bulkLoading,
    bulkError,
    clearBulkResults,
  } = useOrganizationStore();

  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('csv');
  const [dryRun, setDryRun] = useState(false);
  const [skipValidation, setSkipValidation] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    try {
      setUploadProgress(0);
      await uploadImport(selectedFile, { dryRun, skipValidation });
      setUploadProgress(100);
      setSelectedFile(null);
    } catch (error) {
      console.error('Import failed:', error);
      setUploadProgress(0);
    }
  };

  const handleExport = async () => {
    try {
      const exportData: any = {
        type: 'organizations',
        format: exportFormat,
        filters: {},
      };
      await downloadExport(exportData, `organizations-export-${new Date().toISOString().split('T')[0]}.${exportFormat}`);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadTemplate('organizations');
    } catch (error) {
      console.error('Template download failed:', error);
    }
  };

  const tabs = [
    { id: 'import', label: 'Import', icon: Upload },
    { id: 'export', label: 'Export', icon: Download },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Bulk Operations</h2>
              <Button onClick={onClose} variant="ghost" size="sm">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'import' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Import Organizations</h3>
                  <p className="text-gray-600 mb-4">
                    Upload a CSV or JSON file to import organizations in bulk. Download a template to get started.
                  </p>
                  <Button
                    onClick={handleDownloadTemplate}
                    variant="outline"
                    size="sm"
                    disabled={bulkLoading}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV Template
                  </Button>
                </div>

                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors">
                  <div className="text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <div className="space-y-2">
                      {selectedFile ? (
                        <div className="flex items-center justify-center space-x-2">
                          <p className="text-sm text-gray-900 font-medium">{selectedFile.name}</p>
                          <button
                            onClick={() => setSelectedFile(null)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">Choose a file or drag and drop</p>
                      )}
                      <p className="text-xs text-gray-500">CSV or JSON (max 10MB)</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,.csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        size="sm"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Select File
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Upload Progress */}
                {bulkLoading && uploadProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Import Options */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Import Options</h4>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="dryRun"
                        checked={dryRun}
                        onChange={(e) => setDryRun(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="dryRun" className="ml-2 block text-sm text-gray-900">
                        Dry run (preview changes without importing)
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="skipValidation"
                        checked={skipValidation}
                        onChange={(e) => setSkipValidation(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="skipValidation" className="ml-2 block text-sm text-gray-900">
                        Skip validation (continue on errors)
                      </label>
                    </div>
                  </div>
                </div>

                {/* Import Actions */}
                <div className="flex space-x-3">
                  <Button
                    onClick={handleImport}
                    disabled={!selectedFile || bulkLoading}
                  >
                    {bulkLoading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        {dryRun ? 'Validating...' : 'Importing...'}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        {dryRun ? 'Validate Import' : 'Import Data'}
                      </>
                    )}
                  </Button>
                </div>

                {/* Import Results */}
                {bulkImportResult && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-3">Import Results</h4>
                    <div className={`p-4 rounded-lg ${
                      bulkImportResult.success ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
                    }`}>
                      <div className="flex items-start">
                        {bulkImportResult.success ? (
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className={`font-medium ${
                            bulkImportResult.success ? 'text-green-800' : 'text-yellow-800'
                          }`}>
                            {bulkImportResult.message || (bulkImportResult.success ? 'Import Successful' : 'Import Completed with Errors')}
                          </p>
                          <div className="mt-2 text-sm">
                            <p className={`${
                              bulkImportResult.success ? 'text-green-700' : 'text-yellow-700'
                            }`}>
                              Total: {bulkImportResult.results.total} records
                            </p>
                            <p className="text-green-700">
                              Successful: {bulkImportResult.results.successful}
                            </p>
                            {bulkImportResult.results.failed > 0 && (
                              <p className="text-red-700">
                                Failed: {bulkImportResult.results.failed}
                              </p>
                            )}
                            {bulkImportResult.results.errors && bulkImportResult.results.errors.length > 0 && (
                              <div className="mt-3 p-3 bg-white rounded border border-red-200 max-h-48 overflow-y-auto">
                                <p className="font-medium text-red-800 mb-2">Errors:</p>
                                <ul className="space-y-1 text-xs">
                                  {bulkImportResult.results.errors.map((error, index) => (
                                    <li key={index} className="text-red-700">
                                      Row {error.row}: {error.error}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'export' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Export Organizations</h3>
                  <p className="text-gray-600 mb-4">
                    Export all organizations, departments, and teams data for backup or migration purposes.
                  </p>
                </div>

                {/* Export Options */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Export Options</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Export Format
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="json"
                          checked={exportFormat === 'json'}
                          onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-900">JSON</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="csv"
                          checked={exportFormat === 'csv'}
                          onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-900">CSV</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Export Actions */}
                <div className="flex space-x-3">
                  <Button
                    onClick={handleExport}
                    disabled={bulkLoading}
                  >
                    {bulkLoading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Export Data
                      </>
                    )}
                  </Button>
                </div>

                {/* Export Results */}
                {bulkExportResult && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-3">Export Results</h4>
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                      <div className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-green-800">Export Successful</p>
                          <p className="text-sm text-green-700 mt-1">
                            {bulkExportResult.message || `Exported ${bulkExportResult.data?.length || 0} records`}
                          </p>
                          <p className="text-sm text-green-700">
                            Format: {bulkExportResult.format?.toUpperCase() || 'JSON'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error Display */}
            {bulkError && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-700">{bulkError}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200">
            <div className="flex justify-end space-x-3">
              <Button onClick={clearBulkResults} variant="outline">
                Clear Results
              </Button>
              <Button onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BulkOperations;
