'use server';
/**
 * @fileOverview Flux de traducció per a descripcions de serveis.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TranslateInputSchema = z.object({
  text: z.string().describe('El text a traduir.'),
});
export type TranslateInput = z.infer<typeof TranslateInputSchema>;

const TranslateOutputSchema = z.object({
  translatedText: z.string().describe('El text traduït al català.'),
});
export type TranslateOutput = z.infer<typeof TranslateOutputSchema>;

export async function translateToCatalan(input: TranslateInput): Promise<TranslateOutput> {
  const flow = ai.defineFlow(
    {
      name: 'translateToCatalan',
      inputSchema: TranslateInputSchema,
      outputSchema: TranslateOutputSchema,
    },
    async (input) => {
      const { output } = await ai.generate({
        prompt: `Ets un assistent administratiu expert. Tradueix el següent text tècnic de construcció/manteniment al CATALÀ. 
        Manté la terminologia tècnica correcta. Si ja està en català, millora la gramàtica i l'ortografia.
        
        TEXT: ${input.text}`,
        output: { schema: TranslateOutputSchema }
      });
      return output!;
    }
  );
  return flow(input);
}
