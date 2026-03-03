'use server';
/**
 * @fileOverview Flux d'extracció de materials des d'imatges.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractMaterialsInputSchema = z.object({
  photoDataUri: z.string().describe("Data URI de la foto de l'albarà o tiquet."),
});
export type ExtractMaterialsInput = z.infer<typeof ExtractMaterialsInputSchema>;

const MaterialSchema = z.object({
  description: z.string().describe('Descripció del material en CATALÀ.'),
  quantity: z.number().describe('Quantitat utilitzada.'),
  unitPrice: z.number().describe('Preu unitari sense impostos.'),
});

const ExtractMaterialsOutputSchema = z.object({
  materials: z.array(MaterialSchema),
});
export type ExtractMaterialsOutput = z.infer<typeof ExtractMaterialsOutputSchema>;

export async function extractMaterialsFromPhoto(input: ExtractMaterialsInput): Promise<ExtractMaterialsOutput> {
  const flow = ai.defineFlow(
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
          { text: "Extract materials from this delivery note/invoice. Return a JSON list of objects with description, quantity, and unitPrice. IMPORTANT: Translate descriptions to CATALAN." }
        ],
        output: { schema: ExtractMaterialsOutputSchema }
      });
      return output!;
    }
  );
  return flow(input);
}
