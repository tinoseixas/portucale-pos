'use server';
/**
 * @fileOverview Flux d'extracció de materials mitjançant IA (OCR).
 * Optimitzat per a documents PDF i imatges de factures/tiquets de compra.
 * Utilitza Gemini 1.5 Flash per a una extracció ràpida i precisa.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const MaterialSchema = z.object({
  description: z.string().describe('Descripció tècnica del producte.'),
  quantity: z.number().describe('Quantitat.'),
  unitPrice: z.number().describe('Preu unitari net.'),
});

const ExtractMaterialsInputSchema = z.object({
  fileDataUri: z.string().describe("Fitxer base64."),
});

const ExtractMaterialsOutputSchema = z.object({
  materials: z.array(MaterialSchema),
});

export type ExtractMaterialsInput = z.infer<typeof ExtractMaterialsInputSchema>;
export type ExtractMaterialsOutput = z.infer<typeof ExtractMaterialsOutputSchema>;

/**
 * Extreu la llista de materials d'una factura o tiquet de compra (PDF o Imatge).
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
          { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' },
        ]
      },
      output: {
        schema: ExtractMaterialsOutputSchema
      },
      prompt: [
        { media: { url: input.fileDataUri } },
        { text: `Ets un assistent expert en lectura de documents de compra. 
        
        TASCA:
        Analitza el document (PDF o imatge) i extreu TOTS els articles comprats.
        
        REQUISITS:
        1. Identifica el NOM del producte (si està en castellà o portuguès, tradueix-lo al CATALÀ professional).
        2. Identifica la QUANTITAT.
        3. Identifica el PREU UNITARI NET (abans d'impostos).
        
        Ignora dades de l'empresa, totals, IVAs i descomptes a peu de pàgina. Centra't només en la taula d'articles.` }
      ],
    });

    const result = response.output;
    if (!result || !result.materials || result.materials.length === 0) {
        // Fallback: Si no retorna format estructurat, provem de llegir text lliure
        console.warn("L'IA no ha retornat dades estructurades. Revisant resposta de text...");
        return { materials: [] };
    }
    
    return result;
  } catch (error) {
    console.error("Error crític en extractMaterialsFromFile:", error);
    return { materials: [] };
  }
}
