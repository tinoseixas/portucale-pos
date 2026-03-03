'use server';
/**
 * @fileOverview Flux d'extracció de materials des d'imatges utilitzant Genkit.
 * 
 * - extractMaterialsFromPhoto: Funció principal que crida al flux d'IA.
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

// Definim el prompt per a l'extracció visual
const extractMaterialsPrompt = ai.definePrompt({
  name: 'extractMaterialsPrompt',
  input: { schema: ExtractMaterialsInputSchema },
  output: { schema: ExtractMaterialsOutputSchema },
  prompt: [
    { media: { url: '{{photoDataUri}}' } },
    { text: `Extrau tots els materials i articles de mà d'obra d'aquesta imatge de document (tiquet o albarà de compra).
    
    INSTRUCCIONS:
    1. Tradueix totes les descripcions al CATALÀ.
    2. Identifica clarament la quantitat i el preu unitari.
    3. Si no trobes el preu, posa 0.
    4. Ignora dades de l'empresa o dates, només volem la llista d'articles comprats.` }
  ],
});

const extractMaterialsFlow = ai.defineFlow(
  {
    name: 'extractMaterialsFromPhotoFlow',
    inputSchema: ExtractMaterialsInputSchema,
    outputSchema: ExtractMaterialsOutputSchema,
  },
  async (input) => {
    const { output } = await extractMaterialsPrompt(input, {
      model: 'googleai/gemini-1.5-flash',
    });
    
    if (!output) {
      return { materials: [] };
    }
    
    return output;
  }
);

export async function extractMaterialsFromPhoto(input: ExtractMaterialsInput): Promise<ExtractMaterialsOutput> {
  try {
    return await extractMaterialsFlow(input);
  } catch (error) {
    console.error("Error en extractMaterialsFlow:", error);
    return { materials: [] };
  }
}
