'use server';
/**
 * @fileOverview Flux d'extracció de dades de documents legats (PDF/Imatge).
 * Utilitza Gemini 1.5 Flash per convertir documents no estructurats en dades de la base de dades.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractedDataSchema = z.object({
  type: z.string().default('general').describe('Tipus de document detectat.'),
  date: z.string().optional().describe('Data del document.'),
  customerName: z.string().optional().describe('Nom del client.'),
  projectName: z.string().optional().describe('Nom de l\'obra o projecte.'),
  description: z.string().optional().describe('Resum dels treballs realitzats.'),
  materials: z.array(z.object({
    description: z.string(),
    quantity: z.number().default(1),
    unitPrice: z.number().default(0)
  })).optional().describe('Llista de materials.'),
  totalAmount: z.number().optional().describe('Import total.')
});

export type ExtractedDocumentData = z.infer<typeof ExtractedDataSchema>;

export async function extractDataFromDocument(fileDataUri: string): Promise<ExtractedDocumentData | null> {
  try {
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      config: { 
        temperature: 0.1,
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' },
        ]
      },
      output: { schema: ExtractedDataSchema },
      prompt: [
        { media: { url: fileDataUri } },
        { text: `Ets un assistent expert en lectura de documents de construcció (albarans, factures, notes).
        
        TASCA:
        Analitza la imatge o PDF adjunt. NO SIGUIS MASSA ESTRICTE. 
        Si el document és difícil de llegir, extreu qualsevol text rellevant que trobis.
        
        PRIORITATS:
        1. Troba el CLIENT (Customer).
        2. Troba la DATA (Date).
        3. Fes una DESCRIPCIÓ el més detallada possible del que s'ha fet. Si no trobes camps clars, descriu tot el que veus al document en l'apartat 'description'.
        
        Retorna les dades en JSON. Si no trobes materials, deixa la llista buida.` }
      ],
    });

    return response.output || null;
  } catch (error) {
    console.error("Error analitzant document amb IA:", error);
    return null;
  }
}
