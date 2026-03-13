
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
      prompt: [
        { text: `Ets un traductor professional al català especialitzat en informes de construcció, lampisteria i electricitat.
      
      TASCA CRÍTICA:
      Tradueix el text proporcionat estrictament al CATALÀ professional, formal i concís. 
      Si l'entrada està en castellà o portuguès, l'HAS de traduir al català.
      
      Regles:
      - "Terminar banho" -> "Acabar bany"
      - "instalação elétrica" -> "instal·lació elèctrica"
      - "montar cortina" -> "muntar cortina"
      - "anular vater" -> "anul·lar vàter"
      - Corregeix qualsevol error d'ortografia, gramàtica o puntuació.
      - Assegura que els termes de lampisteria, electricitat i paleta siguin correctes.
      - Retorna NOMÉS el text traduït, sense notes ni cometes.` },
        { text: `TEXT PER TRADUIR: ${input.text}` }
      ],
    });

    const result = response.output;
    if (!result || !result.translatedText) {
        throw new Error("La resposta de l'IA és buida.");
    }
    
    return { translatedText: result.translatedText.trim() };
  } catch (error) {
    console.error("Error in translateToCatalan:", error);
    // En cas d'error, retornem el text original perquè l'usuari no perdi la informació
    return { translatedText: input.text };
  }
}
