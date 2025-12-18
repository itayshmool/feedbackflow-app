// frontend/src/pages/admin/BulkSetupPage.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOrganizationStore } from '../../stores/organizationStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { OrganizationStatus } from '../../types/organization.types';
import { api } from '../../lib/api';
import { 
  Upload, 
  FileSpreadsheet, 
  Building, 
  AlertCircle, 
  CheckCircle,
  X,
  Users,
  GitBranch,
  AlertTriangle,
  ArrowRight,
  Mail
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ParsedEmployee {
  name: string;
  email: string;
  department: string;
  teamDepartment: string;
  profession: string;
  managerName: string | null;  // "LastName, FirstName" format from file
  managerEmail: string | null; // Resolved email (null if not found)
  isActive: boolean;
  location: string;
}

interface MissingManager {
  name: string;           // "LastName, FirstName" format
  referencedBy: string[]; // Emails of employees who report to this manager
  email: string;          // User-provided email (empty initially)
}

interface ParseResult {
  employees: ParsedEmployee[];
  detectedSlug: string;        // Normalized slug (lowercase, underscores)
  rawSlug: string;             // Original value from file
  missingManagers: MissingManager[];
  uniqueManagers: Set<string>;  // Emails of all managers (found in file)
  errors: string[];
  warnings: string[];
}

// Step type for the wizard
type WizardStep = 'upload' | 'validating' | 'validated' | 'creating-users' | 'users-created' | 'creating-hierarchy' | 'complete';

// ============================================================================
// Slug Normalizer
// ============================================================================

/**
 * Normalize a string to a valid slug format
 * "Site Operations" → "site_operations"
 * "Security" → "security"
 */
const normalizeSlug = (value: string): string => {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')           // Replace spaces with underscores
    .replace(/[^a-z0-9_-]/g, '')    // Remove invalid characters
    .replace(/_+/g, '_')            // Replace multiple underscores with single
    .replace(/^_|_$/g, '');         // Remove leading/trailing underscores
};

// ============================================================================
// CSV/TSV Parser (Auto-detect delimiter)
// ============================================================================

/**
 * Detect the delimiter used in the file (tab or comma)
 */
const detectDelimiter = (headerLine: string): string => {
  const tabCount = (headerLine.match(/\t/g) || []).length;
  const commaCount = (headerLine.match(/,/g) || []).length;
  return tabCount > commaCount ? '\t' : ',';
};

/**
 * Parse a CSV line properly handling quoted fields with commas inside
 * "field1","field with, comma","field3" → ['field1', 'field with, comma', 'field3']
 */
const parseCSVLine = (line: string, delimiter: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote ("") inside quoted field
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Don't forget the last field
  result.push(current.trim());
  
  return result;
};

/**
 * Find column index with flexible matching
 * Matches exact, contains, or common variations
 */
const findColumnIndex = (headers: string[], ...searchTerms: string[]): number => {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  for (const term of searchTerms) {
    const lowerTerm = term.toLowerCase();
    
    // Exact match
    const exactIdx = normalizedHeaders.findIndex(h => h === lowerTerm);
    if (exactIdx !== -1) return exactIdx;
    
    // Contains match
    const containsIdx = normalizedHeaders.findIndex(h => h.includes(lowerTerm) || lowerTerm.includes(h));
    if (containsIdx !== -1) return containsIdx;
  }
  
  return -1;
};

const parseFileContent = (content: string): ParseResult => {
  // Remove BOM (Byte Order Mark) if present - common in Excel CSV exports
  const cleanContent = content.replace(/^\uFEFF/, '');
  const lines = cleanContent.split('\n').filter(l => l.trim());
  const errors: string[] = [];
  const warnings: string[] = [];
  const employees: ParsedEmployee[] = [];
  
  if (lines.length === 0) {
    errors.push('File is empty');
    return { employees: [], detectedSlug: '', rawSlug: '', missingManagers: [], uniqueManagers: new Set(), errors, warnings };
  }

  // Auto-detect delimiter
  const delimiter = detectDelimiter(lines[0]);
  
  // Parse header row using proper CSV parsing
  const headers = parseCSVLine(lines[0], delimiter);
  
  // Find column indices with flexible matching
  const colIndex = {
    name: findColumnIndex(headers, 'employee name', 'name', 'full name', 'employee'),
    email: findColumnIndex(headers, 'primary email', 'email', 'work email', 'email address'),
    manager: findColumnIndex(headers, 'line manager', 'manager', 'reports to', 'supervisor'),
    departmentTop: findColumnIndex(headers, 'department guild/company (top)', 'department (top)', 'department', 'guild', 'division'),
    departmentTeam: findColumnIndex(headers, 'department guild/company (team)', 'department (team)', 'team', 'sub-department'),
    profession: findColumnIndex(headers, 'profession', 'job title', 'title', 'role', 'position'),
    status: findColumnIndex(headers, 'assignment status', 'status', 'employment status', 'active'),
    locationCity: findColumnIndex(headers, 'location city', 'city', 'office city', 'work city'),
    locationCountry: findColumnIndex(headers, 'location country', 'country', 'office country', 'work country'),
  };

  // Debug: Log detected columns
  console.log('Detected delimiter:', delimiter === '\t' ? 'TAB' : 'COMMA');
  console.log('Headers found:', headers);
  console.log('Column indices:', colIndex);
  console.log('First header raw:', JSON.stringify(headers[0])); // Check for BOM or hidden chars
  console.log('Name column header:', colIndex.name !== -1 ? headers[colIndex.name] : 'NOT FOUND');
  console.log('Email column header:', colIndex.email !== -1 ? headers[colIndex.email] : 'NOT FOUND');

  // Validate required columns
  if (colIndex.name === -1) errors.push('Missing column: "Employee Name" (or similar)');
  if (colIndex.email === -1) errors.push('Missing column: "Primary Email" (or similar)');
  if (colIndex.manager === -1) errors.push('Missing column: "Line Manager" (or similar)');
  if (colIndex.departmentTop === -1) errors.push('Missing column: "Department" (or similar)');

  if (errors.length > 0) {
    console.log('Available columns:', headers.join(', '));
    return { employees: [], detectedSlug: '', rawSlug: '', missingManagers: [], uniqueManagers: new Set(), errors, warnings };
  }

  // First pass: Build name → email lookup
  const nameToEmail = new Map<string, string>();
  
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i], delimiter);
    const name = cols[colIndex.name]?.trim();
    const email = cols[colIndex.email]?.trim()?.toLowerCase();
    
    if (name && email) {
      // Store "FirstName LastName" → email
      nameToEmail.set(name.toLowerCase(), email);
      
      // Also store "LastName, FirstName" → email (for manager lookup)
      const nameParts = name.split(' ');
      if (nameParts.length >= 2) {
        const lastName = nameParts[nameParts.length - 1];
        const firstName = nameParts.slice(0, -1).join(' ');
        const reversedName = `${lastName}, ${firstName}`.toLowerCase();
        nameToEmail.set(reversedName, email);
      }
    }
  }

  // Detect slug from first data row and normalize it
  let detectedSlug = '';
  let rawSlug = '';
  if (lines.length > 1) {
    const firstDataCols = parseCSVLine(lines[1], delimiter);
    rawSlug = firstDataCols[colIndex.departmentTop]?.trim() || '';
    detectedSlug = normalizeSlug(rawSlug);
    console.log('Detected slug:', rawSlug, '→', detectedSlug);
  }

  // Track managers referenced but not found
  const missingManagersMap = new Map<string, string[]>(); // managerName → [employee emails]
  const foundManagerEmails = new Set<string>();

  // Second pass: Parse employees and resolve manager emails
  console.log('Total data rows to process:', lines.length - 1);
  
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i], delimiter);
    
    // Debug first row
    if (i === 1) {
      console.log('First data row columns count:', cols.length);
      console.log('Headers count:', headers.length);
      console.log('First data row sample:', cols.slice(0, 5));
      console.log('Name value at index', colIndex.name, ':', cols[colIndex.name]);
      console.log('Email value at index', colIndex.email, ':', cols[colIndex.email]);
      console.log('Status value at index', colIndex.status, ':', cols[colIndex.status]);
    }
    
    const status = cols[colIndex.status]?.trim();
    
    // Skip non-active employees
    if (status && status.toLowerCase() !== 'active') {
      if (i <= 3) console.log('Row', i, 'skipped - status:', status);
      continue;
    }

    const name = cols[colIndex.name]?.trim();
    const email = cols[colIndex.email]?.trim()?.toLowerCase();
    const managerRaw = cols[colIndex.manager]?.trim();
    const departmentTop = cols[colIndex.departmentTop]?.trim() || '';
    const departmentTeam = cols[colIndex.departmentTeam]?.trim() || '';
    const profession = cols[colIndex.profession]?.trim() || '';
    const locationCity = cols[colIndex.locationCity]?.trim() || '';
    const locationCountry = cols[colIndex.locationCountry]?.trim() || '';

    if (!name || !email) {
      warnings.push(`Row ${i + 1}: Missing name or email, skipped`);
      continue;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      warnings.push(`Row ${i + 1}: Invalid email format "${email}", skipped`);
      continue;
    }

    // Resolve manager email
    let managerEmail: string | null = null;
    if (managerRaw) {
      managerEmail = nameToEmail.get(managerRaw.toLowerCase()) || null;
      
      if (managerEmail) {
        foundManagerEmails.add(managerEmail);
      } else {
        // Manager not found in file
        const existingRefs = missingManagersMap.get(managerRaw) || [];
        existingRefs.push(email);
        missingManagersMap.set(managerRaw, existingRefs);
      }
    }

    employees.push({
      name,
      email,
      department: departmentTop,
      teamDepartment: departmentTeam,
      profession,
      managerName: managerRaw || null,
      managerEmail,
      isActive: true,
      location: [locationCity, locationCountry].filter(Boolean).join(', '),
    });
  }

  // Convert missing managers map to array
  const missingManagers: MissingManager[] = Array.from(missingManagersMap.entries()).map(([name, refs]) => ({
    name,
    referencedBy: refs,
    email: '', // To be filled by user
  }));

  return {
    employees,
    detectedSlug,
    rawSlug,
    missingManagers,
    uniqueManagers: foundManagerEmails,
    errors,
    warnings,
  };
};

// ============================================================================
// Component
// ============================================================================

const BulkSetupPage: React.FC = () => {
  const { organizations, fetchOrganizations } = useOrganizationStore();
  
  // Form state
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedOrgName, setSelectedOrgName] = useState<string>('');
  const [selectedOrgSlug, setSelectedOrgSlug] = useState<string>('');
  const [detectedSlug, setDetectedSlug] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  
  // Parse result state
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  
  // Missing manager emails state
  const [missingManagerEmails, setMissingManagerEmails] = useState<Record<string, string>>({});
  
  // Step state
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  
  // API call state
  const [isCreatingUsers, setIsCreatingUsers] = useState(false);
  const [isCreatingHierarchy, setIsCreatingHierarchy] = useState(false);
  const [userCreationResult, setUserCreationResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [hierarchyCreationResult, setHierarchyCreationResult] = useState<{ created: number; errors: string[] } | null>(null);
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load organizations on component mount
  useEffect(() => {
    fetchOrganizations({ limit: 100, status: OrganizationStatus.ACTIVE });
  }, [fetchOrganizations]);

  // Handle organization selection
  const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const orgId = e.target.value;
    const org = organizations.find(o => o.id === orgId);
    setSelectedOrgId(orgId);
    setSelectedOrgName(org?.name || '');
    setSelectedOrgSlug(org?.slug || '');
  };

  // Parse file when selected
  const handleFileParse = useCallback(async (fileToparse: File) => {
    setIsParsing(true);
    setCurrentStep('validating');
    
    try {
      console.log('Reading file:', fileToparse.name, 'Size:', fileToparse.size);
      const content = await fileToparse.text();
      console.log('File content length:', content.length);
      console.log('First 500 chars:', content.substring(0, 500));
      
      const result = parseFileContent(content);
      
      setParseResult(result);
      setDetectedSlug(result.detectedSlug);
      
      if (result.errors.length === 0) {
        setCurrentStep('validated');
      } else {
        setCurrentStep('upload'); // Stay on upload if errors
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      console.error('Error details:', error instanceof Error ? error.message : error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      setParseResult({
        employees: [],
        detectedSlug: '',
        rawSlug: '',
        missingManagers: [],
        uniqueManagers: new Set(),
        errors: [`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
      });
      setCurrentStep('upload');
    } finally {
      setIsParsing(false);
    }
  }, []);

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      await handleFileParse(selectedFile);
    }
  };

  // Handle file drop
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && (droppedFile.name.endsWith('.tsv') || droppedFile.name.endsWith('.txt') || droppedFile.name.endsWith('.csv'))) {
      setFile(droppedFile);
      await handleFileParse(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Clear file and reset
  const handleRemoveFile = () => {
    setFile(null);
    setDetectedSlug('');
    setParseResult(null);
    setCurrentStep('upload');
    setMissingManagerEmails({});
    setUserCreationResult(null);
    setHierarchyCreationResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle missing manager email change
  const handleMissingManagerEmailChange = (managerName: string, email: string) => {
    setMissingManagerEmails(prev => ({
      ...prev,
      [managerName]: email.toLowerCase().trim()
    }));
  };

  // Check if slug matches selected organization
  const isSlugValid = detectedSlug === selectedOrgSlug;

  // Check if all missing managers have valid emails
  const allMissingManagersHaveEmails = parseResult?.missingManagers.every(m => {
    const email = missingManagerEmails[m.name];
    return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }) ?? true;

  // Can proceed to create users
  const canProceedToCreateUsers = 
    parseResult?.errors.length === 0 && 
    isSlugValid && 
    allMissingManagersHaveEmails &&
    parseResult.employees.length > 0;

  // Create users via API
  const handleCreateUsers = async () => {
    if (!parseResult || !selectedOrgId) return;
    
    setIsCreatingUsers(true);
    setCurrentStep('creating-users');
    
    try {
      // Build list of all users to create (employees + missing managers)
      const usersToCreate = [
        // Regular employees
        ...parseResult.employees.map(emp => ({
          email: emp.email,
          name: emp.name,
          organizationId: selectedOrgId,
          department: emp.department,
          position: emp.profession,
          roles: parseResult.uniqueManagers.has(emp.email) ? ['manager'] : ['employee']
        })),
        // Missing managers (need to be created as managers)
        ...parseResult.missingManagers.map(m => ({
          email: missingManagerEmails[m.name],
          name: m.name.split(', ').reverse().join(' '), // "LastName, FirstName" → "FirstName LastName"
          organizationId: selectedOrgId,
          department: parseResult.rawSlug,
          position: 'Manager',
          roles: ['manager']
        }))
      ];

      console.log('Creating users:', usersToCreate.length);
      
      const response = await api.post<{ success: Array<{ email: string }>; errors: Array<{ data: { email: string }; error: string }> }>(
        '/admin/users/import',
        { users: usersToCreate }
      );

      const result = {
        created: response.data.success?.length || 0,
        skipped: usersToCreate.length - (response.data.success?.length || 0) - (response.data.errors?.length || 0),
        errors: response.data.errors?.map((e: { data: { email: string }; error: string }) => `${e.data.email}: ${e.error}`) || []
      };

      setUserCreationResult(result);
      setCurrentStep('users-created');
      
    } catch (error) {
      console.error('Error creating users:', error);
      setUserCreationResult({
        created: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
      setCurrentStep('users-created');
    } finally {
      setIsCreatingUsers(false);
    }
  };

  // Create hierarchy via API  
  const handleCreateHierarchy = async () => {
    if (!parseResult) return;
    
    setIsCreatingHierarchy(true);
    setCurrentStep('creating-hierarchy');
    
    try {
      // Build CSV content for hierarchy
      // Format: organization_name,organization_slug,employee_email,manager_email
      const csvLines = ['organization_name,organization_slug,employee_email,manager_email'];
      
      // Add relationships from parsed employees
      for (const emp of parseResult.employees) {
        const managerEmail = emp.managerEmail || missingManagerEmails[emp.managerName || ''];
        if (managerEmail && emp.email !== managerEmail) {
          csvLines.push(`${selectedOrgName},${selectedOrgSlug},${emp.email},${managerEmail}`);
        }
      }

      const csvContent = csvLines.join('\n');
      console.log('Creating hierarchy with', csvLines.length - 1, 'relationships');
      console.log('CSV preview:', csvLines.slice(0, 5).join('\n'));

      // Use fetch directly for text/csv content type (axios transforms the body)
      const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';
      
      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split(';')
        .find(c => c.trim().startsWith('csrf-token='))
        ?.split('=')[1];
      
      // Get auth token from localStorage
      const authToken = localStorage.getItem('auth_token');
      
      const response = await fetch(`${apiUrl}/hierarchy/bulk/csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/csv',
          ...(csrfToken && { 'X-CSRF-Token': decodeURIComponent(csrfToken) }),
          ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
        },
        credentials: 'include',
        body: csvContent
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      setHierarchyCreationResult({
        created: data.created || 0,
        errors: data.errors || []
      });
      setCurrentStep('complete');
      
    } catch (error) {
      console.error('Error creating hierarchy:', error);
      setHierarchyCreationResult({
        created: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
      setCurrentStep('complete');
    } finally {
      setIsCreatingHierarchy(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Organization Setup</h1>
        <p className="text-gray-600 mt-1">
          Upload your HR export file to create users and hierarchy in one step
        </p>
      </div>

      {/* Step 1: Select Organization */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-semibold flex items-center justify-center">
            1
          </span>
          <h2 className="text-lg font-semibold text-gray-900">Select Organization</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedOrgId}
              onChange={handleOrgChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select an organization...</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.slug})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug (auto-detected from file)
            </label>
            <input
              type="text"
              value={detectedSlug}
              readOnly
              placeholder="Will be filled after file upload"
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-mono"
            />
            {detectedSlug && parseResult?.rawSlug && (
              <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                "{parseResult.rawSlug}" → "{detectedSlug}"
              </p>
            )}
            {detectedSlug && !parseResult?.rawSlug && (
              <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Detected from "Department Guild/Company (Top)" column
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Step 2: Upload File */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className={`w-8 h-8 rounded-full text-sm font-semibold flex items-center justify-center ${
            selectedOrgId ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            2
          </span>
          <h2 className="text-lg font-semibold text-gray-900">Upload HR Export File</h2>
        </div>

        {!selectedOrgId ? (
          <div className="text-center py-8 text-gray-500">
            <Building className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Please select an organization first</p>
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              file 
                ? 'border-green-300 bg-green-50' 
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            {isParsing ? (
              <div className="space-y-3">
                <LoadingSpinner size="lg" />
                <p className="text-gray-600">Parsing file...</p>
              </div>
            ) : file ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <FileSpreadsheet className="w-8 h-8 text-green-600" />
                  <span className="text-lg font-medium text-gray-900">{file.name}</span>
                  <button
                    onClick={handleRemoveFile}
                    className="p-1 hover:bg-gray-200 rounded-full"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <>
                <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-gray-600">Drag & drop your TSV file here</p>
                  <p className="text-gray-400">or</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".tsv,.txt,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Supported: .tsv, .txt, .csv (tab-separated)
                </p>
              </>
            )}
          </div>
        )}
      </Card>

      {/* Parse Results */}
      {parseResult && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className={`w-8 h-8 rounded-full text-sm font-semibold flex items-center justify-center ${
              parseResult.errors.length === 0 ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}>
              {parseResult.errors.length === 0 ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </span>
            <h2 className="text-lg font-semibold text-gray-900">
              {parseResult.errors.length === 0 ? 'File Parsed Successfully' : 'Parsing Errors'}
            </h2>
          </div>

          {/* Errors */}
          {parseResult.errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="font-medium text-red-800 mb-2">Errors:</p>
              <ul className="text-sm text-red-700 space-y-1">
                {parseResult.errors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Statistics */}
          {parseResult.errors.length === 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">{parseResult.employees.length}</div>
                  <div className="text-sm text-gray-600">Employees</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <GitBranch className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-600">{parseResult.uniqueManagers.size}</div>
                  <div className="text-sm text-gray-600">Managers Found</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <AlertTriangle className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-yellow-600">{parseResult.missingManagers.length}</div>
                  <div className="text-sm text-gray-600">Missing Managers</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">
                    {parseResult.employees.filter(e => e.managerEmail).length}
                  </div>
                  <div className="text-sm text-gray-600">With Manager</div>
                </div>
              </div>

              {/* Warnings */}
              {parseResult.warnings.length > 0 && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="font-medium text-yellow-800 mb-2">Warnings ({parseResult.warnings.length}):</p>
                  <ul className="text-sm text-yellow-700 space-y-1 max-h-32 overflow-y-auto">
                    {parseResult.warnings.slice(0, 10).map((warning, i) => (
                      <li key={i}>• {warning}</li>
                    ))}
                    {parseResult.warnings.length > 10 && (
                      <li className="font-medium">... and {parseResult.warnings.length - 10} more</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Slug Validation */}
              {detectedSlug && (
                <div className={`mb-6 p-4 rounded-lg border ${
                  isSlugValid 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {isSlugValid ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`font-medium ${isSlugValid ? 'text-green-800' : 'text-red-800'}`}>
                      {isSlugValid 
                        ? `Slug "${detectedSlug}" matches selected organization` 
                        : `Slug mismatch: file has "${detectedSlug}" but organization has "${selectedOrgSlug}"`
                      }
                    </span>
                  </div>
                  {!isSlugValid && (
                    <p className="text-sm text-red-700 mt-2">
                      Please select the correct organization or upload a file for "{selectedOrgSlug}"
                    </p>
                  )}
                </div>
              )}

              {/* Missing Managers with Email Inputs */}
              {parseResult.missingManagers.length > 0 && (
                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Missing Managers - Enter Emails
                  </p>
                  <p className="text-sm text-orange-700 mb-3">
                    These managers are referenced but not in the file. Enter their email addresses to create them:
                  </p>
                  <div className="space-y-3">
                    {parseResult.missingManagers.map((manager, i) => (
                      <div key={i} className="flex items-center gap-3 bg-white p-3 rounded border border-orange-200">
                        <span className="text-sm font-medium text-gray-700 min-w-[180px]">
                          {manager.name}
                        </span>
                        <span className="text-xs text-gray-500 min-w-[80px]">
                          ({manager.referencedBy.length} report{manager.referencedBy.length > 1 ? 's' : ''})
                        </span>
                        <input
                          type="email"
                          placeholder="email@wix.com"
                          value={missingManagerEmails[manager.name] || ''}
                          onChange={(e) => handleMissingManagerEmailChange(manager.name, e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {missingManagerEmails[manager.name] && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(missingManagerEmails[manager.name]) && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample Employees */}
              <div className="mb-6">
                <p className="font-medium text-gray-800 mb-2">Sample Employees (first 5):</p>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left p-2 font-medium text-gray-700">Name</th>
                        <th className="text-left p-2 font-medium text-gray-700">Email</th>
                        <th className="text-left p-2 font-medium text-gray-700">Manager</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parseResult.employees.slice(0, 5).map((emp, i) => (
                        <tr key={i} className="border-t border-gray-200">
                          <td className="p-2 text-gray-900">{emp.name}</td>
                          <td className="p-2 text-gray-600">{emp.email}</td>
                          <td className="p-2">
                            {emp.managerEmail ? (
                              <span className="text-green-600">{emp.managerEmail}</span>
                            ) : emp.managerName ? (
                              <span className="text-orange-600">{emp.managerName} (not found)</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Button - Create Users */}
              {currentStep === 'validated' && (
                <div className="text-center py-4 border-t border-gray-200">
                  {!canProceedToCreateUsers && (
                    <p className="text-amber-600 text-sm mb-3">
                      {!isSlugValid && '⚠️ Slug mismatch - select correct organization. '}
                      {!allMissingManagersHaveEmails && '⚠️ Enter valid emails for all missing managers.'}
                    </p>
                  )}
                  <Button 
                    onClick={handleCreateUsers}
                    disabled={!canProceedToCreateUsers || isCreatingUsers}
                    className="min-w-[200px]"
                  >
                    {isCreatingUsers ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Creating Users...
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4 mr-2" />
                        Create {parseResult.employees.length + parseResult.missingManagers.length} Users
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* Step 3: User Creation Results */}
      {userCreationResult && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className={`w-8 h-8 rounded-full text-sm font-semibold flex items-center justify-center ${
              userCreationResult.errors.length === 0 ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'
            }`}>
              3
            </span>
            <h2 className="text-lg font-semibold text-gray-900">User Creation Results</h2>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{userCreationResult.created}</div>
              <div className="text-sm text-gray-600">Created</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <Users className="w-6 h-6 text-gray-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-600">{userCreationResult.skipped}</div>
              <div className="text-sm text-gray-600">Already Existed</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-600">{userCreationResult.errors.length}</div>
              <div className="text-sm text-gray-600">Errors</div>
            </div>
          </div>

          {userCreationResult.errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="font-medium text-red-800 mb-2">Errors:</p>
              <ul className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                {userCreationResult.errors.slice(0, 10).map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
                {userCreationResult.errors.length > 10 && (
                  <li className="font-medium">... and {userCreationResult.errors.length - 10} more</li>
                )}
              </ul>
            </div>
          )}

          {/* Action Button - Create Hierarchy */}
          {currentStep === 'users-created' && (
            <div className="text-center py-4 border-t border-gray-200">
              <Button 
                onClick={handleCreateHierarchy}
                disabled={isCreatingHierarchy}
                className="min-w-[200px]"
              >
                {isCreatingHierarchy ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Creating Hierarchy...
                  </>
                ) : (
                  <>
                    <GitBranch className="w-4 h-4 mr-2" />
                    Create Hierarchy Relationships
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Step 4: Hierarchy Creation Results */}
      {hierarchyCreationResult && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className={`w-8 h-8 rounded-full text-sm font-semibold flex items-center justify-center ${
              hierarchyCreationResult.errors.length === 0 ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'
            }`}>
              4
            </span>
            <h2 className="text-lg font-semibold text-gray-900">Hierarchy Creation Results</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <GitBranch className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{hierarchyCreationResult.created}</div>
              <div className="text-sm text-gray-600">Relationships Created</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-600">{hierarchyCreationResult.errors.length}</div>
              <div className="text-sm text-gray-600">Errors</div>
            </div>
          </div>

          {hierarchyCreationResult.errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="font-medium text-red-800 mb-2">Errors:</p>
              <ul className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                {hierarchyCreationResult.errors.slice(0, 10).map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Complete Message */}
          {currentStep === 'complete' && (
            <div className="text-center py-6 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-green-800 mb-2">Setup Complete!</h3>
              <p className="text-green-700 mb-4">
                Successfully created {userCreationResult?.created || 0} users and {hierarchyCreationResult.created} hierarchy relationships.
              </p>
              <Button onClick={handleRemoveFile} variant="outline">
                Start New Import
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default BulkSetupPage;
