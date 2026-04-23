// Phase 2 implementation — v0.1 defines interface only

export interface AIProvider {
  generateText(prompt: string, context?: string): Promise<string>;
  transcribeAudio(audioBuffer: Buffer): Promise<string>;
}

export const AI_PROVIDER = 'AI_PROVIDER';
