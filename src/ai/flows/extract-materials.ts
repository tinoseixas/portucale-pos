'use server';
/**
 * @fileOverview Flux d'extracció de materials mitjançant IA (OCR).
 * Optimitzat per a documents PDF i imatges de factures/tiquets de compra.
 * Utilitza Gemini 1.5 Flash per a una extracció ràpida i precisa.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const MaterialSchema = z.object({
  description: z.string().describe('Descripció tècnica detallada en CATALÀ professional (ex: Colze 90 graons 16mm).'),
  quantity: z.number().describe('La quantitat numèrica.'),
  unitPrice: z.number().describe('El preu per unitat abans d\'impostos.'),
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
        { text: `Ets un assistent expert en lectura de factures i albarans de compra per a empreses de construcció i fontaneria.
        
        TASCA:
        Analitza el document adjunt (pot ser una imatge o un PDF de vàries pàgines).
        Extrau TOTS els articles individuals que s'han comprat.
        
        INSTRUCCIONS DE FILTRATGE:
        - Ignora les dades de l'empresa venedora i del comprador.
        - Ignora els totals finals, els impostos (IVA/IGI) i els descomptes a peu de factura.
        - Centra't només en les línies de detall de la taula d'articles.
        
        REGLES D'EXTRACCIÓ:
        - description: Identifica el nom del producte. Si està en castellà, tradueix-lo al CATALÀ professional.
        - quantity: La quantitat comprada. Si no es veu, posa 1.
        - unitPrice: El preu per unitat (PVP unitari net).
        
        Si el document és difícil de llegir o té molta informació irrellevant, fes el teu millor esforç per extreure només els noms dels materials i els seus preus.` }
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
