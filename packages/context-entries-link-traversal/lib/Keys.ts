import { ActionContextKey } from '@comunica/core';
import type { AnnotateSourcesType, FilterFunction } from '@comunica/types-link-traversal';
import type { SummaryCache } from '@comunica/types-link-traversal/lib/SummaryCache';

/**
 * When adding entries to this file, also add a shortcut for them in the contextKeyShortcuts TSDoc comment in
 * ActorIniQueryBase in @comunica/actor-init-query if it makes sense to use this entry externally.
 * Also, add this shortcut to IQueryContextCommon in @comunica/types.
 */

export const KeysRdfResolveHypermediaLinks = {

  /**
   * Context entry for indicating the type of source annotation.
   */
  annotateSources: new ActionContextKey<AnnotateSourcesType>(
    '@comunica/bus-rdf-resolve-hypermedia-links:annotateSources',
  ),
};

export const KeysExtractLinksTree = {
  /**
   * A flag to indicate if relationships should strictly correspond to the current document's URL.
   * Default true.
   */
  strictTraversal:
    new ActionContextKey<boolean>('@comunica/actor-extract-links-tree:strictTraversal'),
};

export const KeysRdfJoin = {
  /**
   * If adaptive joining must not be done.
   */
  skipAdaptiveJoin: new ActionContextKey<boolean>('@comunica/bus-rdf-join:skipAdaptiveJoin'),
};

export const KeysFilter = {
  /**
   * Link filters for the link queue.
   */
  filters: new ActionContextKey<Map<string, FilterFunction>>('@comunica/bus-extract-links:filter'),
};

export const KeyCacheSummaries = {
  summaries: new ActionContextKey<SummaryCache>('@comunica/bus-extract-links:filter'),
};
