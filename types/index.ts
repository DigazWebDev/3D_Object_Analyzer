export type AnalysisStatus =
  'idle' | 'queued' | 'uploading' | 'analyzing' | 'generating' | 'completed' | 'failed';

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown';
export type ComponentEvidence = 'identified' | 'inferred' | 'unknown';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Photo {
  id: string;
  uri: string;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
  analysisId?: string;
}

export interface Album {
  id: string;
  name: string;
  coverPhotoId?: string;
  photoCount: number;
  createdAt: string;
}

export interface ObjectComponent {
  id: string;
  name: string;
  type?: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  evidence: ComponentEvidence;
  description?: string;
  compactPosition: Vector3;
  explodedPosition: Vector3;
  metadata: Record<string, unknown>;
}

export interface ObjectAnalysis {
  id: string;
  photoId: string;
  objectName: string;
  category?: string;
  confidence: number;
  status: AnalysisStatus;
  components: ObjectComponent[];
  createdAt: string;
  updatedAt: string;
}

export interface ExplodedViewModel {
  analysisId: string;
  components: ObjectComponent[];
  separationAxis: Vector3;
}
