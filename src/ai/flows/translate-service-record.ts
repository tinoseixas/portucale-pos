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
      prompt: `Act as a professional translator for technical and construction reports.
      
      TASK:
      Translate the provided text to professional, formal, and concise CATALAN. 
      - Fix any spelling or punctuation errors.
      - Ensure technical terms (plumbing, electrical, masonry) are correct for an official Andorran work report.
      - If the text is already in Catalan, just fix any typos.
      
      TEXT TO TRANSLATE: "${input.text}"`,
    });

    const result = response.output;
    if (!result) throw new Error("IA response is empty");
    
    return result;
  } catch (error) {
    console.error("Error in translateToCatalan:", error);
    // En cas d'error, retornem el text original per no perdre dades
    return { translatedText: input.text };
  }
}
