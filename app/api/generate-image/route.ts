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
 *   enjoyedCharacters?: string[] // Selected theme: ['Princesses'], ['Superheroes'], ['Animals'], ['Dragons']
 * }
 */

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

/**
 * Visual Style Definitions - Source of Truth
 * Maps each style to specific prompt modifiers for AI image generation
 */
interface StyleModifiers {
  colorPalette: string;
  lighting: string;
  detailLevel: string;
  artisticTone: string;
}

const styleModifiers: Record<string, StyleModifiers> = {
  'Cartoon': {
    colorPalette: 'bright, vibrant colors',
    lighting: 'soft, even lighting',
    detailLevel: 'simple shapes with soft outlines',
    artisticTone: 'playful cartoon style with rounded forms'
  },
  'Fantasy': {
    colorPalette: 'pastel colors with magical hues',
    lighting: 'magical lighting with soft pastel glow',
    detailLevel: 'whimsical elements with ethereal details',
    artisticTone: 'fantasy illustration with dreamlike atmosphere'
  },
  'Modern': {
    colorPalette: 'muted, sophisticated color palette',
    lighting: 'clean, balanced lighting',
    detailLevel: 'clean lines and minimalist design',
    artisticTone: 'modern, minimalist illustration style'
  },
  'Realistic': {
    colorPalette: 'natural, true-to-life colors',
    lighting: 'natural lighting with realistic shadows',
    detailLevel: 'high detail with lifelike proportions',
    artisticTone: 'realistic illustration with photographic qualities'
  },
  // French translations
  'Dessin animé': {
    colorPalette: 'bright, vibrant colors',
    lighting: 'soft, even lighting',
    detailLevel: 'simple shapes with soft outlines',
    artisticTone: 'playful cartoon style with rounded forms'
  },
  'Fantastique': {
    colorPalette: 'pastel colors with magical hues',
    lighting: 'magical lighting with soft pastel glow',
    detailLevel: 'whimsical elements with ethereal details',
    artisticTone: 'fantasy illustration with dreamlike atmosphere'
  },
  'Moderne': {
    colorPalette: 'muted, sophisticated color palette',
    lighting: 'clean, balanced lighting',
    detailLevel: 'clean lines and minimalist design',
    artisticTone: 'modern, minimalist illustration style'
  },
  'Réaliste': {
    colorPalette: 'natural, true-to-life colors',
    lighting: 'natural lighting with realistic shadows',
    detailLevel: 'high detail with lifelike proportions',
    artisticTone: 'realistic illustration with photographic qualities'
  }
};

/**
 * Get style-specific prompt modifiers for a given visual style
 * Ensures only ONE style is applied at a time
 */
function getStylePromptModifiers(visualStyle: string | string[]): StyleModifiers {
  // Handle both array and string input (backward compatibility)
  const style = Array.isArray(visualStyle) ? visualStyle[0] : visualStyle;
  return styleModifiers[style] || styleModifiers['Realistic'];
}

/**
 * Get theme-based companion description for friendly theme elements
 * Returns description of friendly companions that must be included in the image
 */
function getThemeCompanionDescription(theme: string | string[] | undefined): string {
  if (!theme) {
    return 'friendly companions';
  }
  
  // Handle both array and string input (backward compatibility)
  const selectedTheme = Array.isArray(theme) ? theme[0] : theme;
  
  const themeCompanions: Record<string, string> = {
    // English
    'Princesses': 'gentle princess fairytale elements, such as a friendly royal castle backdrop, magical sparkles, and optionally friendly unicorns or butterflies. The tone must be warm, kind, and empowering',
    'Superheroes': 'friendly superhero theme companions, such as child heroes in capes, glowing kindness powers, or friendly sidekick helpers',
    'Animals': 'friendly animals interacting with the children, such as puppies, bunnies, birds, or gentle forest animals',
    'Dragons': 'a friendly, gentle dragon clearly visible near the children. The dragon must be smiling, calm, protective, and playful',
    // French translations
    'Super-héros': 'friendly superhero theme companions, such as child heroes in capes, glowing kindness powers, or friendly sidekick helpers',
    'Animaux': 'friendly animals interacting with the children, such as puppies, bunnies, birds, or gentle forest animals',
  };
  
  return themeCompanions[selectedTheme] || 'friendly companions';
}

/**
 * Get negative constraints for theme to ensure friendliness
 */
function getThemeNegativeConstraints(theme: string | string[] | undefined): string {
  if (!theme) {
    return 'NO violence, NO scary imagery, NO villains, NO aggression';
  }
  
  const selectedTheme = Array.isArray(theme) ? theme[0] : theme;
  
  const negativeConstraints: Record<string, string> = {
    // English
    'Princesses': 'NO dark fantasy, NO villains, NO scary characters, NO violence',
    'Superheroes': 'NO weapons, NO fighting, NO villains, NO explosions, NO aggression, NO violence',
    'Animals': 'NO predators, NO scary animals, NO aggression, NO violence',
    'Dragons': 'NO fire breathing, NO scary dragon, NO battle, NO danger, NO violence',
    // French translations
    'Super-héros': 'NO weapons, NO fighting, NO villains, NO explosions, NO aggression, NO violence',
    'Animaux': 'NO predators, NO scary animals, NO aggression, NO violence',
  };
  
  return negativeConstraints[selectedTheme] || 'NO violence, NO scary imagery, NO villains, NO aggression';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { visualStyle, prompt, photoDescription, children, enjoyedCharacters } = body;

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

    // Get the single selected style and its modifiers
    // Ensure only ONE style is applied (take first if array)
    const selectedStyle = Array.isArray(visualStyle) ? visualStyle[0] : visualStyle;
    const modifiers = getStylePromptModifiers(selectedStyle);
    
    let imagePrompt = prompt;
    
    if (!imagePrompt) {
      // HARD REQUIREMENT 1: Count children exactly as provided
      const childCount = children && children.length > 0 ? children.length : 0;
      const childCountDescription = childCount === 1 
        ? 'exactly one child' 
        : childCount === 2 
        ? 'exactly two children together' 
        : childCount === 3
        ? 'exactly three children together'
        : 'children';
      
      // HARD REQUIREMENT 2: Get theme companion description
      const themeCompanion = getThemeCompanionDescription(enjoyedCharacters);
      const themeNegatives = getThemeNegativeConstraints(enjoyedCharacters);
      
      // Build child description with names (for reference, not required in image)
      let childNamesText = '';
      if (children && children.length > 0) {
        const childNames = children.map((c: { name: string; age: string }) => 
          c.name || 'child'
        ).join(' and ');
        childNamesText = ` (named ${childNames})`;
      }
      
      // Build prompt with style-specific modifiers, exact child count, and theme companions
      // CRITICAL: Explicitly prevent split/two-page layouts - must be ONE single, unified image
      imagePrompt = `Create a beautiful ${modifiers.artisticTone} illustration for a children's bedtime story book cover. 

CHILD COUNT REQUIREMENT (HARD CONSTRAINT):
- Show ${childCountDescription}${childNamesText}
- ${childCount === 0 ? 'Include children' : `Include exactly ${childCount} child${childCount > 1 ? 'ren' : ''}`} - no extra children, no missing children
- All children must be age-appropriate (kids, not adults)
- All children must be clearly visible and central in the scene
- Children do not need to have names written in the image

THEME COMPANION REQUIREMENT (HARD CONSTRAINT):
- Include ${themeCompanion}
- All companions must be friendly, kind, non-scary, non-violent
- ${themeNegatives}
- Children and companions must be in the same scene and feel connected

STYLE REQUIREMENTS:
- Use ${modifiers.colorPalette}
- Apply ${modifiers.lighting}
- Include ${modifiers.detailLevel}
- The illustration should be child-friendly, warm, and inviting, suitable for a bedtime story

COMPOSITION REQUIREMENTS (CRITICAL):
- ONE SINGLE, UNIFIED IMAGE ONLY
- Single continuous canvas with no divisions
- Single focal scene centered in frame
- NO book pages, NO open book, NO storybook spread
- NO split panels, NO diptychs, NO left/right framing
- NO double panel layouts, NO mirrored compositions
- NO book-style layouts of any kind
- The image must be a standalone illustration like a poster or cover art
- One cohesive scene, not multiple scenes or pages`;
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
