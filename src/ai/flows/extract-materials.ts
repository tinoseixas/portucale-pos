'use server';
/**
 * @fileOverview Flux d'extracció de materials des d'imatges utilitzant Genkit.
 * 
 * - extractMaterialsFromPhoto: Funció principal que crida al flux d'IA.
 * - ExtractMaterialsInput: Esquema d'entrada amb la foto en base64.
 * - ExtractMaterialsOutput: Llista de materials extrets (descripció, quantitat, preu).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractMaterialsInputSchema = z.object({
  photoDataUri: z.string().describe("Data URI de la foto de l'albarà o tiquet. Format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type ExtractMaterialsInput = z.infer<typeof ExtractMaterialsInputSchema>;

const MaterialSchema = z.object({
  description: z.string().describe('Descripció detallada del material en CATALÀ.'),
  quantity: z.number().describe('Quantitat numèrica utilitzada.'),
  unitPrice: z.number().describe('Preu unitari sense impostos.'),
});

const ExtractMaterialsOutputSchema = z.object({
  materials: z.array(MaterialSchema),
});
export type ExtractMaterialsOutput = z.infer<typeof ExtractMaterialsOutputSchema>;

const extractMaterialsFlow = ai.defineFlow(
  {
    name: 'extractMaterialsFromPhoto',
    inputSchema: ExtractMaterialsInputSchema,
    outputSchema: ExtractMaterialsOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt: [
        { media: { url: input.photoDataUri } },
        { text: "Extract all materials and labor items from this document image. Return a JSON list of objects with description, quantity, and unitPrice. IMPORTANT: Translate all descriptions to CATALAN. If a price is not found, use 0." }
      ],
      output: { schema: ExtractMaterialsOutputSchema }
    });
    return output!;
  }
);

export async function extractMaterialsFromPhoto(input: ExtractMaterialsInput): Promise<ExtractMaterialsOutput> {
  return extractMaterialsFlow(input);
}
