
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {config} from 'dotenv'; // Import dotenv

// Ensure environment variables are loaded before the plugin initializes
config(); 

const googleAiApiKey = process.env.GOOGLE_API_KEY;

if (!googleAiApiKey) {
  console.warn(
    'WARNING: GOOGLE_API_KEY was not found in environment variables when initializing Genkit. ' +
    'The Google AI plugin might not function correctly. ' +
    'Please ensure GOOGLE_API_KEY is set in your .env file and the server is restarted.'
  );
  // Depending on the application's needs, you might want to throw an error here
  // if the API key is absolutely critical for startup.
  // Example: throw new Error("CRITICAL: GOOGLE_API_KEY is missing.");
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: googleAiApiKey, // Explicitly pass the API key
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});

