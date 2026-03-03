import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Global Genkit instance for AI operations.
 */
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
});
