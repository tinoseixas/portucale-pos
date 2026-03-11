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
        { text: `Act as a professional translator for technical and construction reports in Andorra.
      
      TASK:
      Translate the provided text to professional, formal, and concise CATALAN. 
      - Correct any spelling, grammar, or punctuation errors.
      - Use correct technical terms for plumbing (lampisteria), electrical (elèctrica), masonry (paleta), and maintenance.
      - Ensure the tone is appropriate for an official work report (Albarà).
      - If the text is already in Catalan, just improve the clarity and fix any typos.
      - Do not include any notes, explanations, or quotes in the output. Just the translated text.` },
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
    // En cas d'error, retornem el text original per no perdre dades
    return { translatedText: input.text };
  }
}
