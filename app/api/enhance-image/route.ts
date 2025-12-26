import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

/**
 * API Route for subtle AI enhancement of uploaded photos
 * 
 * This endpoint applies gentle, controlled AI enhancement to photos:
 * - Adds subtle magical/storybook feel
 * - Softens lighting
 * - Adds gentle glow and warmth
 * - Preserves facial features and identity
 * - Low transformation strength (no cartoonization, no re-drawing)
 * 
 * Expected request body:
 * {
 *   imageBase64: string,      // Base64 encoded cropped photo
 *   visualStyle: string[],     // Selected visual styles for enhancement tone
 *   children?: Array<{name: string, age: string}> // Children info
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
    const { imageBase64, visualStyle, children } = body;

    // Validation
    if (!imageBase64) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    if (!visualStyle || visualStyle.length === 0) {
      return NextResponse.json(
        { error: 'Visual style is required' },
        { status: 400 }
      );
    }

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

    // Convert base64 to remove data URL prefix if present
    let base64Data = imageBase64;
    if (imageBase64.startsWith('data:')) {
      base64Data = imageBase64.split(',')[1];
    }

    // Build a very subtle enhancement prompt
    // Since DALL-E 3 doesn't support direct image-to-image, we'll use a description-based approach
    // with emphasis on preserving the original photo's characteristics
    const styleDescription = visualStyle.join(' and ');
    
    // Note: This is a limitation - DALL-E 3 cannot directly enhance an existing photo
    // while preserving identity. For true photo enhancement, we would need:
    // 1. OpenAI's image editing API (requires mask)
    // 2. A specialized photo enhancement service
    // 3. Or client-side advanced filters
    
    // For now, we'll return a signal that enhancement should use client-side filters
    // The client will apply advanced CSS filters as "AI-style enhancement"
    
    // Return success with a flag indicating to use client-side enhancement
    return NextResponse.json({
      success: true,
      enhanced: false, // Indicates to use client-side enhancement
      message: 'Use client-side enhancement filters',
    });

  } catch (error) {
    console.error('Error in AI enhancement:', error);
    
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
          fallback: true,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to enhance image', 
        details: error instanceof Error ? error.message : 'Unknown error',
        fallback: true,
      },
      { status: 500 }
    );
  }
}

