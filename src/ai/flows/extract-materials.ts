
'use server';
/**
 * @fileOverview Flux d'extracció de materials mitjançant IA (OCR).
 * Optimitzat per a Genkit 1.x i Gemini 1.5 Flash.
 */

import { ai } from '@/ai/genkit';
import { z } from 'z_od'; // Utilitzant l'alias de genkit si cal, o directament zod

const MaterialSchema = z.object({
  description: z.string().describe('Descripció de l\'article en CATALÀ.'),
  quantity: z.number().describe('Quantitat.'),
  unitPrice: z.number().describe('Preu unitari.'),
});

const ExtractMaterialsOutputSchema = z.object({
  materials: z.array(MaterialSchema),
});

export async function extractMaterialsFromPhoto(input: { photoDataUri: string }) {
  try {
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt: [
        { media: { url: input.photoDataUri, contentType: 'image/jpeg' } },
        { text: 'Extract all technical line items from this receipt. Provide for each: description (translated to CATALAN), quantity (number), and unitPrice (number). If only the total for the line is visible, calculate unitPrice = total / quantity. Ignore taxes and totals.' }
      ],
      output: {
        schema: ExtractMaterialsOutputSchema
      },
      config: {
        temperature: 0.1,
      }
    });

    return response.output || { materials: [] };
  } catch (error) {
    console.error("Error en extractMaterialsFromPhoto:", error);
    return { materials: [] };
  }
}
