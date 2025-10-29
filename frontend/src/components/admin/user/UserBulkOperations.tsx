import React, { useState, useRef } from 'react';
import { useUserStore } from '../../../stores/userStore';
import Button from '../../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import LoadingSpinner from '../../ui/LoadingSpinner';
import { X, Download, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface UserBulkOperationsProps {
  onClose: () => void;
}

const UserBulkOperations: React.FC<UserBulkOperationsProps> = ({ onClose }) => {
  const {
    bulkImportUsers,
    bulkExportUsers,
    downloadUserExport,
    uploadUserImport,
    downloadUserTemplate,
    bulkImportResult,
    bulkExportResult,
    bulkLoading,
    bulkError,
    clearBulkResults,
  } = useUserStore();

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
      await uploadUserImport(selectedFile, { dryRun, skipValidation });
      setUploadProgress(100);
      setSelectedFile(null);
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const handleExport = async () => {
    try {
      await bulkExportUsers({ format: exportFormat });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadUserTemplate();
    } catch (error) {
      console.error('Template download failed:', error);
    }
  };

  const handleDownloadExport = async () => {
    if (bulkExportResult?.data) {
      try {
        await downloadUserExport(bulkExportResult.data, exportFormat);
      } catch (error) {
        console.error('Export download failed:', error);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">User Bulk Operations</h2>
              <p className="text-sm text-gray-600">Import or export users in bulk</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'import'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('import')}
          >
            Import Users
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'export'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('export')}
          >
            Export Users
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'import' && (
            <div className="space-y-6">
              {/* Template Download */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Download className="h-5 w-5" />
                    <span>Download Template</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Download a CSV template to see the required format for user import.
                  </p>
                  <Button onClick={handleDownloadTemplate} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download User Template
                  </Button>
                </CardContent>
              </Card>

              {/* File Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Upload className="h-5 w-5" />
                    <span>Upload File</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.json"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {selectedFile ? selectedFile.name : 'Select File'}
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      Supported formats: CSV, JSON
                    </p>
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="dryRun"
                        checked={dryRun}
                        onChange={(e) => setDryRun(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="dryRun" className="text-sm text-gray-700">
                        Dry run (validate without importing)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="skipValidation"
                        checked={skipValidation}
                        onChange={(e) => setSkipValidation(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="skipValidation" className="text-sm text-gray-700">
                        Skip validation (continue on errors)
                      </label>
                    </div>
                  </div>

                  {/* Import Button */}
                  <Button
                    onClick={handleImport}
                    disabled={!selectedFile || bulkLoading}
                    className="w-full"
                  >
                    {bulkLoading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Import Users
                      </>
                    )}
                  </Button>

                  {/* Progress Bar */}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6">
              {/* Export Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Download className="h-5 w-5" />
                    <span>Export Options</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Export Format
                    </label>
                    <select
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="csv">CSV</option>
                      <option value="json">JSON</option>
                    </select>
                  </div>

                  <Button
                    onClick={handleExport}
                    disabled={bulkLoading}
                    className="w-full"
                  >
                    {bulkLoading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Export Users
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Results */}
          {(bulkImportResult || bulkExportResult || bulkError) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {bulkError ? (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  <span>Results</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bulkError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-800">{bulkError}</p>
                  </div>
                )}

                {bulkImportResult && (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                      <h4 className="font-medium text-green-800 mb-2">Import Results</h4>
                      <div className="text-sm text-green-700">
                        <p>Total: {bulkImportResult.total}</p>
                        <p>Successful: {bulkImportResult.successful}</p>
                        <p>Failed: {bulkImportResult.failed}</p>
                      </div>
                    </div>

                    {bulkImportResult.errors && bulkImportResult.errors.length > 0 && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                        <h4 className="font-medium text-yellow-800 mb-2">Errors</h4>
                        <div className="text-sm text-yellow-700 space-y-1">
                          {bulkImportResult.errors.map((error, index) => (
                            <p key={index}>Row {error.row}: {error.error}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {bulkExportResult && (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                      <h4 className="font-medium text-green-800 mb-2">Export Results</h4>
                      <p className="text-sm text-green-700">
                        {bulkExportResult.message}
                      </p>
                    </div>

                    {bulkExportResult.data && (
                      <Button onClick={handleDownloadExport} variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Download Export
                      </Button>
                    )}
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <Button onClick={clearBulkResults} variant="outline">
                    Clear Results
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserBulkOperations;
