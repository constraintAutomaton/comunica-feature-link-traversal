export interface ISummary {
    /**
     * The unix time date of experiation
     */
    experiation: number;
    /**
     * A summary
     */
    summary: unknown
}

type Subweb = string;
type SummaryMethod = string;

/**
 * Cache of summaries indexed by summary method
 */
export type SummaryCache = Map<SummaryMethod, SummaryCacheEntry>;

/**
 * summaries entries in the cache indexed by subweb
 */
export type SummaryCacheEntry = Map<Subweb, ISummary>;