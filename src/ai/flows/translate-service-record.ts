
'use server';
/**
 * @fileOverview Flux de traducció per a descripcions de serveis.
 * Utilitza Genkit 1.x amb el model Gemini 1.5 Flash.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const TranslateInputSchema = z.object({
  text: z.string().describe('The technical text to translate.')
});

const TranslateOutputSchema = z.object({
  translatedText: z.string().describe('The translated text in professional Catalan.')
});

export type TranslateInput = z.infer<typeof TranslateInputSchema>;
export type TranslateOutput = z.infer<typeof TranslateOutputSchema>;

/**
 * Tradueix un text al català professionalment de forma directa utilitzant Genkit.
 */
export async function translateToCatalan(input: TranslateInput): Promise<TranslateOutput> {
  if (!input.text || !input.text.trim()) return { translatedText: '' };
  
  try {
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      config: {
        temperature: 0.1,
      },
      output: {
        schema: TranslateOutputSchema
      },
      prompt: `Ets un traductor professional al català especialitzat en informes de construcció, lampisteria i electricitat.
      
      TASCA:
      Tradueix el text següent estrictament al CATALÀ professional i formal. 
      Si l'entrada està en castellà, portuguès o català col·loquial, converteix-la a català tècnic correcte.
      
      EXEMPLES:
      - "Terminar banho" -> "Acabar bany"
      - "Instalação elétrica" -> "Instal·lació elèctrica"
      - "Arreglar fuga" -> "Reparar fuita"
      
      TEXT PER TRADUIR:
      ${input.text}`
    });

    const result = response.output;
    if (!result || !result.translatedText) {
        // Fallback: Si l'IA no retorna res estructurat, intentem extreure el text directament
        if (response.text) {
            return { translatedText: response.text.trim() };
        }
        throw new Error("La resposta de l'IA és buida.");
    }
    
    return { translatedText: result.translatedText.trim() };
  } catch (error) {
    console.error("Error in translateToCatalan:", error);
    return { translatedText: input.text };
  }
}
