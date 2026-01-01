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

/**
 * Get expected theme companion keywords based on theme selection
 */
function getThemeCompanionKeywords(theme: string | string[] | undefined): string[] {
  if (!theme) {
    return [];
  }
  const selectedTheme = Array.isArray(theme) ? theme[0] : theme;
  const keywords: Record<string, string[]> = {
    'Princesses': ['princess', 'princesse', 'royal', 'royal', 'castle', 'château', 'unicorn', 'licorne', 'fairy', 'fée', 'crown', 'couronne'],
    'Superheroes': ['superhero', 'super-héros', 'superheroes', 'super-héros', 'cape', 'cape', 'hero', 'héros', 'power', 'pouvoir', 'super'],
    'Animals': ['animal', 'animaux', 'puppy', 'chiot', 'bunny', 'lapin', 'bird', 'oiseau', 'dog', 'chien', 'cat', 'chat', 'rabbit', 'lapin'],
    'Dragons': ['dragon', 'dragon', 'dragons'],
    // French translations
    'Super-héros': ['superhero', 'super-héros', 'superheroes', 'super-héros', 'cape', 'cape', 'hero', 'héros', 'power', 'pouvoir', 'super'],
    'Animaux': ['animal', 'animaux', 'puppy', 'chiot', 'bunny', 'lapin', 'bird', 'oiseau', 'dog', 'chien', 'cat', 'chat', 'rabbit', 'lapin'],
  };
  return keywords[selectedTheme] || [];
}

/**
 * Evaluate if the story meets quality criteria
 * Returns { valid: boolean, reasons: string[] }
 */
function evaluateStory(
  story: StoryResponse,
  childrenData: Array<{ name: string; age: string }>,
  theme: string | string[] | undefined,
  language: 'en' | 'fr'
): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const fullStoryText = `${story.title} ${story.sections.map(s => `${s.headline} ${s.body}`).join(' ')}`.toLowerCase();
  const childNames = childrenData.map(c => c.name.toLowerCase());

  // Check 1: Child names are used consistently
  for (const child of childrenData) {
    const nameCount = (fullStoryText.match(new RegExp(`\\b${child.name.toLowerCase()}\\b`, 'g')) || []).length;
    if (nameCount === 0) {
      reasons.push(`${language === 'fr' ? 'Le nom' : 'The name'} ${child.name} ${language === 'fr' ? "n'est pas utilisé dans l'histoire" : 'is not used in the story'}`);
    }
  }

  // Check 2: Child is central protagonist (check for active verbs and child as subject)
  // Count instances where child names appear in active contexts
  let activeChildMentions = 0;
  for (const name of childNames) {
    // Look for patterns like "name verb" or "name did" which indicate active participation
    // Use language-agnostic patterns that work for both English and French
    const activePatterns = language === 'fr'
      ? [
          // French verb patterns
          new RegExp(`\\b${name}\\s+(est|était|sera|va|fait|fait|dit|voit|trouve|découvre|explore|décide|choisit|aide|joue|court|saute|vole|grimpe|résout|sauve|rencontre|parle|demande|raconte|partage|donne|prend|crée|construit|fabrique)`, 'gi'),
          new RegExp(`\\b${name}\\s+(a|avait|aura)\\s+`, 'gi'), // "name has/had/will have"
          new RegExp(`\\bde\\s+${name}\\b`, 'gi'), // "of name" / "name's" equivalent
        ]
      : [
          // English verb patterns
          new RegExp(`\\b${name}\\s+(went|did|said|saw|found|discovered|explored|decided|chose|helped|played|ran|jumped|flew|climbed|solved|saved|met|talked|asked|told|shared|gave|took|made|built|created)`, 'gi'),
          new RegExp(`\\b${name}\\s+(was|is|has|had|will)\\s+`, 'gi'), // "name was/is/has/had/will"
          new RegExp(`\\b${name}'s\\s+(adventure|journey|story|quest|mission|trip|journey)`, 'gi'),
        ];
    for (const pattern of activePatterns) {
      activeChildMentions += (fullStoryText.match(pattern) || []).length;
    }
  }

  // If children are mentioned but not in active roles, this is a problem
  const totalChildMentions = childNames.reduce((sum, name) => {
    return sum + (fullStoryText.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;
  }, 0);

  // For short stories, require at least 1 active mention if child is mentioned multiple times
  // For longer stories, require at least 2 active mentions
  const minActiveMentions = totalChildMentions <= 3 ? 1 : 2;
  if (totalChildMentions > 0 && activeChildMentions < minActiveMentions) {
    reasons.push(language === 'fr' 
      ? "L'enfant n'est pas le protagoniste actif - l'histoire doit montrer l'enfant agissant et participant"
      : 'The child is not the active protagonist - the story must show the child acting and participating');
  }

  // Check 3: Avoid instructional/philosophical tone (negative patterns)
  const instructionalPatterns = [
    /\b(learned that|learns that|learns|taught|teaches|lesson|lessons|moral|wisdom|philosophy)\b/gi,
    /\b(the story teaches|this story shows|this teaches)\b/gi,
    /\b(should remember|must remember|important to remember)\b/gi,
  ];
  let instructionalCount = 0;
  for (const pattern of instructionalPatterns) {
    instructionalCount += (fullStoryText.match(pattern) || []).length;
  }
  if (instructionalCount > 2) {
    reasons.push(language === 'fr'
      ? "Le ton est trop instructif - l'histoire doit être narrative, pas éducative"
      : 'The tone is too instructional - the story must be narrative, not educational');
  }

  // Check 4: Theme companion is present
  const themeKeywords = getThemeCompanionKeywords(theme);
  if (themeKeywords.length > 0) {
    const companionFound = themeKeywords.some(keyword => 
      fullStoryText.includes(keyword.toLowerCase())
    );
    if (!companionFound) {
      const selectedTheme = Array.isArray(theme) ? theme[0] : theme;
      reasons.push(language === 'fr'
        ? `Le compagnon thématique (${selectedTheme}) n'est pas présent dans l'histoire`
        : `Theme companion (${selectedTheme}) is not present in the story`);
    }
  }

  return {
    valid: reasons.length === 0,
    reasons,
  };
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      // Handle JSON parsing errors (may indicate body size limit exceeded)
      console.error('Failed to parse request body:', jsonError);
      return NextResponse.json(
        { 
          error: 'Request body too large or invalid',
          details: 'The request payload may be too large. If you uploaded an image, please try a smaller image (under 10MB) or a different format.',
          code: 'BODY_TOO_LARGE'
        },
        { status: 413 }
      );
    }
    const language: 'en' | 'fr' = body.language || 'en';

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

    // Build the system prompt based on language
    const systemPrompt = language === 'fr'
      ? `Tu es un générateur d'histoires du soir. Je vais te fournir les noms et âges exacts des enfants, le thème de l'histoire, la longueur, et les personnages préférés.

EXIGENCES CRITIQUES - À RESPECTER:
- Tu DOIS utiliser les noms EXACTS fournis pour les enfants. Ne change PAS, ne modifie PAS, et ne substitue PAS ces noms par d'autres noms.
- Utilise les noms des enfants de manière cohérente tout au long de l'histoire.
- Si plusieurs enfants sont fournis, inclus-les tous dans l'histoire en utilisant leurs noms exacts.
- Les âges des enfants doivent être reflétés dans le contenu de l'histoire et le niveau de langue.

EXIGENCE DE PROTAGONISTE (CONTRAINTE FERME):
- L'enfant (les enfants) DOIT (DOIVENT) être le(s) protagoniste(s) central(aux) et le(s) personnage(s) principal(aux) de l'histoire.
- L'histoire doit être SUR les actions, expériences, émotions et aventures de l'enfant.
- Écris l'histoire DU point de vue de l'enfant ou comme une narration où l'enfant est le héros actif.
- N'écris PAS comme si tu faisais une leçon, enseignais ou philosophais à propos de l'enfant.
- Ne positionne PAS un narrateur externe comme héros - l'enfant est le héros.
- Montre l'enfant agissant, découvrant, expérimentant et participant aux événements de l'histoire.
- L'enfant doit faire des choses activement, prendre des décisions et faire avancer l'histoire.

EXIGENCE DE COMPAGNON THÉMATIQUE (CONTRAINTE FERME):
- L'histoire DOIT inclure un compagnon ou élément basé sur le thème qui correspond au thème sélectionné.
- Le compagnon doit apparaître naturellement dans l'histoire et interagir avec l'enfant (les enfants).
- Le compagnon doit être gentil, amical et non menaçant.
- Compagnons thématiques:
  * Princesses → Inclure une princesse amicale, un personnage royal, ou des éléments de conte de fées
  * Super-héros → Inclure un compagnon super-héros, une identité de héros enfant, ou des éléments super-héros
  * Animaux → Inclure un compagnon animal amical qui interagit avec l'enfant
  * Dragons → Inclure un dragon amical et doux qui apparaît dans l'histoire
- Le compagnon doit être présent tout au long de l'histoire, pas seulement mentionné une fois.

EXIGENCE DE TON DE L'HISTOIRE:
- Écris comme une histoire narrative, PAS comme du contenu éducatif ou une réflexion philosophique.
- L'histoire doit montrer des événements qui se produisent POUR et AVEC l'enfant, pas des leçons enseignées À PROPOS de l'enfant.
- Évite les phrases comme "Atlas a appris que..." ou "L'histoire enseigne à Atlas que..." - montre plutôt Atlas faisant et expérimentant.

Format des variables:
{{length}} sera le nombre de minutes que l'histoire devrait prendre à lire
{{theme}} sera une chaîne décrivant le thème pédagogique (par exemple, "gentillesse", "courage")
{{children}} sera un tableau d'objets, chacun contenant "name" (nom exact à utiliser) et "age"
{{characters}} sera un tableau de types de personnages que les enfants apprécient (sélection de thème)

Génère l'histoire dans la contrainte de temps. Divise l'histoire en sections avec des titres clairs.

Format de sortie:
Retourne UNIQUEMENT du JSON valide dans ce format exact (pas de texte supplémentaire, pas de markdown, juste le JSON):
{
  "title": "Titre de l'Histoire",
  "sections": [
    {
      "headline": "Titre de Section",
      "body": "Texte du corps de la section ici..."
    }
  ]
}`
      : `You are a bedtime story generator. I will provide you with the exact names and ages of children, the theme of the story, the length, and preferred characters.

CRITICAL REQUIREMENTS - MUST FOLLOW:
- You MUST use the EXACT names provided for the children. Do NOT change, modify, or substitute these names with any other names.
- Use the children's names consistently throughout the entire story.
- If multiple children are provided, include all of them in the story using their exact names.
- The children's ages should be reflected in the story content and language level.

PROTAGONIST REQUIREMENT (HARD CONSTRAINT):
- The child(ren) MUST be the central protagonist(s) and main character(s) of the story.
- The story must be ABOUT the child's actions, experiences, emotions, and adventures.
- Write the story FROM the child's perspective or as a narrative WHERE the child is the active hero.
- DO NOT write as if you are lecturing, teaching, or philosophizing to/about the child.
- DO NOT position an external narrator as the hero - the child is the hero.
- Show the child acting, discovering, experiencing, and participating in the story events.
- The child must be actively doing things, making decisions, and driving the story forward.

THEME COMPANION REQUIREMENT (HARD CONSTRAINT):
- The story MUST include a theme-based companion or element that matches the selected theme.
- The companion must appear naturally in the story and interact with the child(ren).
- The companion must be kind, friendly, and non-threatening.
- Theme companions:
  * Princesses → Include a friendly princess, royal character, or fairytale elements
  * Superheroes → Include a superhero companion, child hero identity, or superhero elements
  * Animals → Include a friendly animal companion that interacts with the child
  * Dragons → Include a friendly, gentle dragon that appears in the story
- The companion must be present throughout the story, not just mentioned once.

STORY TONE REQUIREMENT:
- Write as a narrative story, NOT as instructional content or philosophical reflection.
- The story should show events happening TO and WITH the child, not lessons being taught ABOUT the child.
- Avoid phrases like "Atlas learned that..." or "The story teaches Atlas that..." - instead show Atlas doing and experiencing.

Variable format:
{{length}} will be the number of minutes the story should take to read
{{theme}} will be a string describing the teaching theme (e.g., "kindness", "bravery")
{{children}} will be an array of objects, each containing "name" (exact name to use) and "age"
{{characters}} will be an array of character types the children enjoy (theme selection)

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
    const childrenNamesList = childrenData.map((c: { name: string; age: string }) => `${c.name} (${language === 'fr' ? 'âge' : 'age'} ${c.age})`).join(language === 'fr' ? ' et ' : ' and ');
    
    // User prompt with the actual values (replacing the placeholders)
    const userPrompt = language === 'fr'
      ? `Génère une histoire du soir avec les détails suivants:

ENFANTS (UTILISE CES NOMS EXACTS COMME PROTAGONISTES CENTRAUX): ${childrenNamesList}
Données des enfants: ${JSON.stringify(childrenData)}

Thème: ${themeString}
Longueur de l'histoire: ${lengthMinutes} minutes
Personnages/thème préférés: ${characters.length > 0 ? characters.join(', ') : 'n\'importe lesquels'}

EXIGENCES CRITIQUES DE L'HISTOIRE:
1. L'enfant (les enfants) ${childrenData.map((c: { name: string; age: string }) => c.name).join(' et ')} DOIT (DOIVENT) être le(s) protagoniste(s) central(aux). ${childrenData.length === 1 ? "L'enfant" : 'Les enfants'} ${childrenData.length === 1 ? 'est' : 'sont'} le(s) héros de l'histoire.
2. Écris l'histoire SUR les actions, expériences et aventures de ${childrenData.map((c: { name: string; age: string }) => c.name).join(' et ')}. Montre ${childrenData.length === 1 ? "l'enfant" : 'les enfants'} faisant activement des choses, prenant des décisions et participant aux événements de l'histoire.
3. N'écris PAS comme si tu faisais une leçon ou enseignais À l'enfant. Ne philosophe PAS À PROPOS de l'enfant. Écris une narration OÙ l'enfant est le héros actif.
4. DOIT inclure un compagnon basé sur le thème: ${characters.length > 0 ? characters[0] : 'compagnon amical'}. Le compagnon doit apparaître naturellement dans l'histoire, interagir avec ${childrenData.length === 1 ? "l'enfant" : 'les enfants'}, et être gentil et amical.
5. Utilise les noms exacts ${childrenData.map((c: { name: string; age: string }) => c.name).join(', ')} de manière cohérente. N'utilise aucun autre nom.

Retourne uniquement du JSON valide dans ce format exact (pas de texte supplémentaire, pas de markdown, uniquement le JSON):
{
  "title": "Titre de l'Histoire",
  "sections": [
    {
      "headline": "Titre de Section",
      "body": "Texte du corps de la section ici..."
    }
  ]
}`
      : `Generate a bedtime story with the following details:

CHILDREN (USE THESE EXACT NAMES AS CENTRAL PROTAGONISTS): ${childrenNamesList}
Children data: ${JSON.stringify(childrenData)}

Theme: ${themeString}
Story length: ${lengthMinutes} minutes
Preferred characters/theme: ${characters.length > 0 ? characters.join(', ') : 'any'}

CRITICAL STORY REQUIREMENTS:
1. The child(ren) ${childrenData.map((c: { name: string; age: string }) => c.name).join(' and ')} MUST be the central protagonist(s). They are the hero(es) of the story.
2. Write the story ABOUT ${childrenData.map((c: { name: string; age: string }) => c.name).join(' and ')}'s actions, experiences, and adventures. Show ${childrenData.length === 1 ? 'the child' : 'the children'} actively doing things, making decisions, and participating in story events.
3. DO NOT write as if lecturing or teaching TO the child. DO NOT philosophize ABOUT the child. Write a narrative WHERE the child is the active hero.
4. MUST include a theme-based companion: ${characters.length > 0 ? characters[0] : 'friendly companion'}. The companion must appear naturally in the story, interact with ${childrenData.length === 1 ? 'the child' : 'the children'}, and be kind and friendly.
5. Use the exact names ${childrenData.map((c: { name: string; age: string }) => c.name).join(', ')} consistently throughout. Do not use any other names.

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

    // Generate story with evaluation and retry logic
    const MAX_RETRIES = 3;
    let storyData: StoryResponse | null = null;
    let lastEvaluation: { valid: boolean; reasons: string[] } | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
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
            content: attempt > 0 && lastEvaluation
              ? `${userPrompt}\n\nREGENERATION REQUIRED - Previous attempt failed evaluation:\n${lastEvaluation.reasons.map(r => `- ${r}`).join('\n')}\n\nPlease regenerate the story ensuring ALL requirements are met.`
              : userPrompt,
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
      let parsedStory: StoryResponse | null = null;
      try {
        parsedStory = JSON.parse(responseContent) as StoryResponse;
      } catch (parseError) {
        // If JSON parsing fails, try to extract JSON from the response
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedStory = JSON.parse(jsonMatch[0]) as StoryResponse;
        } else {
          throw new Error('Failed to parse story JSON from OpenAI response');
        }
      }

      // Validate the response structure
      if (!parsedStory || !parsedStory.title || !parsedStory.sections || !Array.isArray(parsedStory.sections)) {
        throw new Error('Invalid story structure received from OpenAI');
      }

      // Assign validated story data
      storyData = parsedStory;

      // Evaluate the story
      lastEvaluation = evaluateStory(storyData, childrenData, characters, language);
      
      if (lastEvaluation.valid) {
        // Story passes evaluation - break out of retry loop
        break;
      } else if (attempt < MAX_RETRIES - 1) {
        // Story failed evaluation but we have retries left - continue loop
        console.warn(`Story evaluation failed (attempt ${attempt + 1}/${MAX_RETRIES}):`, lastEvaluation.reasons);
        storyData = null; // Reset to allow regeneration
      }
      // If this is the last attempt and story is still invalid, we'll return it anyway
      // (better to return something than fail completely)
    }

    if (!storyData) {
      throw new Error('Failed to generate valid story after retries');
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
