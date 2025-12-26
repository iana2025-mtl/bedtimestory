import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

/**
 * API Route for generating stylized images using OpenAI DALL-E
 * 
 * Note: DALL-E 3 doesn't support direct image-to-image transformation.
 * Instead, we generate an image based on a detailed prompt that describes
 * the child and the desired visual style.
 * 
 * Expected request body:
 * {
 *   imageBase64: string,      // Base64 encoded original photo (for reference)
 *   visualStyle: string[],    // Selected visual styles (e.g., ['Cartoon', 'Fantasy'])
 *   prompt?: string,          // Optional custom prompt
 *   photoDescription?: string // Description of the child(ren) in the photo
 *   children?: Array<{name: string, age: string}> // Children info for personalized prompt
 * }
 */

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { visualStyle, prompt, photoDescription, children } = body;

    // Validation
    if (!visualStyle || visualStyle.length === 0) {
      return NextResponse.json(
        { error: 'Visual style is required' },
        { status: 400 }
      );
    }

    // CASE A: This API only handles AI image generation (no photo uploaded)
    // If imageBase64 is provided, it means a photo was uploaded, which should be handled client-side

    // Check for API key and OpenAI client
    if (!process.env.OPENAI_API_KEY || !openai) {
      return NextResponse.json(
        { 
          error: 'OpenAI API key is not configured', 
          details: 'Please set OPENAI_API_KEY in your .env.local file.' 
        },
        { status: 500 }
      );
    }

    // Build a detailed prompt for image generation
    // Since DALL-E doesn't support image-to-image, we create a text prompt
    // that describes the child and the desired style
    const styleDescription = visualStyle.join(' and ');
    
    let imagePrompt = prompt;
    
    if (!imagePrompt) {
      // Build a descriptive prompt based on available information
      let childDescription = '';
      
      if (children && children.length > 0) {
        const childNames = children.map((c: { name: string; age: string }) => 
          c.name || 'child'
        ).join(' and ');
        childDescription = `featuring ${childNames}`;
      }
      
      if (photoDescription) {
        childDescription += `. ${photoDescription}`;
      }
      
      imagePrompt = `Create a beautiful, whimsical ${styleDescription} style illustration ${childDescription}, suitable for a children's bedtime story book cover. The illustration should be colorful, friendly, and magical, with soft lighting and a dreamy atmosphere. The style should be ${styleDescription}, maintaining a warm and inviting feel that children would love. Include elements that suggest adventure, wonder, and bedtime magic.`;
    }

    // Generate image using DALL-E 3
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: imagePrompt,
      size: '1024x1024',
      quality: 'standard',
      n: 1,
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No image data returned from OpenAI');
    }

    const imageUrl = response.data[0]?.url;

    if (!imageUrl) {
      throw new Error('No image URL returned from OpenAI');
    }

    return NextResponse.json({
      success: true,
      imageUrl: imageUrl,
    });

  } catch (error) {
    console.error('Error generating image:', error);
    
    // Provide helpful error messages
    if (error instanceof OpenAI.APIError) {
      let errorMessage = error.message;
      if (error.code === 'invalid_api_key') {
        errorMessage = 'Invalid OpenAI API key. Please check your OPENAI_API_KEY in .env.local';
      } else if (error.code === 'insufficient_quota') {
        errorMessage = 'OpenAI API quota exceeded. Please check your OpenAI account billing.';
      } else if (error.code === 'content_policy_violation') {
        errorMessage = 'The image prompt was rejected by OpenAI content policy. Please try a different description.';
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
        error: 'Failed to generate image', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
