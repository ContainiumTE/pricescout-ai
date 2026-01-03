export interface ComparisonItem {
  website: string;
  brand: string;
  product: string;
  original_price: string;
  sale_price: string;
  extra_discounts: string;
  product_url: string;
  comment: string;
}

export interface AnalysisResult {
  comparison_table: ComparisonItem[];
  top_recommendation: string;
}

export interface SearchParams {
  productName: string;
  brands: string[];
  websites: string[];
}

export enum AppStatus {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}