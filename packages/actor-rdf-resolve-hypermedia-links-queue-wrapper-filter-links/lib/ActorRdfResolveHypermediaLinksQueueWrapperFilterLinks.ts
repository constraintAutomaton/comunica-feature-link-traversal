import type {
  IActionRdfResolveHypermediaLinksQueue,
  IActorRdfResolveHypermediaLinksQueueOutput,
} from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import { ActorRdfResolveHypermediaLinksQueue } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import { KeysFilter } from '@comunica/context-entries-link-traversal';
import type { IActorArgs, IActorTest, Mediator, Actor } from '@comunica/core';
import { ActionContextKey } from '@comunica/core';
import type { FilterFunction } from '@comunica/types-link-traversal';
import { LinkQueueFilterLinks } from './LinkQueueFilterLinks';

/**
 * A comunica Wrapper Filter Links RDF Resolve Hypermedia Links Queue Actor.
 */
export class ActorRdfResolveHypermediaLinksQueueWrapperFilterLinks extends ActorRdfResolveHypermediaLinksQueue {
  private readonly mediatorRdfResolveHypermediaLinksQueue: Mediator<
  Actor<IActionRdfResolveHypermediaLinksQueue, IActorTest, IActorRdfResolveHypermediaLinksQueueOutput>,
  IActionRdfResolveHypermediaLinksQueue,
IActorTest,
IActorRdfResolveHypermediaLinksQueueOutput
>;

  private readonly calculateSize?: boolean;
  private readonly currentQuery: string | undefined = undefined;

  public constructor(args: IActorRdfResolveHypermediaLinksQueueWrapperFilterLinksArgs) {
    super(args);
  }

  public async test(action: IActionRdfResolveHypermediaLinksQueue): Promise<IActorTest> {
    if (action.context.get(KEY_CONTEXT_WRAPPED)) {
      throw new Error('Unable to wrap link queues multiple times');
    }
    return true;
  }

  public async run(action: IActionRdfResolveHypermediaLinksQueue): Promise<IActorRdfResolveHypermediaLinksQueueOutput> {
    const context = action.context.set(KEY_CONTEXT_WRAPPED, true);
    const { linkQueue } = await this.mediatorRdfResolveHypermediaLinksQueue.mediate({ ...action, context });
    const filterMap = action.context.get(KeysFilter.filters);
    if (filterMap === undefined) {
      throw new Error('filter map doesn\'t exist');
    }
    return {
      linkQueue: new LinkQueueFilterLinks(
        linkQueue,
        <Map<string, FilterFunction>> filterMap,
        this.calculateSize,
      ),
    };
  }
}

export interface IActorRdfResolveHypermediaLinksQueueWrapperFilterLinksArgs
  extends IActorArgs<IActionRdfResolveHypermediaLinksQueue, IActorTest, IActorRdfResolveHypermediaLinksQueueOutput> {
  mediatorRdfResolveHypermediaLinksQueue: Mediator<
  Actor<IActionRdfResolveHypermediaLinksQueue, IActorTest, IActorRdfResolveHypermediaLinksQueueOutput>,
  IActionRdfResolveHypermediaLinksQueue,
IActorTest,
IActorRdfResolveHypermediaLinksQueueOutput
>;
  /**
   * Calculate the size of the link queue considering the filtered links.
   * Is useful if the getSize and isEmpty are called often because their computation
   * can be expensive.
   */
  calculateSize?: boolean;
}

export const KEY_CONTEXT_WRAPPED = new ActionContextKey<boolean>(
  '@comunica/actor-rdf-resolve-hypermedia-links-queue-wrapper-filter-links:wrapped',
);
