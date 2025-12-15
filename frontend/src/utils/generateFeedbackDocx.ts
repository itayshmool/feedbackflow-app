import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  Packer,
  convertInchesToTwip,
} from 'docx';
import { saveAs } from 'file-saver';
import { Feedback, FeedbackStatus, GoalStatus } from '../types/feedback.types';

// Helper function to sanitize filename - keep spaces, remove only problematic characters
const sanitizeFilename = (name: string): string => {
  return name.replace(/[<>:"/\\|?*]/g, '').trim();
};

// Helper function to format date
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Helper function to get status color and text
const getStatusInfo = (status: FeedbackStatus): { text: string; color: string } => {
  const statusMap: Record<FeedbackStatus, { text: string; color: string }> = {
    [FeedbackStatus.DRAFT]: { text: 'DRAFT', color: '6B7280' },
    [FeedbackStatus.SUBMITTED]: { text: 'SUBMITTED', color: '3B82F6' },
    [FeedbackStatus.UNDER_REVIEW]: { text: 'UNDER REVIEW', color: 'F59E0B' },
    [FeedbackStatus.ACKNOWLEDGED]: { text: 'ACKNOWLEDGED', color: '8B5CF6' },
    [FeedbackStatus.COMPLETED]: { text: 'COMPLETED', color: '10B981' },
    [FeedbackStatus.ARCHIVED]: { text: 'ARCHIVED', color: '6B7280' },
  };
  return statusMap[status] || { text: status, color: '6B7280' };
};

// Helper function to get goal status text
const getGoalStatusText = (status: GoalStatus): string => {
  const statusMap: Record<GoalStatus, string> = {
    [GoalStatus.NOT_STARTED]: 'Not Started',
    [GoalStatus.IN_PROGRESS]: 'In Progress',
    [GoalStatus.ON_HOLD]: 'On Hold',
    [GoalStatus.COMPLETED]: 'Completed',
    [GoalStatus.CANCELLED]: 'Cancelled',
  };
  return statusMap[status] || status;
};

// Helper function to get priority color (kept for future use)
// const getPriorityColor = (priority: string): string => {
//   const priorityMap: Record<string, string> = {
//     'low': '10B981',
//     'medium': 'F59E0B',
//     'high': 'EF4444',
//     'critical': 'DC2626',
//   };
//   return priorityMap[priority.toLowerCase()] || '6B7280';
// };

// Result type for blob generation
export interface DocxGenerationResult {
  blob: Blob;
  filename: string;
}

// Core function to create the DOCX document and return blob
export const createFeedbackDocxBlob = async (feedback: Feedback): Promise<DocxGenerationResult> => {
  const statusInfo = getStatusInfo(feedback.status);

  // Build document sections (can contain both Paragraphs and Tables)
  const sections: (Paragraph | Table)[] = [];

  // Title
  sections.push(
    new Paragraph({
      text: 'Performance Feedback Document',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Confidential notice (if applicable)
  if (feedback.content?.confidential) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '⚠ CONFIDENTIAL DOCUMENT',
            bold: true,
            color: 'DC2626',
            size: 24,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );
  }

  // Metadata Section
  sections.push(
    new Paragraph({
      text: 'Feedback Information',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    })
  );

  // Metadata table
  const metadataRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'From:', bold: true })] })],
          width: { size: 30, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph(feedback.fromUser?.name || feedback.fromUserEmail || 'Unknown')],
          width: { size: 70, type: WidthType.PERCENTAGE },
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'To:', bold: true })] })] }),
        new TableCell({ children: [new Paragraph(feedback.toUser?.name || feedback.toUserEmail || 'Unknown')] }),
      ],
    }),
    // Review Type row removed - single feedback type (Manager Review)
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Status:', bold: true })] })] }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: statusInfo.text,
                  bold: true,
                  color: statusInfo.color,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Created:', bold: true })] })] }),
        new TableCell({ children: [new Paragraph(formatDate(feedback.createdAt))] }),
      ],
    }),
  ];

  if (feedback.cycle) {
    metadataRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Cycle:', bold: true })] })] }),
          new TableCell({ children: [new Paragraph(feedback.cycle.name)] }),
        ],
      })
    );
  }

  sections.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: metadataRows,
    })
  );

  // Horizontal separator
  sections.push(
    new Paragraph({
      border: {
        bottom: { color: 'CCCCCC', space: 1, style: BorderStyle.SINGLE, size: 6 },
      },
      spacing: { before: 300, after: 300 },
    })
  );

  // Overall Feedback
  if (feedback.content?.overallComment) {
    sections.push(
      new Paragraph({
        text: 'Overall Feedback',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );
    sections.push(
      new Paragraph({
        text: feedback.content.overallComment,
        spacing: { after: 300 },
      })
    );
  }

  // Strengths
  if (feedback.content?.strengths && feedback.content.strengths.length > 0) {
    sections.push(
      new Paragraph({
        text: 'Strengths',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );
    feedback.content.strengths.forEach((strength) => {
      sections.push(
        new Paragraph({
          text: strength,
          bullet: { level: 0 },
          spacing: { after: 100 },
        })
      );
    });
    sections.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Areas for Improvement
  if (feedback.content?.areasForImprovement && feedback.content.areasForImprovement.length > 0) {
    sections.push(
      new Paragraph({
        text: 'Areas for Improvement',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );
    feedback.content.areasForImprovement.forEach((area) => {
      sections.push(
        new Paragraph({
          text: area,
          bullet: { level: 0 },
          spacing: { after: 100 },
        })
      );
    });
    sections.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Specific Examples
  if (feedback.content?.specificExamples && feedback.content.specificExamples.length > 0) {
    sections.push(
      new Paragraph({
        text: 'Specific Examples',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );
    feedback.content.specificExamples.forEach((example) => {
      sections.push(
        new Paragraph({
          text: example,
          numbering: { reference: 'numbered-list', level: 0 },
          spacing: { after: 100 },
        })
      );
    });
    sections.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Recommendations
  if (feedback.content?.recommendations && feedback.content.recommendations.length > 0) {
    sections.push(
      new Paragraph({
        text: 'Recommendations',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );
    feedback.content.recommendations.forEach((recommendation) => {
      sections.push(
        new Paragraph({
          text: recommendation,
          bullet: { level: 0 },
          spacing: { after: 100 },
        })
      );
    });
    sections.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Development Goals
  if (feedback.goals && feedback.goals.length > 0) {
    sections.push(
      new Paragraph({
        text: 'Development Goals',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    feedback.goals.forEach((goal, index) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Goal ${index + 1}: ${goal.title}`,
              bold: true,
              size: 24,
            }),
          ],
          spacing: { before: 200, after: 100 },
        })
      );

      sections.push(
        new Paragraph({
          text: goal.description,
          spacing: { after: 100 },
        })
      );

      // Goal details
      const goalDetails = [
        `Category: ${goal.category.replace('_', ' ')}`,
        `Priority: ${goal.priority}`,
        `Target Date: ${formatDate(goal.targetDate)}`,
        `Status: ${getGoalStatusText(goal.status)}`,
        `Progress: ${goal.progress}%`,
      ];

      goalDetails.forEach((detail) => {
        sections.push(
          new Paragraph({
            text: `• ${detail}`,
            spacing: { after: 50 },
          })
        );
      });

      sections.push(new Paragraph({ text: '', spacing: { after: 200 } }));
    });
  }

  // Ratings
  if (feedback.ratings && feedback.ratings.length > 0) {
    sections.push(
      new Paragraph({
        text: 'Ratings',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    feedback.ratings.forEach((rating) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${rating.category}${rating.subcategory ? ` - ${rating.subcategory}` : ''}: `,
              bold: true,
            }),
            new TextRun({
              text: `${rating.score}/${rating.maxScore}`,
            }),
          ],
          spacing: { after: 100 },
        })
      );

      if (rating.comment) {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: rating.comment, italics: true })],
            spacing: { after: 100 },
          })
        );
      }
    });
    sections.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Acknowledgment
  if (feedback.acknowledgment) {
    sections.push(
      new Paragraph({
        text: 'Acknowledgment',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Acknowledged on: ',
            bold: true,
          }),
          new TextRun({
            text: formatDate(feedback.acknowledgment.acknowledgedAt),
          }),
        ],
        spacing: { after: 200 },
      })
    );

    if (feedback.acknowledgment.response) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Response:',
              bold: true,
            }),
          ],
          spacing: { after: 100 },
        })
      );
      sections.push(
        new Paragraph({
          text: feedback.acknowledgment.response,
          spacing: { after: 200 },
        })
      );
    }

    if (feedback.acknowledgment.actionPlan) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Action Plan:',
              bold: true,
            }),
          ],
          spacing: { after: 100 },
        })
      );

      if (feedback.acknowledgment.actionPlan.goals && feedback.acknowledgment.actionPlan.goals.length > 0) {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: 'Goals:', bold: true })],
            spacing: { before: 100, after: 50 },
          })
        );
        feedback.acknowledgment.actionPlan.goals.forEach((goal) => {
          sections.push(
            new Paragraph({
              text: `${goal.title}: ${goal.description}`,
              bullet: { level: 0 },
              spacing: { after: 50 },
            })
          );
        });
      }

      if (feedback.acknowledgment.actionPlan.developmentAreas && feedback.acknowledgment.actionPlan.developmentAreas.length > 0) {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: 'Development Areas:', bold: true })],
            spacing: { before: 100, after: 50 },
          })
        );
        feedback.acknowledgment.actionPlan.developmentAreas.forEach((area) => {
          sections.push(
            new Paragraph({
              text: area,
              bullet: { level: 0 },
              spacing: { after: 50 },
            })
          );
        });
      }
    }
  }

  // Comments
  if (feedback.comments && feedback.comments.length > 0) {
    sections.push(
      new Paragraph({
        border: {
          bottom: { color: 'CCCCCC', space: 1, style: BorderStyle.SINGLE, size: 6 },
        },
        spacing: { before: 300, after: 300 },
      })
    );

    sections.push(
      new Paragraph({
        text: `Comments (${feedback.comments.length})`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    feedback.comments.forEach((comment, idx) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Comment ${idx + 1}`,
              bold: true,
            }),
            new TextRun({
              text: comment.isPrivate ? ' [PRIVATE]' : '',
              color: 'DC2626',
              bold: true,
            }),
          ],
          spacing: { before: 200, after: 100 },
        })
      );

      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `By: ${comment.user?.name || 'Unknown'} • `,
              italics: true,
            }),
            new TextRun({
              text: formatDate(comment.createdAt),
              italics: true,
            }),
          ],
          spacing: { after: 100 },
        })
      );

      sections.push(
        new Paragraph({
          text: comment.content,
          spacing: { after: 200 },
        })
      );
    });
  }

  // Footer
  sections.push(
    new Paragraph({
      border: {
        top: { color: 'CCCCCC', space: 1, style: BorderStyle.SINGLE, size: 6 },
      },
      spacing: { before: 400, after: 200 },
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Document generated on ${new Date().toLocaleString()}`,
          italics: true,
          size: 18,
          color: '6B7280',
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  );

  // Create document
  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'numbered-list',
          levels: [
            {
              level: 0,
              format: 'decimal',
              text: '%1.',
              alignment: AlignmentType.LEFT,
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        children: sections,
      },
    ],
  });

  // Generate filename
  const fromName = sanitizeFilename(feedback.fromUser?.name || 'Unknown');
  const toName = sanitizeFilename(feedback.toUser?.name || 'Unknown');
  const date = new Date().toISOString().split('T')[0];
  const filename = `Feedback - ${fromName} to ${toName} - ${date}.docx`;

  // Convert to blob with proper MIME type
  const blob = await Packer.toBlob(doc);
  const docxBlob = new Blob([blob], { 
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
  });
  
  return { blob: docxBlob, filename };
};

// Main function to generate and download DOCX (backward compatible)
export const generateFeedbackDocx = async (feedback: Feedback): Promise<void> => {
  const { blob, filename } = await createFeedbackDocxBlob(feedback);
  saveAs(blob, filename);
};

