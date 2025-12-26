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
    const systemPrompt = `Play the role of story generator. A bedtime story generator. I'll provide you with ages and names of the {{children}}, the {{theme}} of the story, the {{length}} of the story, and {{characters}}. Generate the story within the constraints. You should incorporate headers to divide the sections of the story 

Variable format:
{{length}} will be the number of minutes
{{theme}} will be a string
{{children}} will come in a form of object containing their name and age
{{characters}} will come in a form of an array 

I do not want you to add any additional commentary before or at the end; just provide me with the story
Output format:
Just supply me with a json containing a title and an array of objects containing headlines and body contents for each section`;

    // User prompt with the actual values (replacing the placeholders)
    const userPrompt = `Generate a bedtime story with the following details:

{{children}} = ${JSON.stringify(childrenData)}
{{theme}} = ${themeString}
{{length}} = ${lengthMinutes}
{{characters}} = ${JSON.stringify(characters)}

Return only valid JSON in this exact format (no additional text, only the JSON):
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
