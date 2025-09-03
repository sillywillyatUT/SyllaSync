# SyllaSync 

> Transform your syllabi into organized calendar events with AI-powered date extraction

[![Next.js](https://img.shields.io/badge/Next.js-14.2.23-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

##  Overview

SyllaSync is a modern web application that revolutionizes how students manage their academic schedules. Upload your course syllabi, and our AI-powered system will automatically extract important dates (assignments, exams, deadlines) and convert them into calendar events that you can export to Google Calendar, Apple Calendar, or download as .ics files.

###  Key Features

- ** AI-Powered Date Extraction**: Advanced text processing to identify and parse key dates from uploaded documents
- ** Multi-Format Support**: Upload PDFs and other document formats with drag-and-drop functionality
- ** Smart Verification**: Review and edit extracted dates before confirming
- ** Multiple Export Options**: 
  - Standard .ics file download
- ** Secure Authentication**: Google OAuth and email-based sign-up
- ** Responsive Design**: Works seamlessly on desktop and mobile devices
- ** User Onboarding**: Interactive tooltips guide first-time users

##  Live Demo

[View Live Application](https://syllasync.netlify.app)

##  Tech Stack

### Frontend
- **Framework**: Next.js 14.2.23 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Icons**: Lucide React

### Backend & Database
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + Google OAuth
- **File Storage**: Supabase Storage
- **Edge Functions**: Supabase Functions

### AI & Processing
- **PDF Processing**: pdf.js-serverless
- **AI Integration**: Groq SDK for AI date extraction
- **Calendar Generation**: Custom .ics file generation

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint + Prettier
- **Type Safety**: TypeScript strict mode
- **UI Components**: Radix UI primitives

##  Prerequisites

Before running this project, make sure you have:

- Node.js 18+ installed
- npm or yarn package manager
- A Supabase project set up
- Google OAuth credentials (for Google Calendar integration)
- Groq API key (for AI processing)

##  Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/sillywillyatUT/SyllaSync.git
cd SyllaSync
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
SUPABASE_PROJECT_ID=your_project_id
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Google OAuth (Optional - for Google Calendar integration)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# AI Processing
GROQ_API_KEY=your_groq_api_key
```

### 4. Database Setup

Run the database migrations:

```bash
# The migrations are located in supabase/migrations/
# Apply them through your Supabase dashboard or CLI
```

### 5. Start Development Server

```bash
npm run dev
```

Open [https://syllasync.netlify.app](http://syllasync.netlify.app) to view the application.

##  Project Structure

```
SyllaSync/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                   # Authentication pages
│   │   ├── sign-in/
│   │   ├── sign-up/
│   │   └── forgot-password/
│   ├── dashboard/                # User dashboard
│   ├── upload/                   # File upload interface
│   ├── actions.ts                # Server actions
│   └── globals.css               # Global styles
├── src/
│   ├── components/               # Reusable UI components
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── upload-client.tsx     # File upload component
│   │   ├── navbar.tsx            # Navigation component
│   │   └── ...
│   ├── lib/                      # Utility functions
│   ├── store/                    # Zustand stores
│   ├── types/                    # TypeScript type definitions
│   └── utils/                    # Helper functions
├── supabase/
│   ├── client.ts                 # Supabase client configuration
│   ├── server.ts                 # Server-side Supabase client
│   ├── functions/                # Edge functions
│   └── migrations/               # Database migrations
└── test/
    └── data/                     # Test PDF files
```

##  Configuration

### Supabase Setup

1. Create a new Supabase project
2. Run the migrations in `supabase/migrations/`
3. Set up authentication providers (Google OAuth)
4. Configure storage buckets for file uploads

### Google Calendar Integration

1.  Create a Google Cloud Console project.
2.  Enable the **Google Calendar API**.
3.  Create **OAuth 2.0 credentials** (for a Web application).
4.  Add your redirect URIs under **Authorized redirect URIs**. You must add one for every environment you use.
    -   **Production:** `https://your-site-name.netlify.app/auth/callback`
    -   **Netlify Branch Deploys:** `https://main--your-site-name.netlify.app/auth/callback`
    -   **Local Development:** `http://localhost:3000/auth/callback`

##  UI Components

This project uses [shadcn/ui](https://ui.shadcn.com/) for consistent, accessible UI components:

- **Forms**: React Hook Form with validation
- **Dialogs**: Modal dialogs for confirmations
- **Tables**: Data tables for date verification
- **Buttons**: Various button variants and states
- **Cards**: Content containers with consistent styling
- **Tooltips**: Contextual help and onboarding

##  Authentication Flow

1. **Sign Up**: Email/password or Google OAuth
2. **Profile Creation**: Automatic user profile setup
3. **Session Management**: Secure session handling with Supabase

##  Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Syllabi Processing
```sql
CREATE TABLE syllabi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  extracted_dates JSONB,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

##  Deployment

### Netlify 

1. Connect your GitHub repository to netlify
2. Add environment variables in netlify dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

##  Testing

Test files are located in the `test/data/` directory:

```bash
# Run tests (when implemented)
npm test
```

##  Performance Optimizations

- **Image Optimization**: Next.js automatic image optimization
- **Code Splitting**: Automatic code splitting with Next.js
- **Caching**: Supabase query caching
- **Lazy Loading**: Component lazy loading where appropriate
- **Bundle Analysis**: Use `npm run analyze` to analyze bundle size

##  Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Use Prettier for code formatting
- Write meaningful commit messages
- Test your changes thoroughly
- Update documentation as needed

##  Recent Changes & Commit History

### Latest Updates

> **Note**: For the most up-to-date commit history, please visit the [GitHub repository](https://github.com/sillywillyatUT/SyllaSync/commits/main)

**Recent Improvements:**
-  Enhanced user authentication flow
-  Improved PDF processing capabilities
-  Added comprehensive error handling
-  Implemented responsive design
-  Optimized database queries
-  Enhanced security measures
-  Fixed naming issue in ics file generation and event naming
-  Enhanced user authentication flow **to fix redirect and session handling issues**
-  Improved PDF processing capabilities
-  Added comprehensive error handling

### Changelog
(P.S. I forgot to include the readme until later....)
#### v1.0.0 || 8-20-2025
- Initial release with core functionality
- AI-powered date extraction
- Multi-format calendar export
- User authentication system
- Responsive web interface

#### v1.0.1 || 8-25-2025
- Switched PDF parsing to use PDF.js-serverless to work on serverless domains such as Netlify/Vercel
- Fixed sign-up issues

#### v1.0.2 || 8-27-2025
- Fixed QOL issues (fixed naming ics file to include class ID into name and events)
- Updated AI prompt to grab the class ID from the top of the syllabus
- UI Fixes so the user knows what class has an assignment

#### v1.1.0 || 8-28-2025
- Fixed sign-in with Google errors not auto authenticating
- Added export to Google Calendar functionality
- Added color picker for Google Calendar events

#### v1.1.1 (Latest) || 9-2-2025
-   Enhanced user authentication flow to fix redirect and session handling issues
-   Improved PDF processing capabilities
-   Added comprehensive error handling

##  Known Issues

- PDF processing may take longer for complex documents
- Google Calendar integration requires additional OAuth setup
- Some date formats may require manual verification
- Long syllabus may not process correctly due to token limits

##  Roadmap

- [ ] **Mobile App**: React Native mobile application
- [ ] **Batch Processing**: Upload multiple syllabi at once
- [ ] **Smart Reminders**: Automatic reminder notifications
- [ ] **Course Management**: Organize syllabi by semester/course
- [ ] **Collaboration**: Share calendars with classmates
- [ ] **Analytics**: Track assignment completion rates
- [ ] **API Access**: Public API for third-party integrations

##  License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

##  Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Supabase](https://supabase.com/) for backend infrastructure
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- [Groq](https://groq.com/) for AI processing capabilities

##  Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/sillywillyatUT/SyllaSync/issues) page
2. Create a new issue with detailed information
3. Join our community discussions

---

<div align="center">
  <p>Made for students by students</p>
  <p> Star this repo if you find it helpful!</p>
</div>
