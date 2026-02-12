# AdminLess - Less Admin. More Teaching.

A modern, AI-powered class register and mark management application for teachers, designed to minimize paperwork and maximize instructional time.

## 🚀 Environment Alignment & Local Setup

To ensure consistent performance between the development preview and your local environment, follow these steps:

1. **Environment Variables**: Use a single `.env.local` file for all secrets.
2. **Supabase Connection**:
   - `VITE_SUPABASE_URL`: Your Supabase project URL.
   - `VITE_SUPABASE_ANON_KEY`: Your project's anon/public key.
3. **Startup Audit**: The application logs the current Supabase URL and Mode on startup to verify alignment.

### Localhost Development
- Run `npm install` to setup dependencies.
- Run `npm run dev` to start the Vite development server on port 8080.

## ✨ Features

### 📚 Class Management
- Create, edit, and organize classes by grade and subject.
- Archive classes to keep your dashboard clean.
- Duplicate classes for easy setup of parallel streams.

### 📝 Smart Mark Entry
- **Rapid Entry**: Focus mode for quick sequential mark entry.
- **Voice Entry**: Use your microphone to dictate marks (e.g., "John 85").
- **Smart Parsing**: Automatically calculates percentages from fractions (e.g., input "15/20" -> saves "75").

### 🤖 AI Capabilities
- **Scan Scripts**: Upload images of handwritten mark sheets or scripts. AI extracts names and marks automatically.
- **AI Insights**: Generate performance analysis, identifying class strengths, weaknesses, and recommended strategies.
- **Auto Comments**: Generate personalized report card comments for each learner.

### 📊 Analytics & Reports
- **Dashboard**: High-level overview of performance across all classes.
- **Aggregation**: Combine multiple assessments (with weighting) to calculate final term marks.
- **Visualizations**: Interactive charts for pass rates and trends.

### ✅ Attendance
- Track daily attendance (Present, Absent, Late, Excused).
- View attendance stats and history per learner.

## 🛠 Tech Stack
- **Frontend**: React, TypeScript, Vite
- **UI**: Tailwind CSS, Shadcn UI, Lucide Icons
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **AI**: Google Gemini Pro (via Edge Functions)