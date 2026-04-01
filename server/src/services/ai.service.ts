// server/src/services/ai.service.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface MealAnalysis {
  estimatedKcal: number;
  detectedItems: string[];
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

function assertMimeType(m: string): asserts m is AllowedMimeType {
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(m)) {
    throw new Error(`Type MIME non supporté : ${m}`);
  }
}

export async function analyzeMealPhotos(
  imageBuffers: Buffer[],
  mimeTypes: string[],
): Promise<MealAnalysis> {
  if (imageBuffers.length === 0) {
    throw new Error('Au moins une image est requise pour analyser un repas.');
  }

  if (imageBuffers.length !== mimeTypes.length) {
    throw new Error('imageBuffers et mimeTypes doivent avoir la même longueur.');
  }

  const imageContent: Anthropic.ImageBlockParam[] = imageBuffers.map((buffer, i) => {
    assertMimeType(mimeTypes[i]);
    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: mimeTypes[i] as AllowedMimeType,
        data: buffer.toString('base64'),
      },
    };
  });

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: [
          ...imageContent,
          {
            type: 'text',
            text: 'Analyse ce repas. Réponds UNIQUEMENT en JSON avec ce format exact (aucun texte avant ou après) : {"estimatedKcal": <nombre entier>, "detectedItems": ["<aliment> ~<quantité>", ...]}. Estime les calories totales. Liste les aliments principaux avec leur portion estimée.',
          },
        ],
      },
    ],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Réponse IA invalide');

  let parsed: MealAnalysis;
  try {
    parsed = JSON.parse(match[0]) as MealAnalysis;
  } catch {
    throw new Error('Réponse IA invalide : JSON malformé');
  }
  return {
    estimatedKcal: Math.round(Number(parsed.estimatedKcal) || 0),
    detectedItems: Array.isArray(parsed.detectedItems) ? parsed.detectedItems : [],
  };
}
