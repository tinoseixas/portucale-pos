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

// Definim el prompt de forma independent per a millor rendiment i validació
const translatePrompt = ai.definePrompt({
  name: 'translatePrompt',
  input: { schema: TranslateInputSchema },
  output: { schema: TranslateOutputSchema },
  prompt: `Ets un assistent administratiu expert en el sector de la construcció, fontaneria i manteniment a Andorra. 
  
  La teva tasca és traduir o millorar el següent text al CATALÀ professional. 
  
  INSTRUCCIONS:
  1. Manté la terminologia tècnica correcta (ex: "maneguet", "col·lector", "clau de pas").
  2. Si el text ja està en català, corregeix l'ortografia i millora la gramàtica per fer-lo més formal.
  3. No afegeixis informació que no estigui al text original.
  
  TEXT ORIGINAL: {{text}}`,
});

// El flux que embolcalla la crida al prompt
const translateFlow = ai.defineFlow(
  {
    name: 'translateToCatalanFlow',
    inputSchema: TranslateInputSchema,
    outputSchema: TranslateOutputSchema,
  },
  async (input) => {
    const { output } = await translatePrompt(input, {
      model: 'googleai/gemini-1.5-flash',
      config: {
        temperature: 0.3, // Temperatura baixa per a traduccions fidels
      }
    });
    
    if (!output) {
      throw new Error('L\'IA no ha pogut generar una traducció vàlida.');
    }
    
    return output;
  }
);

export async function translateToCatalan(input: TranslateInput): Promise<TranslateOutput> {
  try {
    return await translateFlow(input);
  } catch (error) {
    console.error("Error en translateFlow:", error);
    // Fallback: retornem el text original si la traducció falla
    return { translatedText: input.text };
  }
}
