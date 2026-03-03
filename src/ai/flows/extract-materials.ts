'use server';
/**
 * @fileOverview Flux d'extracció de materials mitjançant IA (OCR).
 * Optimitzat per a Genkit 1.x i Gemini 1.5 Flash.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const MaterialSchema = z.object({
  description: z.string().describe('Detailed technical description in professional CATALAN.'),
  quantity: z.number().describe('The numeric quantity.'),
  unitPrice: z.number().describe('The price per unit.'),
});

const ExtractMaterialsInputSchema = z.object({
  photoDataUri: z.string().describe("A photo of a receipt, as a data URI."),
  isSingleItem: z.boolean().optional().describe("If true, focus on one item.")
});

const ExtractMaterialsOutputSchema = z.object({
  materials: z.array(MaterialSchema),
});

export type ExtractMaterialsInput = z.infer<typeof ExtractMaterialsInputSchema>;
export type ExtractMaterialsOutput = z.infer<typeof ExtractMaterialsOutputSchema>;

/**
 * Funció principal per extreure materials d'una foto mitjançant OCR intel·ligent.
 */
export async function extractMaterialsFromPhoto(input: ExtractMaterialsInput): Promise<ExtractMaterialsOutput> {
  try {
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      config: {
        temperature: 0.1,
      },
      output: {
        schema: ExtractMaterialsOutputSchema
      },
      prompt: [
        { media: { url: input.photoDataUri } },
        { text: `You are an expert OCR assistant for construction supply receipts. 
        
        TASK:
        ${input.isSingleItem 
          ? "Focus ONLY on the most prominent single item shown in this image. Extract its description, quantity, and unit price." 
          : "Extract ALL individual technical line items from this receipt image. Ignore totals, tax info, and store headers."
        }
        
        EXTRACTION RULES:
        - description: Translate technical names to professional CATALAN (e.g., "Tub multicapa", "Colze 90").
        - quantity: The number of units. If not visible, assume 1.
        - unitPrice: The price per unit before discounts.
        
        The output must be a JSON object with a "materials" array.` }
      ],
    });

    const result = response.output;
    if (!result || !result.materials) {
        return { materials: [] };
    }
    return result;
  } catch (error) {
    console.error("Error in extractMaterialsFromPhoto:", error);
    return { materials: [] };
  }
}
