
'use server';
/**
 * @fileOverview Flux de traducció intel·ligent per a descripcions de serveis tècnics.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TranslateInputSchema = z.object({
  text: z.string().describe('El text tècnic original a traduir o millorar.'),
});
export type TranslateInput = z.infer<typeof TranslateInputSchema>;

const TranslateOutputSchema = z.object({
  translatedText: z.string().describe('El text final traduït i corregit en català.'),
});
export type TranslateOutput = z.infer<typeof TranslateOutputSchema>;

const translatePrompt = ai.definePrompt({
  name: 'translatePrompt',
  input: { schema: TranslateInputSchema },
  output: { schema: TranslateOutputSchema },
  prompt: `Ets un assistent administratiu expert en el sector de la construcció i manteniment a Andorra. 
  
  Tradueix o millora el següent text al CATALÀ professional:
  
  TEXT: "{{text}}"
  
  INSTRUCCIONS:
  1. Utilitza terminologia tècnica correcta.
  2. Corregeix l'ortografia i millora la formalitat.
  3. No afegeixis informació extra.
  4. Si el text ja és correcte, mantén-lo però millora la puntuació si cal.`,
});

const translateFlow = ai.defineFlow(
  {
    name: 'translateToCatalanFlow',
    inputSchema: TranslateInputSchema,
    outputSchema: TranslateOutputSchema,
  },
  async (input) => {
    if (!input.text.trim()) return { translatedText: '' };
    
    try {
      const { output } = await translatePrompt(input, {
        model: 'googleai/gemini-1.5-flash',
        config: {
          temperature: 0.2,
        }
      });
      
      return output || { translatedText: input.text };
    } catch (error) {
      console.error("Error en translateFlow:", error);
      return { translatedText: input.text };
    }
  }
);

export async function translateToCatalan(input: TranslateInput): Promise<TranslateOutput> {
  return await translateFlow(input);
}
