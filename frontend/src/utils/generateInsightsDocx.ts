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

// Types for Team Insights
interface TeamInsight {
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
  provider?: string;
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
    'high': 'DC2626',
    'medium': 'F59E0B',
    'low': '3B82F6',
  };
  return priorityMap[priority.toLowerCase()] || '6B7280';
};

// Main function to generate Insights DOCX
export const generateInsightsDocx = async (
  insights: TeamInsight,
  managerName: string = 'Manager'
): Promise<void> => {
  const sections: (Paragraph | Table)[] = [];

  // Title
  sections.push(
    new Paragraph({
      text: 'AI Team Insights Report',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // Subtitle
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated for ${managerName}`,
          italics: true,
          color: '6B7280',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Metadata Section
  sections.push(
    new Paragraph({
      text: 'Report Overview',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    })
  );

  // Metadata table
  const metadataRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Generated:', bold: true })] })],
          width: { size: 30, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph(formatDate(insights.generatedAt))],
          width: { size: 70, type: WidthType.PERCENTAGE },
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Team Size:', bold: true })] })] }),
        new TableCell({ children: [new Paragraph(`${insights.teamSize} team members`)] }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Feedback Analyzed:', bold: true })] })] }),
        new TableCell({ children: [new Paragraph(`${insights.feedbackCount} feedback items`)] }),
      ],
    }),
  ];

  if (insights.teamHealthScore !== null) {
    metadataRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Team Health Score:', bold: true })] })] }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${insights.teamHealthScore}/10`,
                    bold: true,
                    color: insights.teamHealthScore >= 7 ? '10B981' : insights.teamHealthScore >= 5 ? 'F59E0B' : 'EF4444',
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  }

  metadataRows.push(
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Confidence Level:', bold: true })] })] }),
        new TableCell({ children: [new Paragraph(insights.confidenceLevel.toUpperCase())] }),
      ],
    })
  );

  if (insights.provider) {
    metadataRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'AI Provider:', bold: true })] })] }),
          new TableCell({ children: [new Paragraph(insights.provider.toUpperCase())] }),
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

  // Separator
  sections.push(
    new Paragraph({
      border: { bottom: { color: 'CCCCCC', space: 1, style: BorderStyle.SINGLE, size: 6 } },
      spacing: { before: 300, after: 300 },
    })
  );

  // Executive Summary
  sections.push(
    new Paragraph({
      text: 'Executive Summary',
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
        text: 'Key Themes',
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
        text: 'Team Strengths',
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
              color: '10B981',
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
              new TextRun({ text: 'Team members excelling: ', italics: true }),
              new TextRun({ text: strength.employeesExcelling.join(', ') }),
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
        text: 'Areas for Growth',
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
              color: 'F59E0B',
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
      if (area.frequency) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Frequency: ', bold: true }),
              new TextRun({ text: area.frequency }),
            ],
            spacing: { after: 100 },
          })
        );
      }
      if (area.suggestedActions && area.suggestedActions.length > 0) {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: 'Suggested Actions:', bold: true })],
            spacing: { before: 50, after: 50 },
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

  // Individual Highlights (if present)
  if (insights.individualHighlights && insights.individualHighlights.length > 0) {
    sections.push(
      new Paragraph({
        text: 'Individual Highlights',
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
            new TextRun({ text: '✓ Strength: ', bold: true, color: '10B981' }),
            new TextRun({ text: highlight.positiveHighlight }),
          ],
          spacing: { after: 50 },
        })
      );
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: '↗ Growth Area: ', bold: true, color: 'F59E0B' }),
            new TextRun({ text: highlight.growthOpportunity }),
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
        text: 'Recommended Actions',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    insights.recommendations.forEach((rec, index) => {
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
            new TextRun({ text: 'Why: ', bold: true }),
            new TextRun({ text: rec.reason }),
          ],
          spacing: { after: 50 },
        })
      );
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Timeline: ', bold: true }),
            new TextRun({ text: rec.timeline }),
          ],
          spacing: { after: 150 },
        })
      );
    });
  }

  // Footer
  sections.push(
    new Paragraph({
      border: { top: { color: 'CCCCCC', space: 1, style: BorderStyle.SINGLE, size: 6 } },
      spacing: { before: 400, after: 200 },
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Document generated on ${new Date().toLocaleString()} • Powered by FeedbackFlow AI`,
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
  const filename = `Team-Insights-Report-${date}.docx`;

  // Convert to blob and save
  const blob = await Packer.toBlob(doc);
  const docxBlob = new Blob([blob], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  saveAs(docxBlob, filename);
};

