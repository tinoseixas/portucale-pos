'use server';
/**
 * @fileOverview Flux d'extracció de materials mitjançant IA (OCR).
 * Optimitzat per a Genkit 1.x i Gemini 1.5 Flash amb suport multimodal.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const MaterialSchema = z.object({
  description: z.string().describe('Detailed technical description in professional CATALAN.'),
  quantity: z.number().describe('The numeric quantity.'),
  unitPrice: z.number().describe('The price per unit.'),
});

const ExtractMaterialsInputSchema = z.object({
  photoDataUri: z.string().describe("A photo of a receipt or a specific line item, as a data URI."),
  isSingleItem: z.boolean().optional().describe("If true, the AI should focus on extracting only one main item from the image.")
});

const ExtractMaterialsOutputSchema = z.object({
  materials: z.array(MaterialSchema),
});

export type ExtractMaterialsInput = z.infer<typeof ExtractMaterialsInputSchema>;
export type ExtractMaterialsOutput = z.infer<typeof ExtractMaterialsOutputSchema>;

/**
 * Definició del prompt per a l'extracció de dades de tiquets.
 * Utilitza Gemini 1.5 Flash per a una millor visió artificial.
 */
const extractMaterialsPrompt = ai.definePrompt({
  name: 'extractMaterialsPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: ExtractMaterialsInputSchema },
  output: { schema: ExtractMaterialsOutputSchema },
  config: {
    temperature: 0.1, // Mínima variabilitat per a dades numèriques
  },
  prompt: `You are an expert OCR assistant for construction supply receipts. 
  
  TASK:
  {{#if isSingleItem}}
  Focus ONLY on the most prominent single item or line shown in this image. Extract its technical description, quantity, and unit price.
  {{else}}
  Extract all individual technical line items from this receipt image. Ignore totals, tax info, and store headers.
  {{/if}}
  
  EXTRACTION RULES:
  - description: Translate the technical name to professional CATALAN (e.g., "Tub multicapa", "Colze 90", "Aixeta").
  - quantity: The number of units. If not clearly visible, assume 1.
  - unitPrice: The price per unit before any line discounts. If only total is visible, calculate unitPrice = total / quantity.
  
  The output MUST be a valid JSON object with a "materials" array.
  
  Image to analyze: {{media url=photoDataUri}}`,
});

/**
 * Funció principal per extreure materials d'una foto.
 */
export async function extractMaterialsFromPhoto(input: ExtractMaterialsInput): Promise<ExtractMaterialsOutput> {
  try {
    const { output } = await extractMaterialsPrompt(input);
    if (!output || !output.materials) {
        return { materials: [] };
    }
    return output;
  } catch (error) {
    console.error("Error in extractMaterialsFromPhoto:", error);
    return { materials: [] };
  }
}
