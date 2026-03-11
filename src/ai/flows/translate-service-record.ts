
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
 * Tradueix un text al català professionalment de forma directa.
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
      prompt: [
        { text: `You are a professional Catalan translator specialized in construction, plumbing, and electrical reports.
      
      CRITICAL TASK:
      Translate the provided text strictly to professional, formal, and concise CATALAN. 
      If the input is in Spanish or Portuguese, you MUST translate it to Catalan.
      
      Rules:
      - "Terminar banho" -> "Acabar bany"
      - "instalação elétrica" -> "instal·lació elèctrica"
      - "montar cortina" -> "muntar cortina"
      - "anular vater" -> "anul·lar vàter"
      - Correct any spelling, grammar, or punctuation.
      - Ensure terms for plumbing (lampisteria), electrical (elèctrica), and masonry (paleta) are correct.
      - Output ONLY the translated text, no notes, no quotes.` },
        { text: `TEXT TO TRANSLATE: ${input.text}` }
      ],
    });

    const result = response.output;
    if (!result || !result.translatedText) {
        throw new Error("La resposta de l'IA és buida.");
    }
    
    return { translatedText: result.translatedText.trim() };
  } catch (error) {
    console.error("Error in translateToCatalan:", error);
    return { translatedText: input.text };
  }
}
