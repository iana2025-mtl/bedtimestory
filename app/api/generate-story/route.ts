import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

/**
 * API Route for generating bedtime stories using OpenAI
 * 
 * Uses a system prompt with variables: {{children}}, {{theme}}, {{length}}, {{characters}}
 * Returns JSON with title and sections array
 */

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

interface StoryResponse {
  title: string;
  sections: Array<{
    headline: string;
    body: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    if (!body.children || body.children.length === 0) {
      return NextResponse.json(
        { error: 'At least one child is required' },
        { status: 400 }
      );
    }

    // Check for API key and OpenAI client
    if (!process.env.OPENAI_API_KEY || !openai) {
      return NextResponse.json(
        { 
          error: 'OpenAI API key is not configured', 
          details: 'Please set OPENAI_API_KEY in your .env.local file. See OPENAI_SETUP.md for instructions.' 
        },
        { status: 500 }
      );
    }

    // Format children data
    const childrenData = body.children.map((child: { name: string; age: string }) => ({
      name: child.name || 'Child',
      age: child.age || 'unknown',
    }));

    // Format theme (combine teaching themes and custom theme)
    const themes = [
      ...(body.teachingThemes || []),
      ...(body.customTeachingTheme ? [body.customTeachingTheme] : []),
    ];
    const themeString = themes.length > 0 ? themes.join(', ') : 'adventure and friendship';

    // Extract minutes from story length (e.g., "3-5 Mins" -> 4, "5-10 Mins" -> 7.5)
    let lengthMinutes = 5; // default
    if (body.storyLength) {
      const match = body.storyLength.match(/(\d+)-(\d+)/);
      if (match) {
        const min = parseInt(match[1]);
        const max = parseInt(match[2]);
        lengthMinutes = Math.round((min + max) / 2);
      }
    }

    // Format characters (combine enjoyed characters and custom characters)
    const characters = [
      ...(body.enjoyedCharacters || []),
      ...(body.customCharacters ? [body.customCharacters] : []),
    ];

    // Build the system prompt (with placeholders that will be explained)
    const systemPrompt = `You are a bedtime story generator. I will provide you with the exact names and ages of children, the theme of the story, the length, and preferred characters.

CRITICAL REQUIREMENTS:
- You MUST use the EXACT names provided for the children. Do NOT change, modify, or substitute these names with any other names.
- Use the children's names consistently throughout the entire story.
- If multiple children are provided, include all of them in the story using their exact names.
- The children's ages should be reflected in the story content and language level.

Variable format:
{{length}} will be the number of minutes the story should take to read
{{theme}} will be a string describing the teaching theme (e.g., "kindness", "bravery")
{{children}} will be an array of objects, each containing "name" (exact name to use) and "age"
{{characters}} will be an array of character types the children enjoy

Generate the story within the time constraint. Divide the story into sections with clear headlines.

Output format:
Return ONLY valid JSON in this exact format (no additional text, no markdown, just the JSON):
{
  "title": "Story Title",
  "sections": [
    {
      "headline": "Section Headline",
      "body": "Section body text here..."
    }
  ]
}`;

    // Format children names for emphasis in prompt
    const childrenNamesList = childrenData.map((c: { name: string; age: string }) => `${c.name} (age ${c.age})`).join(' and ');
    
    // User prompt with the actual values (replacing the placeholders)
    const userPrompt = `Generate a bedtime story with the following details:

CHILDREN (USE THESE EXACT NAMES): ${childrenNamesList}
Children data: ${JSON.stringify(childrenData)}

Theme: ${themeString}
Story length: ${lengthMinutes} minutes
Preferred characters: ${characters.length > 0 ? characters.join(', ') : 'any'}

IMPORTANT: Use the exact names provided above (${childrenData.map((c: { name: string; age: string }) => c.name).join(', ')}) throughout the story. Do not use any other names.

Return only valid JSON in this exact format (no additional text, no markdown, only the JSON):
{
  "title": "Story Title",
  "sections": [
    {
      "headline": "Section Headline",
      "body": "Section body text here..."
    }
  ]
}`;

    // Call OpenAI API
    // Note: Using gpt-4o-mini as "gpt-nano-5" doesn't exist. You can change the model if needed.
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let storyData: StoryResponse;
    try {
      storyData = JSON.parse(responseContent);
    } catch (parseError) {
      // If JSON parsing fails, try to extract JSON from the response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        storyData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse story JSON from OpenAI response');
      }
    }

    // Validate the response structure
    if (!storyData.title || !storyData.sections || !Array.isArray(storyData.sections)) {
      throw new Error('Invalid story structure received from OpenAI');
    }

    return NextResponse.json({
      success: true,
      story: storyData,
      storyId: `story_${Date.now()}`,
    });

  } catch (error) {
    console.error('Error generating story:', error);
    
    // Provide helpful error messages
    if (error instanceof OpenAI.APIError) {
      let errorMessage = error.message;
      if (error.code === 'invalid_api_key') {
        errorMessage = 'Invalid OpenAI API key. Please check your OPENAI_API_KEY in .env.local';
      } else if (error.code === 'insufficient_quota') {
        errorMessage = 'OpenAI API quota exceeded. Please check your OpenAI account billing.';
      }
      
      return NextResponse.json(
        { 
          error: 'OpenAI API error', 
          details: errorMessage,
          code: error.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to generate story', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
