import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Packer,
  convertInchesToTwip,
} from 'docx';
import { saveAs } from 'file-saver';

// TeamInsight interface (matching ManagerDashboard)
export interface TeamInsight {
  generatedAt: string;
  summary: string;
  themes: string[];
  strengths: Array<{
    title: string;
    description: string;
    employeesExcelling: string[];
  }>;
  areasForImprovement: Array<{
    title: string;
    description: string;
    frequency: string;
    suggestedActions: string[];
  }>;
  individualHighlights: Array<{
    employeeName: string;
    positiveHighlight: string;
    growthOpportunity: string;
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    reason: string;
    timeline: string;
  }>;
  teamHealthScore: number | null;
  confidenceLevel: 'high' | 'medium' | 'low';
  teamSize: number;
  feedbackCount: number;
}

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

// Helper function to get priority color
const getPriorityColor = (priority: string): string => {
  const priorityMap: Record<string, string> = {
    high: 'DC2626',
    medium: 'F59E0B',
    low: '10B981',
  };
  return priorityMap[priority.toLowerCase()] || '6B7280';
};

// Helper function to get confidence level color
const getConfidenceColor = (level: string): string => {
  const levelMap: Record<string, string> = {
    high: '10B981',
    medium: 'F59E0B',
    low: 'DC2626',
  };
  return levelMap[level.toLowerCase()] || '6B7280';
};

// Result type for blob generation
export interface DocxGenerationResult {
  blob: Blob;
  filename: string;
}

// Core function to create the DOCX document and return blob
export const createInsightsDocxBlob = async (
  insights: TeamInsight,
  managerName?: string
): Promise<DocxGenerationResult> => {
  // Build document sections
  // Build document sections
  const sections: Paragraph[] = [];

  // Title
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '✨ AI Team Insights Report',
          bold: true,
          size: 48,
          color: '7C3AED',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // Subtitle
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'AI-Powered Analysis of Team Feedback Patterns',
          italics: true,
          size: 24,
          color: '6B7280',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Metadata Section - Inline format for better readability
  const metadataItems: { label: string; value: string; color?: string }[] = [];

  if (managerName) {
    metadataItems.push({ label: 'Manager', value: managerName });
  }
  metadataItems.push({ label: 'Generated', value: formatDate(insights.generatedAt) });
  metadataItems.push({ label: 'Team Size', value: `${insights.teamSize} members` });
  metadataItems.push({ label: 'Feedback Analyzed', value: `${insights.feedbackCount} items` });
  metadataItems.push({ 
    label: 'Confidence', 
    value: insights.confidenceLevel.toUpperCase(),
    color: getConfidenceColor(insights.confidenceLevel)
  });
  if (insights.teamHealthScore !== null) {
    metadataItems.push({ 
      label: 'Health Score', 
      value: `${insights.teamHealthScore}/100`,
      color: insights.teamHealthScore >= 70 ? '10B981' : insights.teamHealthScore >= 50 ? 'F59E0B' : 'DC2626'
    });
  }

  // Create readable metadata paragraphs - each item on its own line
  metadataItems.forEach((item) => {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${item.label}: `, bold: true, size: 22 }),
          new TextRun({ text: item.value, color: item.color, size: 22 }),
        ],
        spacing: { after: 80 },
      })
    );
  });

  // Separator
  sections.push(
    new Paragraph({
      border: {
        bottom: { color: '7C3AED', space: 1, style: BorderStyle.SINGLE, size: 6 },
      },
      spacing: { before: 300, after: 300 },
    })
  );

  // Executive Summary
  sections.push(
    new Paragraph({
      text: '📋 Executive Summary',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    })
  );
  sections.push(
    new Paragraph({
      text: insights.summary,
      spacing: { after: 300 },
    })
  );

  // Key Themes
  if (insights.themes && insights.themes.length > 0) {
    sections.push(
      new Paragraph({
        text: '🎯 Key Themes',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );
    insights.themes.forEach((theme) => {
      sections.push(
        new Paragraph({
          text: theme,
          bullet: { level: 0 },
          spacing: { after: 100 },
        })
      );
    });
    sections.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Team Strengths
  if (insights.strengths && insights.strengths.length > 0) {
    sections.push(
      new Paragraph({
        text: '💪 Team Strengths',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    insights.strengths.forEach((strength, index) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${index + 1}. ${strength.title}`,
              bold: true,
              size: 24,
            }),
          ],
          spacing: { before: 200, after: 100 },
        })
      );

      sections.push(
        new Paragraph({
          text: strength.description,
          spacing: { after: 100 },
        })
      );

      if (strength.employeesExcelling && strength.employeesExcelling.length > 0) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Top performers: ',
                bold: true,
                italics: true,
              }),
              new TextRun({
                text: strength.employeesExcelling.join(', '),
                italics: true,
                color: '10B981',
              }),
            ],
            spacing: { after: 150 },
          })
        );
      }
    });
    sections.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Areas for Improvement
  if (insights.areasForImprovement && insights.areasForImprovement.length > 0) {
    sections.push(
      new Paragraph({
        text: '📈 Areas for Improvement',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    insights.areasForImprovement.forEach((area, index) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${index + 1}. ${area.title}`,
              bold: true,
              size: 24,
            }),
            new TextRun({
              text: ` (${area.frequency})`,
              italics: true,
              color: '6B7280',
            }),
          ],
          spacing: { before: 200, after: 100 },
        })
      );

      sections.push(
        new Paragraph({
          text: area.description,
          spacing: { after: 100 },
        })
      );

      if (area.suggestedActions && area.suggestedActions.length > 0) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Suggested Actions:',
                bold: true,
              }),
            ],
            spacing: { before: 100, after: 50 },
          })
        );
        area.suggestedActions.forEach((action) => {
          sections.push(
            new Paragraph({
              text: action,
              bullet: { level: 0 },
              spacing: { after: 50 },
            })
          );
        });
      }
    });
    sections.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Individual Highlights
  if (insights.individualHighlights && insights.individualHighlights.length > 0) {
    sections.push(
      new Paragraph({
        text: '👤 Individual Highlights',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    insights.individualHighlights.forEach((highlight) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: highlight.employeeName,
              bold: true,
              size: 24,
            }),
          ],
          spacing: { before: 200, after: 100 },
        })
      );

      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '✅ Strength: ',
              bold: true,
              color: '10B981',
            }),
            new TextRun({
              text: highlight.positiveHighlight,
            }),
          ],
          spacing: { after: 50 },
        })
      );

      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '🎯 Growth Opportunity: ',
              bold: true,
              color: 'F59E0B',
            }),
            new TextRun({
              text: highlight.growthOpportunity,
            }),
          ],
          spacing: { after: 150 },
        })
      );
    });
    sections.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Recommendations
  if (insights.recommendations && insights.recommendations.length > 0) {
    sections.push(
      new Paragraph({
        text: '💡 Recommendations',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    // Sort by priority: high, medium, low
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const sortedRecommendations = [...insights.recommendations].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    sortedRecommendations.forEach((rec, index) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${index + 1}. `,
              bold: true,
            }),
            new TextRun({
              text: `[${rec.priority.toUpperCase()}] `,
              bold: true,
              color: getPriorityColor(rec.priority),
            }),
            new TextRun({
              text: rec.action,
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
              text: 'Reason: ',
              bold: true,
            }),
            new TextRun({
              text: rec.reason,
            }),
          ],
          spacing: { after: 50 },
        })
      );

      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Timeline: ',
              bold: true,
            }),
            new TextRun({
              text: rec.timeline,
              italics: true,
            }),
          ],
          spacing: { after: 150 },
        })
      );
    });
  }

  // Footer
  sections.push(
    new Paragraph({
      border: {
        top: { color: '7C3AED', space: 1, style: BorderStyle.SINGLE, size: 6 },
      },
      spacing: { before: 400, after: 200 },
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `This report was generated by AI based on team feedback data. `,
          italics: true,
          size: 18,
          color: '6B7280',
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Document exported on ${new Date().toLocaleString()}`,
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
  const date = new Date().toISOString().split('T')[0];
  const filename = `AI Team Insights - ${date}.docx`;

  // Convert to blob with proper MIME type
  const blob = await Packer.toBlob(doc);
  const docxBlob = new Blob([blob], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  
  return { blob: docxBlob, filename };
};

// Main function to generate and download DOCX (backward compatible)
export const generateInsightsDocx = async (
  insights: TeamInsight,
  managerName?: string
): Promise<void> => {
  const { blob, filename } = await createInsightsDocxBlob(insights, managerName);
  saveAs(blob, filename);
};

