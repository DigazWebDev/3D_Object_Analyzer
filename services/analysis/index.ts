import type { AIService, AnalyzeObjectInput } from '@/services/ai';
import type { ExplodedViewModel, ObjectAnalysis } from '@/types';

export interface ExplodedViewGenerator {
  generate(analysis: ObjectAnalysis): ExplodedViewModel;
}

export interface ExplodedViewRenderer {
  render(model: ExplodedViewModel, progress: number): void;
}

export interface AnalysisResult {
  analysis: ObjectAnalysis;
  explodedView: ExplodedViewModel;
}

export class ObjectAnalysisService {
  constructor(
    private readonly aiService: AIService,
    private readonly explodedViewGenerator: ExplodedViewGenerator,
  ) {}

  async analyze(input: AnalyzeObjectInput): Promise<AnalysisResult> {
    const analysis = await this.aiService.analyzeObject(input);
    return {
      analysis,
      explodedView: this.explodedViewGenerator.generate(analysis),
    };
  }
}
