// server/src/services/ai.service.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface MealAnalysis {
  estimatedKcal: number;
  detectedItems: string[];
}

export async function analyzeMealPhotos(
  imageBuffers: Buffer[],
  mimeTypes: string[],
): Promise<MealAnalysis> {
  const imageContent: Anthropic.ImageBlockParam[] = imageBuffers.map((buffer, i) => ({
    type: 'image',
    source: {
      type: 'base64',
      media_type: mimeTypes[i] as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
      data: buffer.toString('base64'),
    },
  }));

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

  const parsed = JSON.parse(match[0]) as MealAnalysis;
  return {
    estimatedKcal: Math.round(Number(parsed.estimatedKcal) || 0),
    detectedItems: Array.isArray(parsed.detectedItems) ? parsed.detectedItems : [],
  };
}
