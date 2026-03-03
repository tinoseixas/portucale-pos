'use server';
/**
 * @fileOverview Flux de traducció per a descripcions de serveis.
 * Optimitzat per a Genkit 1.x.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TranslateInputSchema = z.object({
  text: z.string().describe('The technical text to translate.')
});

const TranslateOutputSchema = z.object({
  translatedText: z.string().describe('The translated text in professional Catalan.')
});

export type TranslateInput = z.infer<typeof TranslateInputSchema>;
export type TranslateOutput = z.infer<typeof TranslateOutputSchema>;

/**
 * Definició del prompt de traducció professional.
 */
const translatePrompt = ai.definePrompt({
  name: 'translatePrompt',
  input: { schema: TranslateInputSchema },
  output: { schema: TranslateOutputSchema },
  prompt: `Act as a professional technical translator for the construction and maintenance sector in Andorra. 
  
  Translate the following service description or technical note to professional CATALAN. 
  - Fix any spelling and punctuation errors.
  - Keep the tone professional and concise.
  - Preserve any numbers, measurements, or technical codes.
  
  TEXT TO TRANSLATE: 
  "{{{text}}}"`,
});

/**
 * Tradueix un text al català professionalment.
 */
export async function translateToCatalan(input: TranslateInput): Promise<TranslateOutput> {
  if (!input.text.trim()) return { translatedText: '' };
  
  try {
    const { output } = await translatePrompt(input);
    return output || { translatedText: input.text };
  } catch (error) {
    console.error("Error en translateToCatalan:", error);
    return { translatedText: input.text };
  }
}
