
'use server';
/**
 * @fileOverview Flux de traducció per a descripcions de serveis.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export async function translateToCatalan(input: { text: string }) {
  if (!input.text.trim()) return { translatedText: '' };
  
  try {
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt: `Act as a professional technical translator. Translate the following construction service description to professional CATALAN. Fix spelling and punctuation. Keep it concise.
      
      TEXT TO TRANSLATE: "${input.text}"`,
      output: {
        schema: z.object({ translatedText: z.string() })
      },
      config: {
        temperature: 0.2,
      }
    });

    return response.output || { translatedText: input.text };
  } catch (error) {
    console.error("Error en translateToCatalan:", error);
    return { translatedText: input.text };
  }
}
