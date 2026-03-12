'use server';
/**
 * @fileOverview Flux d'extracció de dades de documents legats (PDF/Imatge).
 * Utilitza Gemini 1.5 Flash per convertir documents no estructurats en dades de la base de dades.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractedDataSchema = z.object({
  type: z.enum(['service_record', 'albaran', 'invoice']).describe('Tipus de document detectat.'),
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
      config: { temperature: 0.1 },
      output: { schema: ExtractedDataSchema },
      prompt: [
        { media: { url: fileDataUri } },
        { text: `Ets un assistent administratiu expert en construcció i manteniment (lampisteria, electricitat).
        
        TASCA:
        Analitza aquest document (pot ser una foto o PDF) i extreu tota la informació rellevant per registrar-lo al sistema.
        
        RELES CRÍTIQUES:
        1. Tradueix totes les descripcions tècniques al CATALÀ professional.
        2. Si el document és un resum de diversos dies, marca'l com a "albaran". Si és d'un sol dia, com a "service_record".
        3. Identifica bé el client i l'obra.
        4. Extreu la llista de materials si n'hi ha.
        
        Retorna les dades en el format JSON especificat.` }
      ],
    });

    return response.output || null;
  } catch (error) {
    console.error("Error analitzant document:", error);
    return null;
  }
}
