# 🌱 GrowthPulse Website Creation Prompt

> **A comprehensive prompt for vibe coding website creation platforms**  
> Use this document to recreate the GrowthPulse employee feedback management application

---

## Table of Contents

1. [Brand Identity](#brand-identity)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Spacing System](#spacing-system)
5. [Border Radius](#border-radius)
6. [Shadows](#shadows)
7. [Layout Structure](#layout-structure)
8. [Pages Specification](#pages-specification)
9. [Component Specifications](#component-specifications)
10. [Animations & Interactions](#animations--interactions)
11. [Mobile Considerations](#mobile-considerations)
12. [Key User Flows](#key-user-flows)

---

## Brand Identity

### Name & Tagline

- **Brand Name**: GROWTH**PULSE** (displayed as "GROWTH" in bold dark gray, "PULSE" in lighter gray, normal weight)
- **Tagline**: "Nurture growth, measure progress"
- **Description**: An employee feedback management system with performance cycles, hierarchical org structure, and real-time notifications

### Logo Concept

A **bonsai tree** with an **ECG/heartbeat pulse line** running through it, representing:

- **The Bonsai**: Careful, intentional growth and nurturing (like employee development)
- **The Pulse Line**: Real-time tracking, vitality, and continuous monitoring

**Logo Colors**:

| Element | Colors |
|---------|--------|
| Foliage | Teal gradient: `#26A69A` → `#2DB5A6` → `#4DB6AC` |
| Tree trunk/pot | Browns: `#5D4037`, `#6D4C41`, `#8D6E63` |
| Pulse line | Blue: `#2196F3` |

### Logo SVG

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <!-- Pot -->
  <path d="M35 78 L65 78 L60 92 L40 92 Z" fill="#5D4037" stroke="#4E342E" stroke-width="1"/>
  <path d="M42 82 L52 82 L50 88 L44 88 Z" fill="#8D6E63" opacity="0.5"/>
  <rect x="33" y="75" width="34" height="5" rx="1" fill="#6D4C41"/>
  
  <!-- Tree trunk -->
  <path d="M50 75 C50 70, 48 65, 50 60 C52 55, 50 50, 50 45 C50 40, 52 35, 50 30" stroke="#5D4037" stroke-width="6" stroke-linecap="round" fill="none"/>
  
  <!-- Left branch -->
  <path d="M50 55 C45 52, 38 50, 32 48" stroke="#5D4037" stroke-width="4" stroke-linecap="round" fill="none"/>
  
  <!-- Right branch -->
  <path d="M50 55 C55 52, 62 50, 68 48" stroke="#5D4037" stroke-width="4" stroke-linecap="round" fill="none"/>
  
  <!-- Main foliage (top) -->
  <ellipse cx="50" cy="22" rx="22" ry="14" fill="#26A69A"/>
  <ellipse cx="42" cy="20" rx="12" ry="10" fill="#2DB5A6"/>
  <ellipse cx="58" cy="20" rx="12" ry="10" fill="#2DB5A6"/>
  <ellipse cx="50" cy="16" rx="14" ry="9" fill="#4DB6AC"/>
  
  <!-- Left foliage -->
  <ellipse cx="28" cy="42" rx="14" ry="10" fill="#26A69A"/>
  <ellipse cx="24" cy="40" rx="10" ry="8" fill="#2DB5A6"/>
  <ellipse cx="32" cy="38" rx="8" ry="6" fill="#4DB6AC"/>
  
  <!-- Right foliage -->
  <ellipse cx="72" cy="42" rx="14" ry="10" fill="#26A69A"/>
  <ellipse cx="76" cy="40" rx="10" ry="8" fill="#2DB5A6"/>
  <ellipse cx="68" cy="38" rx="8" ry="6" fill="#4DB6AC"/>
  
  <!-- Pulse/Heartbeat line -->
  <path d="M15 45 L35 45 L40 35 L45 55 L50 30 L55 50 L60 40 L65 45 L85 45" stroke="#2196F3" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>
```

---

## Color Palette

### Primary Colors (Blue)

```css
--primary-50: #eff6ff;   /* Lightest blue background */
--primary-100: #dbeafe;
--primary-200: #bfdbfe;
--primary-300: #93c5fd;
--primary-400: #60a5fa;
--primary-500: #3b82f6;  /* Main primary blue */
--primary-600: #2563eb;  /* Primary hover */
--primary-700: #1d4ed8;  /* Primary active */
--primary-800: #1e40af;
--primary-900: #1e3a8a;
```

### Secondary Colors (Slate)

```css
--secondary-50: #f8fafc;
--secondary-100: #f1f5f9;
--secondary-200: #e2e8f0;
--secondary-300: #cbd5e1;
--secondary-400: #94a3b8;
--secondary-500: #64748b;
--secondary-600: #475569;
--secondary-700: #334155;
--secondary-800: #1e293b;
--secondary-900: #0f172a;
```

### Accent Colors

```css
/* Teal (matches logo foliage) - for growth/success highlights */
--teal-500: #26A69A;
--teal-600: #009688;

/* Success - Green */
--success-50: #f0fdf4;
--success-100: #dcfce7;
--success-500: #22c55e;
--success-600: #16a34a;
--success-700: #15803d;

/* Warning - Amber */
--warning-50: #fffbeb;
--warning-100: #fef3c7;
--warning-500: #f59e0b;
--warning-600: #d97706;
--warning-700: #b45309;

/* Error - Red */
--error-50: #fef2f2;
--error-100: #fee2e2;
--error-500: #ef4444;
--error-600: #dc2626;
--error-700: #b91c1c;

/* Info - Cyan */
--info-50: #ecfeff;
--info-100: #cffafe;
--info-500: #06b6d4;
--info-600: #0891b2;
--info-700: #0e7490;
```

### Neutral Grays

```css
--gray-50: #fafafa;   /* Background */
--gray-100: #f5f5f5;
--gray-200: #e5e5e5;  /* Borders */
--gray-300: #d4d4d4;
--gray-400: #a3a3a3;  /* Disabled text */
--gray-500: #737373;  /* Muted text */
--gray-600: #525252;  /* Secondary text */
--gray-700: #404040;
--gray-800: #262626;
--gray-900: #171717;  /* Primary text */
```

### Surface & Text Colors

```css
--color-background: #ffffff;
--color-surface: #ffffff;
--color-surface-raised: #fafafa;
--color-surface-overlay: rgba(0, 0, 0, 0.5);

--color-border: #e5e5e5;
--color-border-light: #f5f5f5;
--color-border-dark: #d4d4d4;

--color-text-primary: #171717;
--color-text-secondary: #525252;
--color-text-muted: #737373;
--color-text-disabled: #a3a3a3;
--color-text-inverse: #ffffff;
--color-text-link: #2563eb;
--color-text-link-hover: #1d4ed8;
```

---

## Typography

### Font Family

**Plus Jakarta Sans** - A modern, geometric sans-serif with excellent readability

```css
font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif;

/* Monospace for code */
font-family: 'SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', monospace;
```

### Font Scale

| Token | Size | Line Height | Letter Spacing | Usage |
|-------|------|-------------|----------------|-------|
| `xs` | 0.75rem (12px) | 1rem | 0.01em | Captions, badges, timestamps |
| `sm` | 0.875rem (14px) | 1.25rem | 0.006em | Body small, labels, helper text |
| `base` | 1rem (16px) | 1.5rem | 0.004em | Body text, default |
| `lg` | 1.125rem (18px) | 1.75rem | 0.002em | Large body, emphasized text |
| `xl` | 1.25rem (20px) | 1.875rem | 0 | H5, card titles |
| `2xl` | 1.5rem (24px) | 2rem | -0.01em | H4 |
| `3xl` | 1.875rem (30px) | 2.25rem | -0.015em | H3 |
| `4xl` | 2.25rem (36px) | 2.5rem | -0.02em | H2 |
| `5xl` | 3rem (48px) | 3.5rem | -0.025em | H1, hero text |
| `6xl` | 3.75rem (60px) | 4rem | -0.03em | Display text |

### Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| Light | 300 | De-emphasized text |
| Normal | 400 | Body text |
| Medium | 500 | Labels, slightly emphasized |
| Semibold | 600 | Headings, important text |
| Bold | 700 | Strong emphasis, brand name |

### Text Rendering

```css
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
```

---

## Spacing System

Based on a **4px base unit**:

```css
--space-0: 0px;
--space-0.5: 2px;    /* 0.5 × 4px */
--space-1: 4px;      /* 1 × 4px */
--space-2: 8px;      /* 2 × 4px */
--space-3: 12px;     /* 3 × 4px */
--space-4: 16px;     /* 4 × 4px */
--space-5: 20px;     /* 5 × 4px */
--space-6: 24px;     /* 6 × 4px */
--space-8: 32px;     /* 8 × 4px */
--space-10: 40px;    /* 10 × 4px */
--space-12: 48px;    /* 12 × 4px */
--space-16: 64px;    /* 16 × 4px */
--space-20: 80px;    /* 20 × 4px */
--space-24: 96px;    /* 24 × 4px */
```

---

## Border Radius

```css
--radius-none: 0;
--radius-sm: 4px;      /* Inputs, small badges */
--radius-default: 6px; /* Buttons, tags */
--radius-md: 8px;      /* Cards, dropdowns */
--radius-lg: 12px;     /* Modals, panels */
--radius-xl: 16px;     /* Hero sections, login cards */
--radius-2xl: 24px;    /* Floating elements */
--radius-full: 9999px; /* Pills, avatars */
```

---

## Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-default: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

/* Component-specific shadows */
--shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08);
--shadow-card-hover: 0 4px 12px 0 rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.06);
--shadow-button: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-dropdown: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-modal: 0 25px 50px -12px rgb(0 0 0 / 0.25);
```

---

## Layout Structure

### Overall Layout

```
┌────────────────────────────────────────────────────────────┐
│ ┌──────────┐ ┌─────────────────────────────────────────┐   │
│ │          │ │ Header (with notifications, user menu)  │   │
│ │          │ ├─────────────────────────────────────────┤   │
│ │ Sidebar  │ │                                         │   │
│ │ (256px)  │ │              Main Content               │   │
│ │          │ │           (fluid width, p-6)            │   │
│ │          │ │                                         │   │
│ │          │ │                                         │   │
│ └──────────┘ └─────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

**Key Specs**:
- **Background**: Light gray (`#f5f5f5` / gray-50)
- **Sidebar width**: 256px (16rem) fixed on desktop
- **Main content padding**: 24px (space-6)
- **Mobile breakpoint**: 768px (md)

### Sidebar Structure

```
┌──────────────────────────────┐
│  [Logo] GROWTHPULSE          │
├──────────────────────────────┤
│  MANAGEMENT                  │  ← Section header (gray, uppercase, 11px)
│  ▸ Dashboard                 │
│  ▸ Feedback                  │
│  ▸ Manager's Feedback        │
│  ▸ Notifications [3]         │  ← Badge for unread count
├──────────────────────────────┤
│  PERSONAL                    │
│  ▸ Myself                    │
├──────────────────────────────┤
│  RESOURCES                   │
│  ▸ Templates                 │
├──────────────────────────────┤
│  ADMINISTRATION              │  ← Only for admin users
│  ▸ Admin Dashboard           │
│  ▸ Cycles                    │
│  ▸ Users                     │
│  ▸ Hierarchy                 │
│  ▸ Template Management       │
├──────────────────────────────┤
│  ┌────┐                      │
│  │ AV │ User Name            │  ← User profile section
│  └────┘ user@email.com       │
└──────────────────────────────┘
```

**Navigation Item States**:
- **Default**: Gray text (#404040), 3px transparent left border
- **Hover**: Light gray background (#f9fafb)
- **Active**: Blue background (#eff6ff), blue text (#1d4ed8), 3px blue left border (#2563eb)

### Mobile Layout

```
┌──────────────────────────────┐
│ [≡] Header [🔔] [👤]         │
├──────────────────────────────┤
│                              │
│       Main Content           │
│      (full width, p-4)       │
│                              │
│                              │
├──────────────────────────────┤
│ [🏠] [💬] [🔄] [🔔] [👤]    │  ← Fixed bottom nav
└──────────────────────────────┘
```

---

## Pages Specification

### 1. Login Page (`/login`)

**Layout**: Split screen on desktop (55% branding / 45% login form), single column on mobile

#### Desktop Left Panel (Branding)

```
Background: 
  - Base color: #F5F7FB
  - Radial gradient at 20% 30%: rgba(38, 166, 154, 0.08) → transparent
  - Radial gradient at 80% 70%: rgba(33, 150, 243, 0.06) → transparent

Content:
  ┌─────────────────────────────────────┐
  │                                     │
  │  [🌳 Logo 72px] GROWTHPULSE         │
  │                                     │
  │  Nurture growth,                    │  ← 4xl-5xl font, bold
  │  measure progress                   │  ← Teal colored (#0d9488)
  │                                     │
  │  Cultivate your team's potential    │  ← lg font, gray-600
  │  with continuous feedback cycles    │
  │  and real-time performance insights │
  │                                     │
  │  🌱 Continuous growth tracking      │  ← Feature highlights
  │  💓 Real-time performance pulse     │     with staggered animation
  │  🎯 Goal alignment & progress       │
  │                                     │
  └─────────────────────────────────────┘

Decorative Elements:
  - Abstract teal blob (top-left): Large blurred ellipse, opacity 8%
  - Pulse line SVG (bottom-right): Blue stroke, opacity 6%
```

#### Right Panel (Login Form)

```
Background: White (desktop), gradient (mobile)

  ┌─────────────────────────────────────┐
  │                                     │
  │         Welcome back                │  ← 2xl font, bold
  │  Sign in with your Google account   │  ← base font, gray-600
  │                                     │
  │  ┌─────────────────────────────┐    │
  │  │ 🛡️ Wix Organization Login   │    │  ← Card header (gray-50 bg)
  │  │    Secure single sign-on    │    │
  │  ├─────────────────────────────┤    │
  │  │                             │    │
  │  │  [G] Continue with Google   │    │  ← Google OAuth button
  │  │                             │    │
  │  │  Use a different account    │    │  ← Link button
  │  │                             │    │
  │  └─────────────────────────────┘    │
  │                                     │
  │      For Wix employees only         │  ← Footer text
  │  Privacy • Terms • Contact Admin    │
  │         GrowthPulse v1.0            │
  │                                     │
  └─────────────────────────────────────┘

Card Styling:
  - Border radius: 16px (radius-xl)
  - Shadow: shadow-xl with gray-200/50
  - Border: 1px gray-100
```

---

### 2. Dashboard Page (`/dashboard`)

**Role-based**: Renders `ManagerDashboard` for managers, `EmployeeDashboard` for employees

#### Manager Dashboard

**Tab Navigation**: Overview | Team | AI Insights | Analytics

```
Desktop tabs: Horizontal links with bottom border indicator
Mobile tabs: Horizontal scrollable pill buttons (green active state)
```

##### Overview Tab

```
┌────────────────────────────────────────────────────────────┐
│ Manager Dashboard                                          │
│ Manage your team and track performance                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 💡 "The only way to do great work is to love what    │  │ ← Quote of the Day
│  │     you do." — Steve Jobs                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌────────────────┐  ┌────────────────┐                   │
│  │ 👥 12          │  │ 💬 45          │                   │ ← Stats Cards
│  │ Direct Reports │  │ Feedback Given │                   │   (clickable)
│  └────────────────┘  └────────────────┘                   │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔄 Active Cycles                    [Cycle Dropdown]  │  │
│  │ ─────────────────────────────────────────────────────│  │
│  │ Q4 2024 Review                                       │  │
│  │ 📅 Ends Dec 31, 2024              [18d left]         │  │
│  │                                                       │  │
│  │ Team Participation                            75%    │  │
│  │ [████████████████░░░░░░]                             │  │
│  │ 9 of 12 team members                                 │  │
│  │                                                       │  │
│  │ ⚠️ Need to give feedback to:                         │  │ ← Amber background
│  │ [Alice] [Bob] [Charlie]  Show 2 more                 │  │   for pending items
│  │                                                       │  │
│  │ [🔔 Send Reminder to All (3)]                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────┐  ┌─────────────────────┐         │
│  │ Feedback You Gave   │  │ Team Feedback        │         │
│  │ ─────────────────── │  │ Progress             │         │
│  │ • To: Alice (3d)    │  │ ────────────────────│         │
│  │ • To: Bob (1w)      │  │ 9/12 members        │         │
│  │ • To: Charlie (2w)  │  │ [████████░░░░] 75%  │         │
│  │                     │  │                      │         │
│  │                     │  │ [View Team Analytics]│         │
│  └─────────────────────┘  └─────────────────────┘         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

##### Team Tab

```
┌────────────────────────────────────────────────────────────┐
│ Team Hierarchy                                             │
│ 👥 5 direct reports • 12 total team members                │
│                                           [Expand] [Collapse] │
├────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ▼ [🟢 JD] John Doe                        [You]     │   │ ← Current user (teal gradient)
│  │       Engineering Manager                            │   │
│  │   │                                                  │   │
│  │   ├─▸ [🔵 AS] Alice Smith         [Direct]    →    │   │ ← Direct report (blue gradient)
│  │   │       Senior Engineer                            │   │   Clickable → employee history
│  │   │                                                  │   │
│  │   ├─▼ [🔵 BJ] Bob Johnson [Direct] [👥 3 reports]  │   │ ← Manager of team
│  │   │   │   Tech Lead                                  │   │
│  │   │   │                                              │   │
│  │   │   ├─▸ [🟣 CD] Carol Davis                       │   │ ← Nested report (purple)
│  │   │   │       Engineer                               │   │
│  │   │   ├─▸ [🟣 EF] Eve Foster                        │   │
│  │   │   │       Engineer                               │   │
│  │   │   └─▸ [🟣 GH] George Harris                     │   │
│  │   │           Junior Engineer                        │   │
│  │   │                                                  │   │
│  │   └─▸ [🔵 IJ] Ivan Jones          [Direct]    →    │   │
│  │           Designer                                   │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘

Avatar Gradients by Level:
  Level 0 (You): emerald-500 → teal-600
  Level 1: blue-500 → indigo-600
  Level 2: purple-500 → pink-600
  Level 3: orange-500 → red-600
  Level 4+: cyan-500 → blue-600
```

##### AI Insights Tab

```
┌────────────────────────────────────────────────────────────┐
│ ✨ AI Team Insights                                        │
│ AI-powered analysis of your team's feedback patterns       │
│                              [📥 Download] [✨ Generate]   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Loading State:                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              [Spinner]                               │  │
│  │      Analyzing team feedback with AI...              │  │
│  │      This may take a few seconds                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  Results:                                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 💡 Executive Summary                                 │  │ ← Purple gradient bg
│  │ Your team shows strong collaboration skills with     │  │
│  │ opportunities for growth in technical documentation. │  │
│  │                                                       │  │
│  │ 👥 12 team members  💬 45 feedback items             │  │
│  │ ❤️ Health Score: 8/10  [Confidence: High]            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────┐              │
│  │ ⚡ Key Themes                            │              │
│  │ [Collaboration] [Communication] [Growth] │              │
│  └─────────────────────────────────────────┘              │
│                                                            │
│  ┌─────────────────────┐  ┌─────────────────────┐         │
│  │ 🏆 Team Strengths   │  │ 📈 Areas for Growth │         │
│  │ (Green border)      │  │ (Orange border)     │         │
│  │                     │  │                     │         │
│  │ ▎ Collaboration     │  │ ▎ Documentation     │         │
│  │   Great teamwork... │  │   Code docs need... │         │
│  │   [Alice] [Bob]     │  │   • Suggested: ...  │         │
│  │                     │  │                     │         │
│  │ ▎ Problem Solving   │  │ ▎ Time Management   │         │
│  │   Quick to resolve..│  │   Deadline issues...│         │
│  └─────────────────────┘  └─────────────────────┘         │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🎯 Recommended Actions                               │  │
│  │                                                       │  │
│  │ [HIGH]   Schedule 1:1s with struggling team members  │  │ ← Red bg
│  │          Reason: Identified 2 team members with...   │  │
│  │                                                       │  │
│  │ [MEDIUM] Implement code review guidelines            │  │ ← Yellow bg
│  │          Reason: Documentation feedback suggests...  │  │
│  │                                                       │  │
│  │ [LOW]    Plan team building activity                 │  │ ← Blue bg
│  │          Reason: Strengthen collaboration further... │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  Generated on Dec 13, 2024, 3:45 PM                        │
└────────────────────────────────────────────────────────────┘
```

##### Analytics Tab

```
┌────────────────────────────────────────────────────────────┐
│ Team Analytics                                             │
│                    [Filter: All Cycles ▼] [🔄 Refresh]     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────┐  ┌─────────────────────┐         │
│  │ 📊 Feedback Color   │  │ 🎯 Completion Status│         │
│  │    Distribution     │  │                     │         │
│  │                     │  │ Your Progress: 9/12 │         │
│  │      [PIE CHART]    │  │ [█████████░░░] 75%  │         │
│  │                     │  │                     │         │
│  │  🟢 15 Exceeds      │  │ ┌─────────────────┐ │         │
│  │  🟡 25 Meets        │  │ │ Alice    ✅ 3   │ │         │
│  │  🔴 5  Needs Imp.   │  │ │ Bob      ✅ 2   │ │         │
│  │                     │  │ │ Carol  [Give FB]│ │         │
│  │  Click to filter    │  │ │ Dave   [Give FB]│ │         │
│  └─────────────────────┘  └─────────────────────┘         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

#### Employee Dashboard

**Tab Navigation**: Overview | My Feedback | My Goals

##### Overview Tab

```
┌────────────────────────────────────────────────────────────┐
│ My Dashboard                                               │
│ Track your performance and development                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 💡 Quote of the Day                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────┐  ┌─────────────────┐                 │
│  │ 💬 8            │  │ ⏳ 2            │                 │
│  │ Feedback        │  │ Waiting for     │                 │
│  │ Received        │  │ Acknowledgement │                 │
│  └─────────────────┘  └─────────────────┘                 │
│                                                            │
│  ┌─────────────────────┐  ┌─────────────────────┐         │
│  │ Recent Feedback     │  │ My Development      │         │
│  │ ─────────────────── │  │ Goals               │         │
│  │ 🟢 John (Manager)   │  │ ──────────────────  │         │
│  │    Dec 10, 2024     │  │ ☐ Complete React    │         │
│  │                     │  │    course (Q4)      │         │
│  │ 🟢 Jane (Peer)      │  │ ☑ Improve code     │         │
│  │    Dec 5, 2024      │  │    review skills    │         │
│  │                     │  │                     │         │
│  │ [View All]          │  │ [View All Goals]    │         │
│  └─────────────────────┘  └─────────────────────┘         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

### 3. Feedback Page (`/feedback`)

**Tab Navigation**:
- **Managers**: All | Given | Received | Drafts
- **Employees**: Waiting | Acknowledged | Received

```
┌────────────────────────────────────────────────────────────┐
│ Feedback                                                   │
│ Give and receive performance feedback                      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐              │
│  │ 💬 45     │  │ 👥 8      │  │ ⏳ 2      │              │ ← Stats cards
│  │ Given     │  │ Received  │  │ Pending   │              │
│  └───────────┘  └───────────┘  └───────────┘              │
│                                                            │
│  [All] [Given] [Received] [Drafts]    [+ Give Feedback]   │
│                                                            │
│  🔍 Search feedback...              [🎛️ Filters]          │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🟢 To: Alice Smith                     [Completed]   │  │
│  │    Q4 2024 Review • Dec 10, 2024                     │  │
│  │    "Alice demonstrated exceptional problem-solving..." │  │
│  │                                              →        │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 🟡 To: Bob Johnson                     [Submitted]   │  │
│  │    Q4 2024 Review • Dec 8, 2024                      │  │
│  │    "Bob has been improving his communication..."     │  │
│  │                                              →        │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ ⚫ To: Carol Davis                        [Draft]    │  │
│  │    Q4 2024 Review • Dec 12, 2024                     │  │
│  │    Draft saved...                         [Edit]     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### Give Feedback Form (Modal/Drawer)

```
┌──────────────────────────────────────────────────────────┐
│ Give Feedback                                      [✕]   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Recipient *                                             │
│  [🔍 Search employees...                            ▼]   │
│                                                          │
│  Cycle *                                                 │
│  [Q4 2024 Review                                    ▼]   │
│                                                          │
│  Template (Optional)                                     │
│  [Performance Review Template                       ▼]   │
│                                                          │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│  Overall Rating *                                        │
│  ┌─────────────┐┌─────────────┐┌─────────────┐          │
│  │ 🟢 Exceeds  ││ 🟡 Meets    ││ 🔴 Needs    │          │
│  │ Expectations││ Expectations││ Improvement │          │
│  └─────────────┘└─────────────┘└─────────────┘          │
│                                                          │
│  Feedback Content *                                      │
│  ┌────────────────────────────────────────────────────┐  │
│  │                                                    │  │
│  │ [Rich text editor area]                            │  │
│  │                                                    │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│  Goals for Employee                                      │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 1. Goal Title                                 [🗑️] │  │
│  │    Description...                                  │  │
│  │    Target Date: [Dec 31, 2024]                     │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ [+ Add Goal]                                       │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────┐  ┌────────────────────────┐     │
│  │ 💾 Save as Draft   │  │ 📤 Submit Feedback     │     │
│  └────────────────────┘  └────────────────────────┘     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

### 4. Cycles Page (`/cycles`)

**Admin access required** for create/edit actions

```
┌────────────────────────────────────────────────────────────┐
│ Feedback Cycles                           [+ Create Cycle] │
│ Manage and track your feedback cycles                      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  🔍 Search cycles...                     [🎛️ Filters]      │
│                                                            │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  │ Q4 2024 Review  │ │ Q3 2024 Review  │ │ Mid-Year 2024   │
│  │ [Active] 🟢     │ │ [Closed] ⚫     │ │ [Archived] 📦   │
│  │                 │ │                 │ │                 │
│  │ 📅 Oct 1 -      │ │ 📅 Jul 1 -      │ │ 📅 Jun 1 -      │
│  │    Dec 31, 2024 │ │    Sep 30, 2024 │ │    Jun 30, 2024 │
│  │                 │ │                 │ │                 │
│  │ 👥 45 participants│ │ 👥 42 participants│ │ 👥 40 participants│
│  │                 │ │                 │ │                 │
│  │ Progress        │ │ Progress        │ │ Progress        │
│  │ 32/45 completed │ │ 42/42 completed │ │ 40/40 completed │
│  │ [████████░░] 71%│ │ [██████████]100%│ │ [██████████]100%│
│  │                 │ │                 │ │                 │
│  │ By: John D.     │ │ By: Jane S.     │ │ By: John D.     │
│  │ 2 months ago    │ │ 5 months ago    │ │ 8 months ago    │
│  │                 │ │                 │ │                 │
│  │ [View Details]  │ │ [View Details]  │ │ [View Details]  │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘
│                                                            │
└────────────────────────────────────────────────────────────┘

Status Badges:
  [Draft]     - Gray/Secondary
  [Active]    - Green/Success  
  [In Progress] - Blue/Primary
  [Closed]    - Outline/Gray
  [Archived]  - Secondary/Gray
```

---

### 5. Notifications Page (`/notifications`)

```
┌────────────────────────────────────────────────────────────┐
│ Notifications                         [Mark All as Read]   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Today                                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔵 💬 New feedback from John Doe                     │  │ ← Unread (blue dot)
│  │      You received feedback for Q4 2024 Review        │  │
│  │      2 hours ago                                     │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 🔵 🔔 Reminder: 3 team members need feedback         │  │
│  │      Q4 2024 Review ends in 18 days                  │  │
│  │      5 hours ago                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  Yesterday                                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    ✅ Alice acknowledged your feedback               │  │ ← Read (no dot)
│  │       Q4 2024 Review                                 │  │
│  │       Dec 12, 2024                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  Earlier                                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    🔄 New cycle started: Q4 2024 Review              │  │
│  │       Oct 1, 2024                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

### 6. Profile Page (`/profile`)

```
┌────────────────────────────────────────────────────────────┐
│ Profile                                                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │        ┌─────────┐                                   │  │
│  │        │  [IMG]  │  [📷 Change Photo]                │  │
│  │        └─────────┘                                   │  │
│  │                                                      │  │
│  │  John Doe                                            │  │
│  │  john.doe@company.com                                │  │
│  │                                                      │  │
│  │  [Admin] [Manager]                                   │  │ ← Role badges
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Personal Information                         [Edit]  │  │
│  │                                                      │  │
│  │  Position:     Engineering Manager                   │  │
│  │  Department:   Engineering                           │  │
│  │  Reports to:   Jane Smith (VP Engineering)           │  │
│  │  Location:     San Francisco, CA                     │  │
│  │  Joined:       January 15, 2022                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

### 7. Admin Pages (`/admin/*`)

#### Admin Dashboard (`/admin`)

```
┌────────────────────────────────────────────────────────────┐
│ Admin Dashboard                                            │
│ System overview and management                             │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐  │
│  │ 👥 150    │ │ 🔄 3      │ │ 💬 450    │ │ ✅ 89%    │  │
│  │ Users     │ │ Active    │ │ Feedback  │ │ Completion│  │
│  │           │ │ Cycles    │ │ Given     │ │ Rate      │  │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘  │
│                                                            │
│  Quick Actions                                             │
│  ┌─────────────────┐ ┌─────────────────┐                  │
│  │ [+ Create Cycle]│ │ [📥 Import Users]│                  │
│  └─────────────────┘ └─────────────────┘                  │
│                                                            │
│  Recent Activity                                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ • John Doe created Q4 2024 Review - 2h ago           │  │
│  │ • 15 users imported via CSV - 1d ago                 │  │
│  │ • Q3 2024 Review cycle closed - 2d ago               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### User Management (`/admin/users`)

```
┌────────────────────────────────────────────────────────────┐
│ User Management                                            │
│                           [📥 Import CSV] [+ Add User]     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  🔍 Search users...    [Role ▼] [Department ▼] [Status ▼]  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ □  Name           Email              Role    Actions │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ □  John Doe       john@co.com       Admin    [⋯]    │  │
│  │ □  Jane Smith     jane@co.com       Manager  [⋯]    │  │
│  │ □  Bob Wilson     bob@co.com        Employee [⋯]    │  │
│  │ □  Alice Brown    alice@co.com      Employee [⋯]    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  [Delete Selected]                    < 1 2 3 ... 10 >     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### Hierarchy Management (`/admin/hierarchy`)

```
┌────────────────────────────────────────────────────────────┐
│ Organization Hierarchy                                     │
│                                       [📥 Import] [Export] │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Drag and drop to reorganize reporting structure           │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                     [CEO]                            │  │
│  │                       │                              │  │
│  │        ┌──────────────┼──────────────┐               │  │
│  │        │              │              │               │  │
│  │     [VP Eng]      [VP Sales]    [VP Marketing]       │  │
│  │        │              │              │               │  │
│  │    ┌───┴───┐      ┌───┴───┐                          │  │
│  │    │       │      │       │                          │  │
│  │  [EM1]  [EM2]  [SM1]   [SM2]                         │  │
│  │    │       │                                         │  │
│  │  ┌─┴─┐   ┌─┴─┐                                       │  │
│  │  │   │   │   │                                       │  │
│  │ [E1][E2][E3][E4]                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

### 8. Error Pages

#### 404 Not Found

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                                                            │
│                       [🌳 Logo]                            │
│                                                            │
│                    Page Not Found                          │
│                                                            │
│     The page you're looking for doesn't exist or has       │
│                    been moved.                             │
│                                                            │
│                   [← Go Back Home]                         │
│                                                            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### Buttons

| Variant | Background | Text Color | Border | Hover State |
|---------|------------|------------|--------|-------------|
| Primary | `#2563eb` | `#ffffff` | none | `#1d4ed8` + lift shadow |
| Secondary | `#f1f5f9` | `#0f172a` | none | `#e2e8f0` |
| Outline | `transparent` | `inherit` | `1px #d4d4d4` | `#f9fafb` bg |
| Ghost | `transparent` | `inherit` | none | `#f9fafb` bg |
| Danger | `#dc2626` | `#ffffff` | none | `#b91c1c` |
| Success | `#16a34a` | `#ffffff` | none | `#15803d` |

**Sizes**:
- `sm`: height 32px, padding 12px, font 12px
- `md`: height 40px, padding 16px, font 14px
- `lg`: height 48px, padding 24px, font 16px

**States**:
- `disabled`: 50% opacity, no pointer events
- `loading`: Show spinner, disable interaction

### Cards

```css
.card {
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.08);
}

.card:hover {
  box-shadow: 0 4px 12px 0 rgb(0 0 0 / 0.1);
  transform: translateY(-2px);
  transition: all 0.2s ease;
}
```

### Inputs

```css
.input {
  height: 40px;
  padding: 8px 12px;
  border: 1px solid #d4d4d4;
  border-radius: 6px;
  font-size: 14px;
}

.input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.input.error {
  border-color: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
}
```

### Badges

| Variant | Background | Text |
|---------|------------|------|
| Primary | `#dbeafe` | `#1e40af` |
| Secondary | `#f1f5f9` | `#334155` |
| Success | `#dcfce7` | `#166534` |
| Warning | `#fef3c7` | `#92400e` |
| Error | `#fee2e2` | `#991b1b` |
| Info | `#cffafe` | `#155e75` |
| Outline | `transparent` | `#525252` (with border) |

```css
.badge {
  display: inline-flex;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 9999px;
}
```

### Avatars

```css
.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  font-weight: 600;
  color: white;
}

/* Sizes */
.avatar-sm { width: 32px; height: 32px; font-size: 12px; }
.avatar-md { width: 40px; height: 40px; font-size: 14px; }
.avatar-lg { width: 48px; height: 48px; font-size: 16px; }
.avatar-xl { width: 64px; height: 64px; font-size: 20px; }

/* Gradient backgrounds based on user/level */
.avatar-gradient-teal { background: linear-gradient(135deg, #10b981, #0d9488); }
.avatar-gradient-blue { background: linear-gradient(135deg, #3b82f6, #6366f1); }
.avatar-gradient-purple { background: linear-gradient(135deg, #8b5cf6, #ec4899); }
```

### Select/Dropdown

```css
.select {
  height: 40px;
  padding: 8px 32px 8px 12px;
  border: 1px solid #d4d4d4;
  border-radius: 6px;
  background: white url('chevron-down.svg') no-repeat right 12px center;
  appearance: none;
}
```

### Loading Spinner

```css
.spinner {
  border: 2px solid #d4d4d4;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Progress Bar

```css
.progress-bar {
  height: 8px;
  background: #e5e5e5;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #22c55e; /* or dynamic color */
  border-radius: 4px;
  transition: width 0.3s ease;
}
```

---

## Animations & Interactions

### Page Transitions

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
.animate-fade-in-up { animation: fadeInUp 0.5s ease-out; }
.animate-slide-in-right { animation: slideInRight 0.3s ease-out; }
```

### Micro-interactions

```css
/* Button hover lift */
.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

/* Card hover */
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px 0 rgb(0 0 0 / 0.1);
}

/* Skeleton loading shimmer */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(90deg, #f5f5f5 25%, #e5e5e5 50%, #f5f5f5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

### Staggered Animations

```css
.stagger-animation > * {
  opacity: 0;
  animation: fadeInUp 0.4s ease-out forwards;
}

.stagger-animation > *:nth-child(1) { animation-delay: 0.1s; }
.stagger-animation > *:nth-child(2) { animation-delay: 0.2s; }
.stagger-animation > *:nth-child(3) { animation-delay: 0.3s; }
.stagger-animation > *:nth-child(4) { animation-delay: 0.4s; }
.stagger-animation > *:nth-child(5) { animation-delay: 0.5s; }
```

### Transition Timings

```css
--transition-fast: 150ms ease;
--transition-normal: 200ms ease;
--transition-slow: 300ms ease;
```

---

## Mobile Considerations

### Responsive Breakpoints

```css
/* Mobile first approach */
/* sm: 640px */
/* md: 768px (tablet) */
/* lg: 1024px (desktop) */
/* xl: 1280px (large desktop) */
```

### Touch Targets

```css
/* Minimum 44px × 44px for all interactive elements (Apple HIG) */
.tap-target {
  min-height: 44px;
  min-width: 44px;
}

.tap-target-lg {
  min-height: 48px;
  min-width: 48px;
}
```

### Safe Area Insets

```css
/* For devices with notch/home indicator */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.safe-area-top {
  padding-top: env(safe-area-inset-top, 0px);
}
```

### Mobile Navigation

```css
/* Fixed bottom navigation */
.mobile-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: white;
  border-top: 1px solid #e5e5e5;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* Hide on desktop */
@media (min-width: 768px) {
  .mobile-nav { display: none; }
}
```

### Momentum Scrolling

```css
.scroll-container {
  -webkit-overflow-scrolling: touch;
  overflow-y: auto;
}
```

### Prevent Text Selection on Interactive Elements

```css
.no-select {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}
```

---

## Key User Flows

### 1. Manager Gives Feedback

```
Dashboard → [Give Feedback] → Select Employee → Choose Cycle
    → Select Template (optional) → Write Feedback Content
    → Select Rating (Green/Yellow/Red) → Add Goals
    → [Save Draft] or [Submit]
```

### 2. Employee Acknowledges Feedback

```
Dashboard → Notifications Badge → Click Notification
    → View Feedback Detail → Read Content
    → Add Acknowledgement Comment → [Mark as Acknowledged]
```

### 3. Admin Creates Feedback Cycle

```
Admin → Cycles → [Create Cycle] → Enter Name & Description
    → Set Start/End Dates → Configure Participants
    → [Save as Draft] or [Activate Cycle]
```

### 4. Manager Sends Reminders

```
Dashboard → Active Cycles Card → View Pending List
    → Click Individual Name for Single Reminder
    → OR Click [Send Reminder to All]
```

### 5. Generate AI Insights

```
Dashboard → AI Insights Tab → [Generate Insights]
    → Wait for Analysis (30-60 seconds)
    → Review Summary, Themes, Strengths, Areas for Growth
    → [Download as DOCX]
```

### 6. Admin Imports Users

```
Admin → User Management → [Import CSV]
    → Download Template → Fill with User Data
    → Upload CSV → Review Mappings → [Import]
```

### 7. View Employee History

```
Dashboard → Team Tab → Expand Hierarchy
    → Click Direct Report Name → View Full History
    → See All Feedback Received → See All Goals
```

---

## Technical Stack Recommendations

### Frontend
- **Framework**: React 18+ with TypeScript
- **Routing**: React Router v6
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Form Handling**: React Hook Form + Zod
- **Charts**: Recharts
- **Animations**: CSS + Framer Motion (optional)
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL
- **ORM**: Direct SQL with parameterized queries
- **Authentication**: Google OAuth 2.0 + JWT
- **API Style**: REST

### Infrastructure
- **Hosting**: Any modern cloud (Vercel, Render, AWS, etc.)
- **Database Hosting**: Managed PostgreSQL

---

## Summary

GrowthPulse is a comprehensive employee feedback management system designed with:

1. **Clean, modern aesthetics** inspired by Apple's design language
2. **Role-based experiences** (Admin, Manager, Employee)
3. **Mobile-first responsive design** with dedicated mobile navigation
4. **Rich functionality** including AI-powered insights, real-time notifications, and hierarchical org management
5. **Thoughtful micro-interactions** that create a premium, professional feel

The brand combines the imagery of a bonsai tree (careful, intentional growth) with a pulse/heartbeat line (real-time monitoring), reflected in the teal and blue color accents throughout the interface.

---

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Source Application**: GrowthPulse v1.0






