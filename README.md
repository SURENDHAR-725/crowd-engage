# CrowdSpark - Real-Time Audience Engagement Platform

A comprehensive interactive engagement platform that enables hosts to create and run live sessions (polls, quizzes, games) while participants join and respond in real-time with instant feedback and analytics.

[![Netlify Status](https://api.netlify.com/api/v1/badges/your-badge-id/deploy-status)](https://app.netlify.com/sites/crowdsparkz/deploys)

## 🚀 Features

### Core Functionality
- **Multiple Session Types**: MCQ polls, timed quizzes, yes/no polls, rating polls, and interactive mini-games
- **AI-Powered Quiz Generation**: Generate quizzes from topics, PDF documents, or custom text using NVIDIA Llama 3.3 70B
- **Real-Time Engagement**: Live participant responses with WebSocket updates via Supabase Realtime
- **Advanced Analytics**: Real-time visualization, leaderboards, and participant engagement metrics
- **Mock Tests**: AI-powered self-paced practice tests for independent learning

### AI Quiz Generation
- **Topic-Based**: Generate educational content from any topic with difficulty levels (easy, medium, hard, mixed)
- **PDF Extraction**: Extract text from PDF documents and automatically generate quiz questions
- **Custom Text**: Create quizzes from any text content with intelligent question generation
- **Pedagogical Design**: Advanced prompts following Bloom's Taxonomy for high-quality educational content
- **Smart Distractors**: Plausible wrong answers based on common misconceptions

### Session Management
- **Flexible Modes**:
  - Pace: Instructor-controlled or self-paced
  - Identity: Anonymous or named participants
  - Display: Live results visibility, option shuffling
  - Response: Multiple responses per participant
- **Chaos Mode**: Celebratory effects with confetti and animations
- **Live Control Panel**: Real-time session monitoring and control for hosts

### User Experience
- **Authentication**: Email/password and OAuth (Google, GitHub)
- **Responsive Design**: Mobile-first UI with adaptive layouts
- **Dark/Light Theme**: Automatic theme switching
- **Real-Time Updates**: No page refresh needed for live data

## 🏗️ Tech Stack

### Frontend
- **React 18.3** - Modern UI library with hooks
- **TypeScript 5.8** - Type safety and better DX
- **Vite 5.4** - Lightning-fast build tool with HMR
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **shadcn/ui** - 40+ accessible components built on Radix UI
- **Framer Motion 12** - Smooth animations and transitions

### Backend & Infrastructure
- **Supabase** - PostgreSQL database with real-time subscriptions
- **Netlify Functions** - Serverless API proxy for CORS-free AI calls
- **Netlify Hosting** - CDN-backed static site hosting

### State Management & Data
- **TanStack React Query 5.8** - Server state management and caching
- **React Context** - Global auth and theme state
- **React Hook Form 7.6** - Efficient form handling
- **Zod 3.25** - TypeScript-first schema validation

### AI/ML Services
- **NVIDIA NIM** - Llama 3.3 70B Instruct model for quiz generation
- **PDF.js 5.4** - Client-side PDF text extraction with Web Workers

### Additional Libraries
- **React Router DOM 6.30** - Client-side routing with lazy loading
- **Recharts 2.15** - Charts and data visualization
- **Lucide React** - Icon system
- **date-fns 3.6** - Date utilities
- **Canvas Confetti** - Celebration effects

## 📁 Project Structure

```
src/
├── pages/                    # Route components
│   ├── Index.tsx            # Landing page
│   ├── Dashboard.tsx        # Host session management
│   ├── CreateSession.tsx    # Quiz/poll creation
│   ├── LiveSession.tsx      # Real-time session display
│   ├── JoinSession.tsx      # Participant join flow
│   ├── MockTest.tsx         # AI practice tests
│   └── SignIn/SignUp.tsx    # Authentication
│
├── components/
│   ├── ui/                  # shadcn/ui components (40+)
│   ├── host/                # Host-side features
│   │   ├── QuizBuilder.tsx
│   │   ├── TopicQuizGenerator.tsx
│   │   ├── PDFQuizGenerator.tsx
│   │   └── LiveResultsGraph.tsx
│   ├── player/              # Participant features
│   ├── session/             # Session utilities
│   ├── landing/             # Marketing pages
│   └── layout/              # Layout components
│
├── services/                # Business logic
│   ├── aiQuizService.ts    # AI generation (PDF, topic, text)
│   ├── sessionService.ts   # Session CRUD
│   └── responseService.ts  # Response handling
│
├── hooks/                   # Custom React hooks
│   ├── useSessions.ts
│   ├── useLiveQuiz.ts
│   └── useResponses.ts
│
├── context/                 # React Context providers
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
│
└── lib/                     # Utilities & config
    ├── supabase.ts
    ├── database.types.ts
    └── utils.ts

netlify/
└── functions/
    └── nvidia-proxy.ts      # Serverless NVIDIA API proxy
```

## 🔧 Setup & Installation

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- NVIDIA API key (for AI quiz generation)

### Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# NVIDIA API (for AI quiz generation)
VITE_NVIDIA_API_KEY=your-nvidia-api-key
```

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Server will start at http://localhost:8080
```

### Build for Production

```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

## 🚀 Deployment

### Netlify Deployment

1. **Connect Repository**: Link your GitHub repo to Netlify
2. **Configure Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Set Environment Variables** in Netlify dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_NVIDIA_API_KEY`
4. **Deploy**: Netlify auto-deploys on push to main branch

### Netlify Configuration

The `netlify.toml` file includes:
- Serverless function configuration
- API proxy routing (`/api/nvidia/*` → NVIDIA API)
- SPA routing for client-side navigation
- Security headers and caching policies

## 🏛️ Architecture Highlights

### Serverless Proxy Pattern
NVIDIA API calls route through Netlify Functions to avoid CORS issues in production. The proxy includes:
- CORS preflight handling
- 55-second timeout management
- Error handling and retry logic
- Environment variable security

### Real-Time Architecture
Supabase Realtime provides WebSocket connections for:
- Live participant responses
- Session state updates
- Leaderboard changes
- No polling required

### Code Splitting
Vite configuration includes manual chunks for optimal loading:
- React vendor bundle
- UI component library
- PDF processing
- Animation/chart libraries

### PDF Processing
PDF.js worker bundled locally in production:
- Avoids CDN loading issues
- Better reliability in production
- Falls back to CDN in development

## 🎓 AI Quiz Generation

### System Prompts
Advanced pedagogical prompts following Bloom's Taxonomy:
- **Knowledge**: Remember and understand
- **Application**: Apply concepts to scenarios
- **Analysis**: Analyze relationships
- **Evaluation**: Make judgments
- **Synthesis**: Create new understanding

### Difficulty Levels
- **Easy**: Foundational knowledge (40% of mixed)
- **Medium**: Application and analysis (40% of mixed)
- **Hard**: Expert-level synthesis (20% of mixed)
- **Mixed**: Balanced progression

### Distractor Design
Wrong answers designed to:
- Address common misconceptions
- Use content terminology incorrectly
- Present partial truths
- Test real understanding vs. memorization

## 📊 Database Schema

### Main Tables
- `users` - User profiles and authentication
- `sessions` - Quiz/poll sessions with settings
- `questions` - Individual questions with metadata
- `options` - Multiple choice options
- `participants` - Session attendees
- `responses` - User answers and scoring
- `session_analytics` - Engagement metrics

## 🔐 Security Features

- Supabase Row-Level Security (RLS)
- Environment variable management
- HTTPS enforcement
- Security headers (CSP, XSS protection)
- OAuth authentication
- API key security via serverless functions

## 🎨 UI/UX Features

- **Responsive Design**: Mobile-first approach
- **Accessibility**: WCAG 2.1 compliant components
- **Dark Mode**: System-aware theme switching
- **Animations**: Smooth transitions with Framer Motion
- **Toast Notifications**: Real-time feedback
- **Loading States**: Optimistic UI updates
- **Error Boundaries**: Graceful error handling

## 🔄 Recent Updates

- ✅ Fixed CORS issues with Netlify serverless proxy
- ✅ Enhanced AI prompts with advanced pedagogical instructions
- ✅ Improved PDF extraction with local worker bundling
- ✅ Added timeout handling for long-running AI requests
- ✅ Implemented comprehensive error handling
- ✅ Added CORS preflight support

## 📝 Scripts

```json
{
  "dev": "vite",                    // Development server with HMR
  "build": "vite build",            // Production build
  "build:dev": "vite build --mode development", // Dev build with debugging
  "lint": "eslint .",               // Code linting
  "preview": "vite preview"         // Preview production build
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary and confidential.

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) - Backend infrastructure
- [Netlify](https://netlify.com) - Hosting and serverless functions
- [shadcn/ui](https://ui.shadcn.com) - Component library
- [NVIDIA NIM](https://build.nvidia.com) - AI model inference
- [Radix UI](https://radix-ui.com) - Accessible primitives

## 📞 Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Built with ❤️ using modern web technologies**