'use server';
/**
 * @fileOverview Flux d'extracció de materials mitjançant IA (OCR).
 * Optimitzat per a documents PDF i imatges de factures/tiquets de compra.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const MaterialSchema = z.object({
  description: z.string().describe('Descripció tècnica detallada en CATALÀ professional (ex: Colze 90 graons 16mm).'),
  quantity: z.number().describe('La quantitat numèrica.'),
  unitPrice: z.number().describe("El preu per unitat abans d'impostos."),
});

const ExtractMaterialsInputSchema = z.object({
  fileDataUri: z.string().describe("Un fitxer (Imatge o PDF) com a data URI format base64."),
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
  try {
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      config: {
        temperature: 0.1,
      },
      output: {
        schema: ExtractMaterialsOutputSchema
      },
      prompt: [
        { media: { url: input.fileDataUri } },
        { text: `Ets un assistent expert en OCR per a documents de compra de materials de construcció i fontaneria.
        
        TASCA:
        Analitza le document adjunt (pot ser una foto o un PDF). Extrau TOTS els articles individuals que s'han comprat.
        Ignora les dades de la botiga, els totals, els impostos i els descomptes globals.
        
        REGLES D'EXTRACCIÓ:
        - description: Tradueix o normalitza els noms tècnics al CATALÀ professional (ex: "Codo" -> "Colze", "Tubo" -> "Tub").
        - quantity: Si no s'especifica, posa 1.
        - unitPrice: El preu unitari base.
        
        Si el document és difícil de llegir, intenta extreure el màxim d'articles possibles.` }
      ],
    });

    const result = response.output;
    if (!result || !result.materials) {
        return { materials: [] };
    }
    return result;
  } catch (error) {
    console.error("Error en extractMaterialsFromFile:", error);
    return { materials: [] };
  }
}
