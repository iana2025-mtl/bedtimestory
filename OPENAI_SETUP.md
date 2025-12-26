# OpenAI Setup Guide

This document explains how to set up OpenAI for story generation and image generation in the bedtime story generator.

## Prerequisites

1. An OpenAI API account with API access
2. An API key from [OpenAI Platform](https://platform.openai.com/api-keys)

## Installation

1. Install the OpenAI SDK:

```bash
npm install openai
```

## Environment Variables

Create a `.env.local` file in the root directory:

```env
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Specify which OpenAI model to use for story generation
# Default is 'gpt-4o-mini' (fast and cost-effective)
# Other options: 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'
OPENAI_MODEL=gpt-4o-mini
```

**Important:** Never commit `.env.local` to version control. It should already be in `.gitignore`.

**Note:** The application uses `gpt-4o-mini` by default (which is the "nano" equivalent - small, fast, and cost-effective). If you need a different model, change the `OPENAI_MODEL` environment variable.

## Implementation Steps

1. **Update `/app/api/generate-image/route.ts`**:
   - Uncomment the OpenAI implementation code
   - Remove the placeholder/mock response
   - The file already contains the structure - just uncomment and configure

2. **API Route Structure**:
   - The route accepts: `imageBase64`, `visualStyle`, and optional `prompt`
   - Returns: `imageUrl` or `imageBase64` with the generated image

3. **Image Generation Flow**:
   - Story is generated first via `/api/generate-story`
   - After story generation completes, image generation is triggered
   - Generated image is displayed in the story cover section

## Current Status

### Story Generation
- ✅ OpenAI API integration complete (`/app/api/generate-story/route.ts`)
- ✅ System prompt with variables ({{children}}, {{theme}}, {{length}}, {{characters}})
- ✅ JSON output format (title and sections array)
- ✅ Story page displays structured JSON with title and sections
- ✅ Form data properly formatted for the system prompt

### Image Generation
- ✅ API route structure created (`/app/api/generate-image/route.ts`)
- ✅ Frontend integration complete
- ✅ Photo upload and base64 conversion working
- ✅ Visual style selection working
- ⏳ OpenAI DALL-E API integration (placeholder - ready to implement)

## Testing Story Generation

Test the story generation flow:
1. Fill out the form with children's names and ages
2. Select characters and themes
3. Choose story length
4. Submit the form
5. Story generates using OpenAI with the system prompt
6. Story displays with title and sections (headlines and body)
7. JSON structure is available in a collapsible section

## Testing Image Generation

Once image generation is implemented:
1. Fill out the form with a child's photo
2. Select a visual style (e.g., "Cartoon", "Fantasy")
3. Set "Include Images" to "Yes"
4. Submit the form
5. Story generates first
6. Image generation starts automatically after story completes
7. Stylized image appears in the story cover section

## Notes

- Images are temporarily stored in sessionStorage (not persisted)
- Base64 images are converted from the uploaded photo
- The visual style selection determines the transformation style
- Image generation only occurs if:
  - `includeImages` is set to `true`
  - A photo is uploaded (`photoBase64` exists)
  - At least one visual style is selected

