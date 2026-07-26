export type SourceType = 'pdf' | 'text' | 'url' | 'youtube' | 'vtt';

export type SourceStatus = 'pending' | 'indexing' | 'ready' | 'error';

export interface SourceItem {
  id: string;
  notebookId: string;
  title: string;
  type: SourceType;
  urlOrPath?: string;
  s3Key?: string;
  s3Url?: string;
  status: SourceStatus;
  errorMessage?: string;
  content?: string;
  createdAt: string;
}

export interface NotebookItem {
  id: string;
  userId: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    sources: number;
    notes: number;
  };
}

export interface ChunkMetadata {
  notebookId: string;
  sourceId: string;
  sourceTitle: string;
  sourceType: SourceType;
  text: string;
  pageNumber?: number;
  startTime?: number; // In seconds
  endTime?: number;
  chunkIndex: number;
  videoId?: string;
  urlOrPath?: string;
}

export interface Citation {
  id: number;
  sourceId: string;
  sourceTitle: string;
  sourceType: SourceType;
  pageNumber?: number;
  startTime?: number;
  textSnippet: string;
  videoId?: string;
  urlOrPath?: string;
}

export interface StudyPlanResource {
  sourceId: string;
  title: string;
  type: SourceType;
  pageNumber?: number;
  pageRange?: string;
  startTime?: number;
  timeRange?: string;
  displayTime?: string;
  videoId?: string;
  urlOrPath?: string;
  sectionTitle?: string;
  sectionAnchor?: string;
  snippet?: string;
}

export interface StudyPlanStep {
  stepNumber: number;
  topic: string;
  summary: string;
  completed?: boolean;
  resources: StudyPlanResource[];
}

export type DiscoveryCategory =
  | 'Contradiction'
  | 'Hidden Relationship'
  | 'Missing Information'
  | 'Trend'
  | 'Surprising Fact'
  | 'Actionable Insight';

export type DiscoveryConfidence = 'High' | 'Medium' | 'Low';

export interface DiscoveryItem {
  id: string;
  rank: number;
  title: string;
  category: DiscoveryCategory;
  whyItMatters: string;
  supportingEvidence: string;
  confidence: DiscoveryConfidence;
  citations: Citation[];
}
