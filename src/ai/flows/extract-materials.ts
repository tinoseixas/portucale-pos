
'use server';
/**
 * @fileOverview Flux d'extracció de materials mitjançant IA (OCR).
 * 
 * Optimitzat per a Genkit 1.x i Gemini 1.5 Flash amb alta precisió.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractMaterialsInputSchema = z.object({
  photoDataUri: z.string().describe("Data URI de la imatge del document en base64."),
});
export type ExtractMaterialsInput = z.infer<typeof ExtractMaterialsInputSchema>;

const MaterialSchema = z.object({
  description: z.string().describe('Descripció tècnica de l\'article en CATALÀ.'),
  quantity: z.number().describe('Quantitat numèrica.'),
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
  prompt: `Ets un sistema OCR d'alta precisió especialitzat en tiquets i albarans de materials de construcció.
    
    Analitza aquesta imatge: {{media url=photoDataUri}}
    
    TASCA:
    1. Identifica tots els articles, materials o serveis comprats.
    2. Per a cada element, extrau la descripció, la quantitat i el preu unitari.
    3. TRADUEIX totes les descripcions al CATALÀ tècnic professional si estan en una altra llengua.
    4. Si només apareix el total de la línia, calcula: preuUnitari = total / quantitat.
    5. No incloguis subtotals ni impostos com a articles.
    
    IMPORTANT: Sigues extremadament precís amb els números. Si el text és borrós, intenta interpretar-lo segons el context d'una botiga de subministraments industrials.`,
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
          temperature: 0.1,
        }
      });
      
      return output || { materials: [] };
    } catch (error) {
      console.error("Error en extractMaterialsFlow:", error);
      return { materials: [] };
    }
  }
);

export async function extractMaterialsFromPhoto(input: ExtractMaterialsInput): Promise<ExtractMaterialsOutput> {
  return await extractMaterialsFlow(input);
}
