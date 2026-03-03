'use server';
/**
 * @fileOverview Flux d'extracció de materials mitjançant IA (OCR).
 * 
 * Millorat per ser més resilient a imatges de tiquets i albarans.
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
  prompt: `Actua com un sistema d'extracció de dades OCR d'alt rendiment. 
    
    Analitza aquesta imatge de tiquet o albarà de compra: {{media url=photoDataUri}}
    
    TASCA:
    1. Identifica tots els materials, subministraments o articles comprats.
    2. Per a cada article, extreu la descripció, la quantitat i el preu unitari.
    3. Tradueix les descripcions al CATALÀ tècnic professional.
    4. Si només veus un total per línia, calcula el preu unitari (Total / Quantitat).
    5. Ignora capçaleres del comerç o dades bancàries.
    6. Retorna la llista d'articles en el format JSON especificat.`,
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
          temperature: 0.2, // Una mica més de flexibilitat per detectar dades difícils
        }
      });
      
      if (!output || !output.materials) {
        return { materials: [] };
      }
      
      return output;
    } catch (error) {
      console.error("Error en extractMaterialsFlow:", error);
      // Retornem un resultat buit en lloc de llançar un error per permetre al frontend gestionar-ho millor
      return { materials: [] };
    }
  }
);

export async function extractMaterialsFromPhoto(input: ExtractMaterialsInput): Promise<ExtractMaterialsOutput> {
  return await extractMaterialsFlow(input);
}
