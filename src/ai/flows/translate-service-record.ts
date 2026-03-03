'use server';
/**
 * @fileOverview Flux de traducció intel·ligent per a descripcions de serveis tècnics.
 * 
 * - translateToCatalan: Funció per traduir textos tècnics al català professional.
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

const translateFlow = ai.defineFlow(
  {
    name: 'translateToCatalan',
    inputSchema: TranslateInputSchema,
    outputSchema: TranslateOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt: `Ets un assistent administratiu expert en el sector de la construcció i el manteniment a Andorra. 
      Tradueix el següent text al CATALÀ professional. 
      Manté la terminologia tècnica correcta (fontaneria, electricitat, etc.). 
      Si el text ja està en català, millora'n la gramàtica i l'ortografia per fer-lo més formal.
      
      TEXT ORIGINAL: ${input.text}`,
      output: { schema: TranslateOutputSchema }
    });
    return output!;
  }
);

export async function translateToCatalan(input: TranslateInput): Promise<TranslateOutput> {
  return translateFlow(input);
}
