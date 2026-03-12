'use server';
/**
 * @fileOverview Flux d'extracció de dades de documents legats (PDF/Imatge).
 * Utilitza Gemini 1.5 Flash per convertir documents no estructurats en dades de la base de dades.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractedDataSchema = z.object({
  type: z.string().describe('Tipus de document detectat (service_record, albaran, invoice, o general).'),
  date: z.string().optional().describe('Data del document en format ISO o text llegible.'),
  customerName: z.string().optional().describe('Nom del client trobat al document.'),
  projectName: z.string().optional().describe('Nom de l\'obra o projecte.'),
  description: z.string().optional().describe('Resum detallat dels treballs realitzats en CATALÀ.'),
  materials: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number()
  })).optional().describe('Llista de materials amb quantitat i preu unitari.'),
  totalAmount: z.number().optional().describe('Import total del document.')
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
        ]
      },
      output: { schema: ExtractedDataSchema },
      prompt: [
        { media: { url: fileDataUri } },
        { text: `Ets un assistent administratiu expert en construcció i manteniment (lampisteria, electricitat).
        
        TASCA:
        Analitza aquest document (pot ser una foto o PDF) i extreu tota la informació rellevant per registrar-lo al sistema.
        
        REGLES CRÍTIQUES:
        1. Tradueix totes les descripcions tècniques al CATALÀ professional.
        2. Identifica el client i l'obra encara que el text sigui poc clar.
        3. Extreu la llista de materials si n'hi ha, ignorant totals i impostos.
        4. Si no estàs segur del tipus de document, posa "general".
        
        Retorna les dades en el format JSON especificat. Si el document és difícil de llegir, intenta extreure el màxim possible.` }
      ],
    });

    return response.output || null;
  } catch (error) {
    console.error("Error analitzant document amb IA:", error);
    return null;
  }
}
