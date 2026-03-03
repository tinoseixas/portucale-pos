'use server';
/**
 * @fileOverview Flux de traducció per a descripcions de serveis.
 * Optimitzat per a Genkit 1.x i Gemini 1.5 Flash.
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
 * Definició del prompt de traducció professional.
 */
const translatePrompt = ai.definePrompt({
  name: 'translatePrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: TranslateInputSchema },
  output: { schema: TranslateOutputSchema },
  config: {
    temperature: 0.3,
  },
  prompt: `Act as a professional translator for technical and construction reports.
  
  Translate the following text to professional, formal, and concise CATALAN. 
  Fix any spelling or punctuation errors in the source.
  Ensure technical terms (e.g. plumbing, electrical, masonry) are translated correctly for an official Andorran work report.
  
  TEXT: "{{{text}}}"`,
});

/**
 * Tradueix un text al català professionalment.
 */
export async function translateToCatalan(input: TranslateInput): Promise<TranslateOutput> {
  if (!input.text || !input.text.trim()) return { translatedText: '' };
  
  try {
    const { output } = await translatePrompt(input);
    return output || { translatedText: input.text };
  } catch (error) {
    console.error("Error in translateToCatalan:", error);
    return { translatedText: input.text };
  }
}
