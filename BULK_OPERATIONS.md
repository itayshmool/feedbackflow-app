# Bulk Operations Guide

## Overview

The bulk operations feature allows administrators to import and export organizations in bulk using CSV or JSON files. This is useful for:

- Initial system setup with multiple organizations
- Data migration from other systems
- Backup and restore operations
- Bulk updates to organization data

## Features

### Import Organizations
- **File Formats**: CSV or JSON
- **Validation**: Automatic validation of required fields
- **Dry Run**: Preview import results without committing changes
- **Error Handling**: Detailed error reporting with row numbers
- **Skip Validation**: Continue importing even if some records fail

### Export Organizations
- **File Formats**: CSV or JSON
- **Filters**: Export specific organizations based on filters
- **Direct Download**: Files are automatically downloaded to your browser

## CSV Template

Download the CSV template from the UI or create a file with the following columns:

| Column | Required | Type | Example |
|--------|----------|------|---------|
| name | Yes | String | Acme Corporation |
| slug | Yes | String | acme-corp |
| description | No | String | A leading technology company |
| contactEmail | Yes | Email | admin@acme.com |
| contactPhone | No | String | +1-555-0123 |
| address | No | String | 123 Main St |
| city | No | String | San Francisco |
| state | No | String | CA |
| zipCode | No | String | 94102 |
| country | No | String | USA |
| website | No | URL | https://acme.com |
| logoUrl | No | URL | https://acme.com/logo.png |
| subscriptionPlan | Yes | Enum | basic, professional, enterprise |
| maxUsers | Yes | Number | 100 |
| maxCycles | Yes | Number | 10 |
| storageLimitGb | Yes | Number | 5 |
| timezone | No | String | America/Los_Angeles |
| language | No | String | en |
| dateFormat | No | String | YYYY-MM-DD |
| currency | No | String | USD |
| workingDays | No | JSON Array | [1,2,3,4,5] |
| workingHoursStart | No | Time | 09:00 |
| workingHoursEnd | No | Time | 17:00 |

## API Endpoints

### Upload Import File
```
POST /api/v1/admin/bulk/upload
Content-Type: multipart/form-data

FormData:
- file: File (CSV or JSON)
- dryRun: boolean (optional, default: false)
- skipValidation: boolean (optional, default: false)
```

### Export Data
```
POST /api/v1/admin/bulk/export
Content-Type: application/json

{
  "type": "organizations",
  "format": "csv" | "json",
  "filters": {}
}
```

### Download Template
```
GET /api/v1/admin/bulk/template?type=organizations
```

## Usage Examples

### 1. Import Organizations from CSV

1. Download the CSV template from the UI
2. Fill in your organization data
3. Upload the file using the Import tab
4. Optionally check "Dry run" to preview changes
5. Review the results and any errors

### 2. Export Organizations to CSV

1. Navigate to the Export tab
2. Select "CSV" format
3. Click "Export Data"
4. The file will be downloaded automatically

### 3. Dry Run Import

1. Upload your CSV file
2. Check "Dry run (preview changes without importing)"
3. Click "Validate Import"
4. Review the validation results without affecting the database

## Error Handling

Import errors are reported with:
- **Row Number**: The line in the CSV where the error occurred
- **Error Message**: Description of what went wrong

Common errors:
- Missing required fields (name, contactEmail, subscriptionPlan, etc.)
- Invalid email format
- Invalid numeric values
- Duplicate slugs

## Best Practices

1. **Always use dry run first** to validate your data
2. **Keep backups** of your CSV files
3. **Use unique slugs** for each organization
4. **Validate email addresses** before importing
5. **Use the template** to ensure correct column names
6. **Start small** with a few records to test your format
7. **Review error messages** carefully before re-importing

## Sample Data

A sample CSV file is included: `sample-organizations.csv`

This file contains 3 example organizations with all fields properly formatted.

## Limitations

- Maximum file size: 10 MB
- Supported formats: CSV and JSON only
- Imports are processed sequentially
- Large imports may take several minutes

## Troubleshooting

### Import fails with "Invalid file type"
- Ensure your file has a `.csv` or `.json` extension
- Check that the file is not corrupted

### "Row X: Name is required" errors
- Verify all required fields are filled in
- Check for extra commas or quotes in your CSV

### "Slug already exists" error
- Slugs must be unique across all organizations
- Use a different slug or update the existing organization

### No error message shown
- Check the browser console for detailed error logs
- Verify the backend server is running

## Security Notes

- Only administrators can perform bulk operations
- File uploads are limited to 10 MB
- Rate limiting: 5 uploads per 15 minutes
- All operations are logged for audit purposes

