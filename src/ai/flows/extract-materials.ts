'use server';
/**
 * @fileOverview Flux d'extracció de materials mitjançant IA (OCR).
 * Optimitzat per a Genkit 1.x i Gemini 1.5 Flash.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MaterialSchema = z.object({
  description: z.string().describe('Descripció de l\'article en CATALÀ.'),
  quantity: z.number().describe('Quantitat.'),
  unitPrice: z.number().describe('Preu unitari.'),
});

const ExtractMaterialsInputSchema = z.object({
  photoDataUri: z.string().describe("A photo of a receipt, as a data URI.")
});

const ExtractMaterialsOutputSchema = z.object({
  materials: z.array(MaterialSchema),
});

export type ExtractMaterialsInput = z.infer<typeof ExtractMaterialsInputSchema>;
export type ExtractMaterialsOutput = z.infer<typeof ExtractMaterialsOutputSchema>;

/**
 * Definició del prompt per a l'extracció de dades de tiquets.
 * Utilitza multimodalitat per analitzar la imatge directament.
 */
const extractMaterialsPrompt = ai.definePrompt({
  name: 'extractMaterialsPrompt',
  input: { schema: ExtractMaterialsInputSchema },
  output: { schema: ExtractMaterialsOutputSchema },
  prompt: `Extract all technical line items from this receipt image. 
  
  For each item, identify:
  - description: Translated to professional technical CATALAN.
  - quantity: The number of units (number).
  - unitPrice: The price per unit. If only the total for the line is visible, calculate unitPrice = line total / quantity. 
  
  Instructions:
  - Ignore taxes (IVA/IGI) and overall document totals. 
  - Focus only on individual materials, tools, or labor lines.
  - If the text is messy, try your best to guess the technical description.
  
  Photo: {{media url=photoDataUri}}`,
});

/**
 * Funció principal per extreure materials d'una foto.
 */
export async function extractMaterialsFromPhoto(input: ExtractMaterialsInput): Promise<ExtractMaterialsOutput> {
  try {
    const { output } = await extractMaterialsPrompt(input);
    return output || { materials: [] };
  } catch (error) {
    console.error("Error en extractMaterialsFromPhoto:", error);
    return { materials: [] };
  }
}
