# FEEDBACKFLOW - TEMPLATES FEATURE USER STORIES
# File: .cursorrules-templates
# Purpose: Template management and usage functionality context
# Last Updated: 2025

## FEATURE OVERVIEW

The Templates feature allows organizations to provide standardized feedback document templates that users can download, complete offline, and upload back to the system as attachments to their feedback submissions. This feature bridges the gap between traditional document-based feedback processes and modern web-based feedback management.

### Core Concept:
- **Admins** create and upload template documents (Word, PDF)
- **Users** download templates, complete them offline, and upload completed documents
- **System** stores completed documents as attachments to feedback records
- **No parsing** - documents are stored as-is without field extraction

### Key Benefits:
- Flexibility for users who prefer offline document editing
- Standardization of feedback structure across organization
- Support for detailed, formatted feedback with rich text
- Familiar workflow for users transitioning from traditional processes
- Ability to include examples, guidelines, and best practices in templates

## ADMIN USER STORIES

### User Story TA1: Upload Feedback Template
**As an Admin, I want to upload feedback template documents so that users can download and use standardized formats for giving feedback.**

**Acceptance Criteria:**
- Upload template documents in multiple formats (Word .docx, PDF .pdf)
- Set template metadata (name, description, category, type)
- Specify which feedback types the template applies to (manager, peer, self, project, 360°)
- Define which user roles can access the template (all, managers only, etc.)
- Set template as active or inactive for availability control
- Preview template before publishing
- See confirmation of successful upload with template details

**Dashboard Features:**
- Template upload interface with drag-and-drop or file browser
- Template metadata form with required and optional fields
- Template preview functionality to view uploaded document
- Template categorization with tags and labels
- Role-based access control selector for template visibility
- Template status toggle (active/inactive/draft)
- Upload progress indicator with success/error messaging

**API Endpoints:**
```
POST   /api/v1/templates                    # Upload new template
GET    /api/v1/templates                    # List all templates
GET    /api/v1/templates/:id                # Get template details
GET    /api/v1/templates/:id/preview        # Preview template file
```

**Validation Rules:**
- Supported file formats: .docx, .pdf (max 10MB per file)
- Required fields: name, description, template type
- Template name must be unique within organization
- File must be virus-scanned before upload
- Validate file is not corrupted and can be opened

---

### User Story TA2: Manage Template Library
**As an Admin, I want to manage the template library so that I can keep templates organized, up-to-date, and relevant.**

**Acceptance Criteria:**
- View all templates in a searchable, filterable list
- Edit template metadata without replacing the file
- Replace template file while maintaining template history
- Delete templates (with confirmation and usage check)
- Duplicate existing templates for creating variations
- Organize templates by category, type, and tags
- See template usage statistics (download count, usage in feedback)
- Archive unused templates without deleting them

**Dashboard Features:**
- Template management dashboard with grid/list view
- Search and filter by name, category, type, status, date
- Bulk actions (activate, deactivate, delete, archive)
- Template edit modal for metadata updates
- Template version history viewer
- Usage analytics per template (downloads, feedback attachments)
- Archive section for inactive templates
- Template duplicate/clone functionality

**API Endpoints:**
```
PUT    /api/v1/templates/:id                # Update template metadata
PUT    /api/v1/templates/:id/file           # Replace template file
DELETE /api/v1/templates/:id                # Delete template
POST   /api/v1/templates/:id/duplicate      # Duplicate template
GET    /api/v1/templates/:id/analytics      # Get usage statistics
```

**Business Rules:**
- Cannot delete template if currently attached to feedback
- Must provide reason/notes when archiving templates
- Template versions maintained for audit trail
- Deletion requires admin confirmation if usage count > 0

---

### User Story TA3: Configure Template Settings
**As an Admin, I want to configure template settings and permissions so that templates are available to the right people at the right time.**

**Acceptance Criteria:**
- Set which feedback cycles can use specific templates
- Configure template availability by department or team
- Set template visibility by user role (employee, manager, admin)
- Enable/disable template downloads globally or per template
- Configure automatic suggestions for template usage
- Set mandatory vs. optional template usage for feedback types
- Configure file size limits and allowed formats

**Dashboard Features:**
- Template configuration panel with permission matrix
- Cycle-template mapping interface
- Department/team access control settings
- Role-based visibility toggles
- Global template settings page
- Template recommendation rules engine
- Format and size limit configuration

**API Endpoints:**
```
PUT    /api/v1/templates/:id/permissions    # Update permissions
PUT    /api/v1/templates/:id/availability   # Set availability rules
GET    /api/v1/templates/settings           # Get global settings
PUT    /api/v1/templates/settings           # Update global settings
```

**Configuration Options:**
- Template availability: all users, specific roles, specific departments
- Cycle restrictions: all cycles, specific cycle types
- Usage mode: optional, recommended, required
- Download restrictions: authenticated users, specific roles
- File format restrictions: docx only, pdf only, both

---

### User Story TA4: Monitor Template Usage
**As an Admin, I want to monitor how templates are being used so that I can optimize the template library and identify improvements.**

**Acceptance Criteria:**
- View download statistics per template
- See which users are downloading which templates
- Track how many feedback submissions include template attachments
- Analyze template usage trends over time
- Identify unused or underutilized templates
- View feedback completion rates with vs. without templates
- Generate template usage reports for leadership

**Dashboard Features:**
- Template analytics dashboard with visualizations
- Usage trends over time (line charts, bar graphs)
- Most/least popular templates ranking
- User engagement metrics with templates
- Download vs. attachment rate comparison
- Feedback quality correlation with template usage
- Exportable usage reports (CSV, PDF)
- Template effectiveness scoring

**API Endpoints:**
```
GET    /api/v1/templates/analytics          # Overall template analytics
GET    /api/v1/templates/:id/analytics      # Specific template analytics
GET    /api/v1/templates/reports            # Generate usage reports
GET    /api/v1/templates/:id/downloads      # Download history
```

**Analytics Metrics:**
- Total downloads per template
- Unique users who downloaded template
- Attachment rate (downloads that became feedback attachments)
- Average time from download to feedback submission
- Feedback completion rate with templates
- Template satisfaction ratings (if collected)

---

### User Story TA5: Template Content Guidelines
**As an Admin, I want to provide guidelines for creating effective templates so that the template library maintains high quality and consistency.**

**Acceptance Criteria:**
- Access template creation best practices guide
- View example templates for different feedback types
- See template design guidelines (structure, format, length)
- Understand required vs. optional template sections
- Get recommendations for template content and prompts
- Review organizational branding guidelines for templates

**Dashboard Features:**
- Template guidelines documentation section
- Example template gallery with downloads
- Template creation wizard with best practices
- Design checklist for template quality
- Branding assets library (logos, colors, fonts)
- Template testing and validation tools

**Resources Provided:**
- Template structure recommendations
- Effective feedback prompt examples
- Formatting and styling guidelines
- Accessibility requirements for templates
- File size optimization tips
- Multi-language template guidance

---

## USER STORIES (Employees, Managers)

### User Story TU1: Browse and Select Template
**As a User, I want to browse available feedback templates so that I can choose the most appropriate format for the feedback I need to provide.**

**Acceptance Criteria:**
- View list of templates available for my current feedback task
- Filter templates by feedback type (manager review, peer feedback, etc.)
- See template descriptions and previews
- Understand which templates are recommended for specific situations
- View template categories and tags
- See template file size and format before downloading
- Access template usage instructions and guidelines

**Dashboard Features:**
- Template selection interface within feedback creation flow
- Template gallery with thumbnails/icons
- Template cards showing name, description, type, format
- Filter and search functionality
- Template preview modal (view first page or description)
- Recommended templates highlighted based on feedback context
- Download button with file format indicator
- Template rating/feedback system (optional)

**API Endpoints:**
```
GET    /api/v1/templates?feedbackType=manager    # Get templates by type
GET    /api/v1/templates/:id                     # Get template details
GET    /api/v1/templates/:id/preview             # Preview template
```

**User Experience Flow:**
1. User initiates feedback creation for a direct report
2. System shows option: "Use Template" or "Fill Form"
3. User clicks "Use Template"
4. System displays available templates filtered for "Manager Feedback"
5. User browses templates, reads descriptions
6. User previews template to see structure
7. User selects appropriate template
8. User downloads template file

---

### User Story TU2: Download Feedback Template
**As a User, I want to download a feedback template so that I can complete it offline at my convenience.**

**Acceptance Criteria:**
- Download template file in original format (.docx or .pdf)
- Template downloads with clear filename (includes template name, date)
- Download is tracked for analytics purposes
- Template includes guidance text and instructions
- Pre-filled information included where appropriate (employee name, cycle, date)
- Template maintains consistent branding and formatting
- Download works on desktop and mobile devices
- Can download template multiple times if needed

**Dashboard Features:**
- Prominent download button on template selection page
- Download confirmation with file name and format
- Download progress indicator for large files
- Option to download template for future use
- Download history accessible in user profile
- Template opened automatically after download (optional)
- Email delivery option for template download link

**API Endpoints:**
```
GET    /api/v1/templates/:id/download             # Download template file
POST   /api/v1/templates/:id/download-tracking    # Track download event
```

**Download Process:**
1. User clicks "Download Template"
2. System generates download with optional pre-filled data
3. File downloads with naming: `ManagerFeedback_Template_JohnDoe_2025-01-15.docx`
4. System tracks download event (user, template, timestamp)
5. User receives download confirmation
6. Template opens in user's default application (Word, PDF reader)

**Pre-filled Information Options:**
- Employee/recipient name
- Manager/reviewer name
- Review cycle name and period
- Current date
- Department/team information
- Previous feedback reference number (optional)

---

### User Story TU3: Complete Template Offline
**As a User, I want to complete the feedback template offline so that I can work on it at my own pace without internet connection.**

**Acceptance Criteria:**
- Template opens in familiar applications (Microsoft Word, PDF reader)
- All sections and prompts are clearly labeled and editable
- Template includes instructions and examples for each section
- Formatting and structure are preserved during editing
- Can save progress locally and continue later
- Template is printable if needed
- No technical issues opening or editing the file

**Template Structure Guidelines:**
- Clear section headers (Background, Strengths, Areas for Improvement, Goals)
- Instructional text in italics or different color
- Adequate space for detailed responses
- Optional rating scales or checkboxes
- Examples of effective feedback (can be deleted)
- Page numbers and clear organization
- Footer with submission instructions

**User Offline Experience:**
- Opens template in Microsoft Word or equivalent
- Reads instructions at top of document
- Fills in feedback section by section
- Uses provided prompts and examples as guidance
- Saves document locally with progress
- Can return to document multiple times before uploading
- Formats text, adds bullet points, makes it readable

---

### User Story TU4: Upload Completed Template
**As a User, I want to upload my completed feedback template so that it becomes part of the official feedback record.**

**Acceptance Criteria:**
- Upload completed document through feedback submission interface
- Support multiple file formats (.docx, .pdf, potentially .doc)
- Validate file size is within limits (max 10MB)
- Confirm file is attached before allowing submission
- Preview uploaded document to verify it's correct
- Option to replace uploaded document before final submission
- See upload progress for large files
- Receive confirmation of successful upload

**Dashboard Features:**
- Document upload area with drag-and-drop support
- File browser button for traditional upload
- Upload progress bar with percentage
- Preview of uploaded document (thumbnail or viewer)
- Replace/remove uploaded document option
- File validation messages (format, size, errors)
- Multiple document upload support (main template + attachments)
- Upload status indicator (pending, uploaded, verified)

**API Endpoints:**
```
POST   /api/v1/feedback/:feedbackId/attachments      # Upload document
GET    /api/v1/feedback/:feedbackId/attachments      # List attachments
GET    /api/v1/feedback/:feedbackId/attachments/:id  # Download attachment
DELETE /api/v1/feedback/:feedbackId/attachments/:id  # Remove attachment
```

**Upload Validation:**
- File format check (.docx, .pdf, .doc allowed)
- File size validation (max 10MB)
- Virus scan before acceptance
- Duplicate detection (prevent same file twice)
- File integrity check (not corrupted)
- Template origin verification (if possible)

**User Upload Flow:**
1. User completes feedback template offline
2. User returns to feedback submission page
3. User clicks "Upload Completed Template"
4. User selects file from computer
5. System validates and uploads file
6. User sees preview of uploaded document
7. User can add additional comments in web form (optional)
8. User submits feedback with attached document

---

### User Story TU5: Submit Feedback with Template
**As a User, I want to submit feedback with my completed template attached so that the recipient can access my detailed feedback.**

**Acceptance Criteria:**
- Submit feedback with template document attached
- Option to add additional comments in web form alongside template
- Confirm that document is successfully attached before submission
- Recipient receives notification with document download option
- Document is permanently linked to feedback record
- Can view submission confirmation with attachment details
- Template cannot be modified after submission
- Audit trail records who submitted what document when

**Dashboard Features:**
- Feedback submission summary showing attached documents
- Optional web form fields for quick summary/highlights
- Submission confirmation checkbox with document verification
- Preview before final submission
- Submission success page with document attachment confirmation
- Email notification preview showing how recipient will see it
- Post-submission view showing feedback with attachment

**Submission Process:**
1. User uploads completed template (previous step)
2. User optionally fills summary fields in web form
3. User reviews submission preview (shows document attached)
4. User clicks "Submit Feedback"
5. System validates all required elements
6. System creates feedback record with document attachment
7. System sends notification to recipient
8. User sees confirmation: "Feedback submitted with attachment"

**Post-Submission:**
- Feedback status: "Submitted"
- Attachment status: "Attached"
- Recipient can download attached template
- Sender can view but not edit submitted feedback
- Document becomes part of permanent record
- Accessible in feedback history with download option

---

### User Story TU6: View Feedback with Template Attachment
**As a User receiving feedback, I want to view and download feedback templates attached to my reviews so that I can read the detailed feedback provided.**

**Acceptance Criteria:**
- See notification that feedback includes an attached document
- View feedback record showing document attachment
- Download attached document to read complete feedback
- Open document in appropriate application
- See who provided the feedback and when
- Access document multiple times from feedback history
- Optionally read any summary text provided in web form
- Reply to feedback via comment system

**Dashboard Features:**
- Feedback card showing attachment icon/indicator
- Document attachment section with download button
- Document preview functionality (optional)
- File information (name, type, size, upload date)
- Download confirmation and tracking
- Integration with feedback discussion/comment feature
- Print-friendly view of feedback including document metadata
- Mobile-optimized document viewing

**API Endpoints:**
```
GET    /api/v1/feedback/:id                        # Get feedback with attachments
GET    /api/v1/feedback/:id/attachments/:attachId  # Download specific attachment
```

**Viewing Experience:**
1. User receives notification: "You have new feedback from [Manager]"
2. User opens feedback in dashboard
3. User sees: "Feedback includes 1 attached document"
4. User clicks "Download Feedback Document"
5. Document downloads: `Feedback_From_Manager_2025-01-15.docx`
6. User opens and reads complete feedback offline
7. User returns to platform to acknowledge or comment on feedback

---

## TEMPLATE TYPES AND EXAMPLES

### Manager-to-Employee Feedback Template
**Sections:**
- Employee Information (pre-filled)
- Review Period
- Overall Performance Summary
- Key Achievements and Strengths
- Areas for Development
- Specific Examples and Situations
- Goals for Next Period
- Development Plan and Support Needed
- Manager Comments and Recommendations

**Use Case:** Annual reviews, quarterly check-ins, performance discussions

---

### Peer Feedback Template
**Sections:**
- Colleague Information
- Collaboration Context (projects worked together)
- Collaboration Effectiveness
- Technical/Functional Skills Observation
- Communication and Teamwork
- Strengths and Positive Contributions
- Constructive Feedback and Suggestions
- Examples of Effective Collaboration

**Use Case:** 360-degree reviews, project retrospectives, peer evaluations

---

### Self-Assessment Template
**Sections:**
- Review Period Summary
- Key Achievements and Accomplishments
- Challenges Faced and How Addressed
- Skills Developed
- Self-Rating on Key Competencies
- Areas for Future Development
- Career Goals and Aspirations
- Support Needed from Manager/Organization

**Use Case:** Self-evaluations before manager reviews, personal development planning

---

### Project Feedback Template
**Sections:**
- Project Information
- Team Member Role and Contributions
- Project Deliverables and Quality
- Collaboration and Communication
- Problem-Solving and Initiative
- Lessons Learned
- Recommendations for Future Projects
- Overall Project Performance Assessment

**Use Case:** Project completion reviews, project-specific feedback

---

### 360-Degree Review Template
**Sections:**
- Relationship to Person Being Reviewed
- Leadership and Influence
- Communication Skills
- Technical Competence
- Collaboration and Teamwork
- Decision Making and Problem Solving
- Strengths and Positive Attributes
- Areas for Development
- Specific Examples and Situations
- Overall Effectiveness Rating

**Use Case:** Comprehensive multi-perspective evaluations, leadership assessments

---

## TECHNICAL IMPLEMENTATION DETAILS

### File Storage:
- Templates stored in cloud storage (AWS S3, Azure Blob, Google Cloud Storage)
- Organized by: `/templates/[templateId]/[filename]`
- Attachments stored in: `/feedback-attachments/[feedbackId]/[filename]`
- Versioning enabled for template updates
- Automatic backup and redundancy

### File Handling:
- Supported formats: .docx, .pdf, .doc
- Max file size: 10MB per file
- Virus scanning on upload (ClamAV or similar)
- File integrity validation
- Secure download links with expiration (for email links)
- Download tracking and analytics

### Security:
- Role-based access control for template management
- User authentication required for template download
- Audit logging for all template operations
- Encrypted storage for sensitive templates
- Secure file download with time-limited tokens
- Virus and malware scanning on all uploads

### Performance:
- CDN integration for fast template downloads
- Lazy loading for template previews
- Compressed file storage where appropriate
- Efficient database queries for template listing
- Caching for frequently accessed templates

---

## INTEGRATION WITH EXISTING MODULES

### Integration with Feedback Module:
- Templates appear as option during feedback creation
- Attachments linked to feedback records
- Template usage tracked in feedback analytics
- Feedback status includes attachment status

### Integration with Cycles Module:
- Templates can be cycle-specific
- Admin can configure which templates available per cycle
- Cycle statistics include template usage metrics

### Integration with Analytics Module:
- Track template download rates
- Measure feedback completion rates with vs. without templates
- Analyze template effectiveness and popularity
- Generate template usage reports

### Integration with Notifications Module:
- Notify users when new templates are available
- Alert recipients when feedback includes attachments
- Remind users to download templates for pending feedback

---

## USER EXPERIENCE CONSIDERATIONS

### Workflow Flexibility:
- Templates are OPTIONAL, not mandatory (unless admin configures otherwise)
- Users can choose between web form or template approach
- Users can use BOTH web form and template attachment
- No penalty for not using templates

### Progressive Enhancement:
- Basic file upload works everywhere
- Enhanced preview/viewer for modern browsers
- Graceful degradation for older systems
- Mobile-optimized upload and download

### User Guidance:
- Clear instructions at each step
- Contextual help and tooltips
- Video tutorials for template workflow
- FAQ section for common questions
- Support contact for issues

### Accessibility:
- Templates follow accessibility guidelines
- Screen reader compatible document structure
- Keyboard navigation support
- High contrast and readable fonts in templates
- Alternative text for images in templates

---

## SUCCESS METRICS

### Adoption Metrics:
- Percentage of users who download templates
- Template usage rate by feedback type
- User satisfaction with template feature
- Time saved using templates vs. web form

### Quality Metrics:
- Feedback completion rates with templates
- Feedback depth and detail with templates
- User ratings of template usefulness
- Template attachment rate (downloads → uploads)

### Administrative Metrics:
- Template library size and diversity
- Template maintenance effort
- Template update frequency
- User support requests related to templates

### Business Impact:
- Increased feedback completion rates
- Improved feedback quality scores
- Reduced friction in feedback process
- Higher user satisfaction with feedback system
