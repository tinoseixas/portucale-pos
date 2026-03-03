'use server';
/**
 * @fileOverview Flux d'extracció de materials des d'imatges utilitzant Genkit 1.x.
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

// Definim el prompt utilitzant la sintaxi Handlebars per a mitjans
const extractMaterialsPrompt = ai.definePrompt({
  name: 'extractMaterialsPrompt',
  input: { schema: ExtractMaterialsInputSchema },
  output: { schema: ExtractMaterialsOutputSchema },
  prompt: `Extrau tots els materials, articles i conceptes de mà d'obra d'aquesta imatge de document (tiquet o albarà de compra).
    
    INSTRUCCIONS CRÍTIQUES:
    1. Tradueix totes les descripcions al CATALÀ professional.
    2. Identifica la quantitat (quantity) i el preu unitari (unitPrice).
    3. Si no hi ha preu unitari però hi ha un total per línia, calcula el preu unitari dividint el total per la quantitat.
    4. Si un valor no és clar, posa 0.
    5. Retorna NOMÉS la llista d'articles comprats en el format JSON especificat.
    6. Imatge adjunta: {{media url=photoDataUri}}`,
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
          temperature: 0.1, // Temperatura molt baixa per a dades estructurades
        }
      });
      
      if (!output || !output.materials) {
        return { materials: [] };
      }
      
      return output;
    } catch (error) {
      console.error("Error en extractMaterialsFlow:", error);
      throw new Error("No s'ha pogut processar la imatge. Verifica que sigui nítida.");
    }
  }
);

export async function extractMaterialsFromPhoto(input: ExtractMaterialsInput): Promise<ExtractMaterialsOutput> {
  return await extractMaterialsFlow(input);
}
