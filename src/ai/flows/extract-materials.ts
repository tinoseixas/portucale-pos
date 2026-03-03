'use server';
/**
 * @fileOverview Flux d'extracció de materials mitjançant IA (OCR).
 * 
 * Optimitzat per a Genkit 1.x i Gemini 1.5 Flash.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractMaterialsInputSchema = z.object({
  photoDataUri: z.string().describe("Data URI de la imatge del document."),
});
export type ExtractMaterialsInput = z.infer<typeof ExtractMaterialsInputSchema>;

const MaterialSchema = z.object({
  description: z.string().describe('Descripció de l\'article en CATALÀ.'),
  quantity: z.number().describe('Quantitat (número).'),
  unitPrice: z.number().describe('Preu unitari sense impostos.'),
});

const ExtractMaterialsOutputSchema = z.object({
  materials: z.array(MaterialSchema),
});
export type ExtractMaterialsOutput = z.infer<typeof ExtractMaterialsOutputSchema>;

const extractMaterialsPrompt = ai.definePrompt({
  name: 'extractMaterialsPrompt',
  input: { schema: ExtractMaterialsInputSchema },
  output: { schema: ExtractMaterialsOutputSchema },
  prompt: `You are an expert OCR and data extraction system for construction receipts.
    
    Analyze this document image: {{media url=photoDataUri}}
    
    TASK:
    1. Identify all items, materials, or services purchased.
    2. For each item, extract the description, quantity, and unit price.
    3. Translate all descriptions into professional technical CATALAN.
    4. If only a total per line is found, calculate: unitPrice = total / quantity.
    5. Return the list of items in the specified JSON format.
    
    IMPORTANT: Be extremely precise with numbers. If the text is slightly blurry, try your best to interpret the characters based on the context of a construction supply store.`,
});

const extractMaterialsFlow = ai.defineFlow(
  {
    name: 'extractMaterialsFromPhotoFlow',
    inputSchema: ExtractMaterialsInputSchema,
    outputSchema: ExtractMaterialsOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await extractMaterialsPrompt(input, {
        model: 'googleai/gemini-1.5-flash',
        config: {
          temperature: 0.1, // Més determinista per a dades numèriques
        }
      });
      
      if (!output || !output.materials) {
        return { materials: [] };
      }
      
      return output;
    } catch (error) {
      console.error("Error en extractMaterialsFlow:", error);
      return { materials: [] };
    }
  }
);

export async function extractMaterialsFromPhoto(input: ExtractMaterialsInput): Promise<ExtractMaterialsOutput> {
  return await extractMaterialsFlow(input);
}
