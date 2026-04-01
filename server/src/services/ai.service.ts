// server/src/services/ai.service.ts
import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';

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

  const resized = await Promise.all(
    imageBuffers.map(buf =>
      sharp(buf).resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer()
    )
  );

  const imageContent: Anthropic.ImageBlockParam[] = resized.map((buffer, i) => {
    assertMimeType(mimeTypes[i]);
    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: buffer.toString('base64'),
      },
    };
  });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
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
