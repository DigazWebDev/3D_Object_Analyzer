import type { ObjectAnalysis } from '@/types';

export interface AnalyzeObjectInput {
  photoId: string;
  imageUri: string;
  signal?: AbortSignal;
}

export interface AIService {
  analyzeObject(input: AnalyzeObjectInput): Promise<ObjectAnalysis>;
}

export class AIProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`${provider} is not configured. Object analysis is introduced in Phase 4.`);
    this.name = 'AIProviderNotConfiguredError';
  }
}

export class GeminiProvider implements AIService {
  async analyzeObject(_input: AnalyzeObjectInput): Promise<ObjectAnalysis> {
    throw new AIProviderNotConfiguredError('GeminiProvider');
  }
}
