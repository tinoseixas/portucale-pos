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
 */
const extractMaterialsPrompt = ai.definePrompt({
  name: 'extractMaterialsPrompt',
  input: { schema: ExtractMaterialsInputSchema },
  output: { schema: ExtractMaterialsOutputSchema },
  prompt: `Act as an expert OCR assistant for construction and technical services. 
  
  {{#if isSingleItem}}
  Focus ONLY on the most prominent item in this image. Extract its technical description, quantity, and unit price.
  {{else}}
  Extract all technical line items from this receipt image. 
  {{/if}}
  
  For each item:
  - description: Translate the technical name to professional CATALAN.
  - quantity: The number of units.
  - unitPrice: The price per unit. If you only see the line total, calculate unitPrice = total / quantity.
  
  Rules:
  - Output MUST be valid JSON matching the schema.
  - Descriptions must be in CATALAN.
  - Ignore totals, taxes (IGI/IVA), and shop headers.
  
  Image: {{media url=photoDataUri}}`,
});

/**
 * Funció principal per extreure materials d'una foto.
 */
export async function extractMaterialsFromPhoto(input: ExtractMaterialsInput): Promise<ExtractMaterialsOutput> {
  try {
    const { output } = await extractMaterialsPrompt(input);
    return output || { materials: [] };
  } catch (error) {
    console.error("Error in extractMaterialsFromPhoto:", error);
    return { materials: [] };
  }
}
