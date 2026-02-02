# AdminLess - Less Admin. More Teaching.

A modern, AI-powered class register and mark management application for teachers, designed to minimize paperwork and maximize instructional time.

## Features

### 📚 Class Management
- Create, edit, and organize classes by grade and subject.
- Archive classes to keep your dashboard clean.
- Duplicate classes for easy setup of parallel streams.

### 📝 Smart Mark Entry
- **Rapid Entry**: Focus mode for quick sequential mark entry.
- **Voice Entry**: Use your microphone to dictate marks (e.g., "John 85").
- **Smart Parsing**: Automatically calculates percentages from fractions (e.g., input "15/20" -> saves "75").
- **Import**: Import learners from CSV or plain text lists.

### 🤖 AI Capabilities
- **Scan Scripts**: Upload images of handwritten mark sheets or scripts. AI extracts names and marks automatically.
- **AI Insights**: Generate performance analysis, identifying class strengths, weaknesses, and recommended strategies.
- **Auto Comments**: Generate personalized report card comments for each learner based on their performance.

### 📊 Analytics & Reports
- **Dashboard**: High-level overview of performance across all classes, subjects, and grades.
- **Aggregation**: Combine multiple assessments (with weighting) to calculate final term marks.
- **Visualizations**: Interactive charts for pass rates, symbol distribution, and trends.
- **PDF/CSV Export**: Generate professional class lists, mark sheets, and individual learner reports.

### ✅ Attendance
- Track daily attendance (Present, Absent, Late, Excused).
- View attendance stats and history per learner.
- Export monthly attendance registers.

## Tech Stack
- **Frontend**: React, TypeScript, Vite
- **UI**: Tailwind CSS, Shadcn UI, Lucide Icons
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **AI**: Google Gemini Pro (via Edge Functions)

## Getting Started
1. Sign up/Login.
2. Create a class manually or scan a list.
3. Start capturing marks!