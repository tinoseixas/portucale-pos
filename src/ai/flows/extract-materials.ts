'use server';
/**
 * @fileOverview Flux d'extracció de materials mitjançant IA (OCR avançat).
 * Utilitza Gemini 1.5 Pro per a una precisió màxima en la lectura de taules de factures.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const MaterialSchema = z.object({
  description: z.string().describe('Descripció clara del producte en català.'),
  quantity: z.number().describe('Quantitat comprada.'),
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
 * Extreu la llista de materials d'una factura o tiquet utilitzant Gemini 1.5 Pro.
 */
export async function extractMaterialsFromFile(input: ExtractMaterialsInput): Promise<ExtractMaterialsOutput> {
  if (!input.fileDataUri) {
    console.error("No s'ha proporcionat cap fitxer.");
    return { materials: [] };
  }

  try {
    const response = await ai.generate({
      // Utilitzem el model PRO per a una precisió màxima en taules complexes
      model: 'googleai/gemini-1.5-pro',
      config: {
        temperature: 0.1,
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' },
        ]
      },
      output: {
        schema: ExtractMaterialsOutputSchema
      },
      prompt: [
        { media: { url: input.fileDataUri } },
        { text: `Ets un expert en comptabilitat i logística de construcció. 
        
        TASCA:
        Llegeix aquest document (PDF o imatge) que és una factura o tiquet de compra de materials.
        Extreu TOTS els articles detallats en la taula de compra.
        
        NORMES ESTRICTES:
        1. DESCIPCIÓ: Tradueix el nom de l'article al CATALÀ professional si està en un altre idioma. 
        2. QUANTITAT: Agafa el número d'unitats.
        3. PREU UNITARI: Important! Agafa el preu per unitat ABANS d'impostos (preu net).
        
        Ignora dades del proveïdor, adreces, dades del client, despeses d'enviament, IVAs i totals finals. 
        Centra't exclusivament en els ítems de la llista de compra.` }
      ],
    });

    const result = response.output;
    if (!result || !result.materials) {
        console.warn("L'IA no ha detectat materials al document.");
        return { materials: [] };
    }
    
    return result;
  } catch (error) {
    console.error("Error crític en l'extracció de materials per IA:", error);
    return { materials: [] };
  }
}
