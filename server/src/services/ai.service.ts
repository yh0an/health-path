// server/src/services/ai.service.ts
import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface MealItem {
  name: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MealAnalysis {
  items: MealItem[];
  estimatedKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  detectedItems: string[];
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

function assertMimeType(m: string): asserts m is AllowedMimeType {
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(m)) {
    throw new Error(`Type MIME non supporté : ${m}`);
  }
}

const ITEM_FORMAT = '{"name": "<aliment> ~<quantité>", "kcal": <entier>, "proteinG": <entier>, "carbsG": <entier>, "fatG": <entier>}';
const JSON_FORMAT = `{"items": [${ITEM_FORMAT}, ...]}`;

function parseAnalysis(raw: string): MealAnalysis {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Réponse IA invalide');
  let parsed: { items: MealItem[] };
  try {
    parsed = JSON.parse(match[0]) as { items: MealItem[] };
  } catch {
    throw new Error('Réponse IA invalide : JSON malformé');
  }
  const items: MealItem[] = Array.isArray(parsed.items)
    ? parsed.items.map(it => ({
        name: String(it.name ?? ''),
        kcal: Math.round(Number(it.kcal) || 0),
        proteinG: Math.round(Number(it.proteinG) || 0),
        carbsG: Math.round(Number(it.carbsG) || 0),
        fatG: Math.round(Number(it.fatG) || 0),
      }))
    : [];
  return {
    items,
    estimatedKcal: items.reduce((s, it) => s + it.kcal, 0),
    proteinG: items.reduce((s, it) => s + it.proteinG, 0),
    carbsG: items.reduce((s, it) => s + it.carbsG, 0),
    fatG: items.reduce((s, it) => s + it.fatG, 0),
    detectedItems: items.map(it => it.name),
  };
}

export async function analyzeMealPhotos(
  imageBuffers: Buffer[],
  mimeTypes: string[],
  notes?: string,
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
      source: { type: 'base64', media_type: 'image/jpeg', data: buffer.toString('base64') },
    };
  });

  const notesText = notes?.trim() ? `\nNote de l'utilisateur : ${notes.trim()}` : '';
  const prompt = `Analyse ce repas et liste chaque ingrédient/composant séparément avec ses valeurs nutritionnelles.${notesText}
Réponds UNIQUEMENT en JSON avec ce format exact (aucun texte avant ou après) : ${JSON_FORMAT}
Pour chaque aliment détecté, estime ses macros individuels (kcal, protéines, glucides, lipides en grammes entiers).`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    temperature: 0,
    messages: [{ role: 'user', content: [...imageContent, { type: 'text', text: prompt }] }],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  return parseAnalysis(raw);
}
