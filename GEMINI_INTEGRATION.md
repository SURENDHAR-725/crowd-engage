# AI Quiz Builder - Gemini & OpenAI Integration

## Overview
The AI Quiz Builder now uses **Google's Gemini API** as the primary AI service for generating quiz questions, with **OpenAI** as a fallback option.

## API Configuration

### Gemini API (Primary)
- **API Key**: Configured in code with fallback to environment variable
- **Model**: `gemini-1.5-flash`
- **Status**: Active by default
- **Environment Variable**: `VITE_GEMINI_API_KEY` (optional, hardcoded as fallback)

### OpenAI API (Fallback)
- **API Key**: Must be set via environment variable
- **Model**: `gpt-4o-mini`
- **Status**: Used only if Gemini fails or is disabled
- **Environment Variable**: `VITE_OPENAI_API_KEY`

## How It Works

1. **Primary Service (Gemini)**:
   - The system first attempts to use Gemini API for quiz generation
   - Provides fast, high-quality quiz questions
   - Includes automatic rate limit handling with 5-minute cooldown

2. **Fallback Service (OpenAI)**:
   - If Gemini fails (rate limit, error, or disabled), OpenAI is used automatically
   - Seamless transition ensures uninterrupted service
   - Also includes rate limit protection

3. **Rule-Based Fallback**:
   - If both AI services are unavailable, the system uses a rule-based generator
   - Creates basic questions from topics or text content
   - Ensures the application always works

## Environment Variables

Create a `.env` file with:

```env
# Primary AI Service (Gemini)
VITE_GEMINI_API_KEY=AIzaSyDHPMjoO6LPne_FNZO4mv2XTDxEbiqdnXU

# Fallback AI Service (OpenAI)
VITE_OPENAI_API_KEY=your-openai-api-key-here

# Optional: Disable services
VITE_DISABLE_GEMINI=false
VITE_DISABLE_OPENAI=false
```

## Features

### Multi-Provider Support
- ✅ Gemini API as primary AI provider
- ✅ OpenAI as automatic fallback
- ✅ Rule-based generation for offline/no-API scenarios

### Intelligent Error Handling
- Automatic fallback on API failures
- Rate limit detection and cooldown
- User-friendly error messages

### Quiz Generation Methods
1. **Topic-based**: Generate quizzes from any topic
2. **PDF-based**: Extract content from PDFs and generate questions
3. **Text-based**: Generate from any text content

## Benefits of Gemini Integration

1. **Cost-Effective**: Gemini offers competitive pricing
2. **Fast Response**: Quick question generation
3. **High Quality**: Produces engaging, educational questions
4. **Reliable Fallback**: OpenAI ensures service continuity
5. **Flexibility**: Easy to switch between providers

## API Functions

```typescript
// Check if Gemini is configured
isGeminiConfigured(): boolean

// Check if OpenAI is configured  
isOpenAIConfigured(): boolean

// Check if any AI service is configured
isAIConfigured(): boolean

// Generate quiz from topic (uses Gemini → OpenAI → Fallback)
generateQuizFromTopic(topic, count, difficulty): Promise<QuizGenerationResult>

// Generate quiz from PDF (uses Gemini → OpenAI → Fallback)
generateQuizFromPDF(file, count, difficulty): Promise<QuizGenerationResult>
```

## Testing

To test the implementation:
1. Run the development server: `npm run dev`
2. Create a new quiz using topic or PDF
3. Check browser console for logs showing which API is being used
4. Monitor for successful quiz generation

## Troubleshooting

### "Gemini temporarily unavailable"
- Rate limit hit, wait 5 minutes
- System will automatically try OpenAI

### "No AI service is configured"
- Add `VITE_GEMINI_API_KEY` or `VITE_OPENAI_API_KEY` to `.env`
- Restart development server

### Poor question quality
- Check which API is being used (console logs)
- Verify API key is valid
- Try adjusting difficulty level
