'use server';
/**
 * @fileOverview Flux d'extracció de materials mitjançant IA (OCR avançat).
 * Utilitza Gemini 1.5 Flash per a una extracció ràpida i precisa de dades de factures.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const MaterialSchema = z.object({
  description: z.string().describe('Descripció de l\'article.'),
  quantity: z.number().describe('Quantitat.'),
  unitPrice: z.number().describe('Preu unitari net.'),
});

const ExtractMaterialsInputSchema = z.object({
  fileDataUri: z.string().describe("Fitxer base64 (Data URI)."),
});

const ExtractMaterialsOutputSchema = z.object({
  materials: z.array(MaterialSchema),
});

export type ExtractMaterialsInput = z.infer<typeof ExtractMaterialsInputSchema>;
export type ExtractMaterialsOutput = z.infer<typeof ExtractMaterialsOutputSchema>;

/**
 * Extreu la llista de materials d'una factura o tiquet utilitzant Gemini 1.5 Flash.
 */
export async function extractMaterialsFromFile(input: ExtractMaterialsInput): Promise<ExtractMaterialsOutput> {
  if (!input.fileDataUri) {
    console.error("No s'ha proporcionat cap fitxer.");
    return { materials: [] };
  }

  try {
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      config: {
        temperature: 0.1,
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ]
      },
      output: {
        schema: ExtractMaterialsOutputSchema
      },
      prompt: [
        { media: { url: input.fileDataUri } },
        { text: `Ets un expert en lectura de documents de construcció. 
        
        TASCA:
        Analitza aquest PDF o imatge. És una factura o tiquet de compra.
        Extreu TOTS els articles que apareixen a la llista de compra.
        
        INSTRUCCIONS:
        1. DESCIPCIÓ: El nom de l'article (si està en castellà, tradueix-lo al català).
        2. QUANTITAT: El número d'unitats.
        3. PREU UNITARI: El preu per unitat ABANS d'impostos.
        
        Ignora dades del proveïdor i centrat només en la taula de productes. 
        Si el document té diverses pàgines, analitza-les totes.` }
      ],
    });

    const result = response.output;
    if (!result || !result.materials) {
        console.warn("L'IA no ha retornat materials estructurats.");
        return { materials: [] };
    }
    
    return result;
  } catch (error) {
    console.error("Error en l'extracció IA:", error);
    return { materials: [] };
  }
}
