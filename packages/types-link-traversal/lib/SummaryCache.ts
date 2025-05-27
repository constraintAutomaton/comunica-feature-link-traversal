export interface ISummary<T> {
  /**
   * The unix time date of experiation
   */
  experiation?: number;
  /**
   * A summary
   */
  summary: Readonly<T>;
  toJson(): Record<string, any>;
}

type Subweb = string;
type SummaryMethod = string;

/**
 * Cache of summaries indexed by summary method
 */
export type SummaryCache = Map<SummaryMethod, SummaryCacheEntry<unknown>>;

/**
 * Summaries entries in the cache indexed by subweb
 */
export type SummaryCacheEntry<T> = Map<Subweb, ISummary<T>>;

