# Organization Import Format

This document describes the CSV format for importing organizations into FeedbackFlow.

## Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `name` | String | Organization name (required) | "Acme Corporation" |
| `slug` | String | URL-friendly identifier (required) | "acme-corp" |

## Optional Fields

### Basic Information
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `description` | String | Organization description | "A leading technology company" |
| `contactEmail` | String | Primary contact email | "admin@acme.com" |
| `contactPhone` | String | Contact phone number | "+1-555-0123" |

### Address Information
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `address` | String | Street address | "123 Main St" |
| `city` | String | City | "San Francisco" |
| `state` | String | State/Province | "CA" |
| `zipCode` | String | ZIP/Postal code | "94102" |
| `country` | String | Country | "USA" |

### Web Presence
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `website` | String | Organization website URL | "https://acme.com" |
| `logoUrl` | String | Logo image URL | "https://acme.com/logo.png" |

### Subscription & Limits
| Field | Type | Description | Example | Valid Values |
|-------|------|-------------|---------|--------------|
| `subscriptionPlan` | String | Subscription tier | "professional" | free, basic, professional, enterprise |
| `maxUsers` | Integer | Maximum number of users | "100" | Any positive integer |
| `maxCycles` | Integer | Maximum number of cycles | "10" | Any positive integer |
| `storageLimitGb` | Float | Storage limit in GB | "5" | Any positive number |

### Regional Settings
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `timezone` | String | Organization timezone | "America/Los_Angeles" |
| `language` | String | Default language | "en" |
| `dateFormat` | String | Date format preference | "YYYY-MM-DD" |
| `currency` | String | Default currency | "USD" |

### Working Hours
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `workingDays` | JSON Array | Days of the week (1=Monday, 7=Sunday) | "[1,2,3,4,5]" |
| `workingHoursStart` | String | Start time (24-hour format) | "09:00" |
| `workingHoursEnd` | String | End time (24-hour format) | "17:00" |

## CSV Format Rules

1. **Header Row**: The first row must contain column headers exactly as specified above
2. **Encoding**: Use UTF-8 encoding
3. **Separator**: Comma (`,`) as field separator
4. **Quotes**: Use double quotes (`"`) to wrap fields containing commas, quotes, or newlines
5. **Empty Fields**: Leave fields empty if no value is provided
6. **JSON Fields**: For `workingDays`, use JSON array format: `[1,2,3,4,5]`

## Example CSV Content

```csv
name,slug,description,contactEmail,contactPhone,address,city,state,zipCode,country,website,logoUrl,subscriptionPlan,maxUsers,maxCycles,storageLimitGb,timezone,language,dateFormat,currency,workingDays,workingHoursStart,workingHoursEnd
Acme Corporation,acme-corp,A leading technology company,admin@acme.com,+1-555-0123,123 Main St,San Francisco,CA,94102,USA,https://acme.com,https://acme.com/logo.png,professional,100,10,5,America/Los_Angeles,en,YYYY-MM-DD,USD,"[1,2,3,4,5]",09:00,17:00
TechStart Inc,techstart-inc,Innovative startup company,contact@techstart.com,+1-555-0456,456 Innovation Ave,Austin,TX,78701,USA,https://techstart.com,https://techstart.com/logo.png,basic,50,5,2,America/Chicago,en,MM/DD/YYYY,USD,"[1,2,3,4,5]",08:00,18:00
```

## Validation Rules

### Required Field Validation
- `name`: Must not be empty
- `slug`: Must not be empty and must be URL-friendly (lowercase, hyphens only)

### Format Validation
- `contactEmail`: Must be a valid email format
- `website`: Must be a valid URL format
- `logoUrl`: Must be a valid URL format
- `maxUsers`: Must be a positive integer
- `maxCycles`: Must be a positive integer
- `storageLimitGb`: Must be a positive number
- `workingDays`: Must be valid JSON array with numbers 1-7
- `workingHoursStart/End`: Must be in HH:MM format

### Business Rules
- `slug` must be unique across all organizations
- `subscriptionPlan` must be one of the valid values
- `workingDays` should contain valid day numbers (1-7)
- `workingHoursStart` should be before `workingHoursEnd`

## Error Handling

The import process will:
1. Validate each row individually
2. Report specific errors for each field
3. Continue processing other rows even if some fail
4. Provide a detailed error report showing:
   - Row number
   - Field name
   - Error description

## Tips for Successful Import

1. **Test with Small Files**: Start with a few organizations to test the format
2. **Check Required Fields**: Ensure `name` and `slug` are provided for each row
3. **Validate URLs**: Test that website and logo URLs are accessible
4. **Unique Slugs**: Ensure each organization has a unique slug
5. **Timezone Format**: Use standard timezone identifiers (e.g., "America/New_York")
6. **JSON Arrays**: Be careful with JSON formatting in `workingDays` field

## Default Values

If optional fields are not provided, the following defaults will be used:

- `subscriptionPlan`: "basic"
- `maxUsers`: 10
- `maxCycles`: 10
- `storageLimitGb`: 1
- `timezone`: "UTC"
- `language`: "en"
- `dateFormat`: "YYYY-MM-DD"
- `currency`: "USD"
- `workingDays`: [1,2,3,4,5] (Monday to Friday)
- `workingHoursStart`: "09:00"
- `workingHoursEnd`: "17:00"
