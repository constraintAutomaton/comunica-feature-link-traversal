import type {
  IActionRdfResolveHypermediaLinksQueue,
  IActorRdfResolveHypermediaLinksQueueOutput,
} from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import { ActorRdfResolveHypermediaLinksQueue } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import type { Actor, IActorArgs, IActorTest, Mediator } from '@comunica/core';
import { ActionContextKey } from '@comunica/core';
import { LinkQueueSaveOnDiskInfo } from './LinkQueueSaveOnDiskInfo';

/**
 * A comunica Wrapper Limit Count RDF Resolve Hypermedia Links Queue Actor.
 */
export class ActorRdfResolveHypermediaLinksQueueWrapperDebugLinksInformation
  extends ActorRdfResolveHypermediaLinksQueue {
  private readonly filePath: string;
  private readonly mediatorRdfResolveHypermediaLinksQueue: Mediator<
  Actor<IActionRdfResolveHypermediaLinksQueue, IActorTest, IActorRdfResolveHypermediaLinksQueueOutput>,
  IActionRdfResolveHypermediaLinksQueue, IActorTest, IActorRdfResolveHypermediaLinksQueueOutput>;

  public constructor(args: IActorRdfResolveHypermediaLinksQueueWrapperDebugLinksInformation) {
    super(args);
    this.filePath = args.filePath;
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
    return { linkQueue: new LinkQueueSaveOnDiskInfo(linkQueue, this.filePath) };
  }
}

export interface IActorRdfResolveHypermediaLinksQueueWrapperDebugLinksInformation
  extends IActorArgs<IActionRdfResolveHypermediaLinksQueue, IActorTest, IActorRdfResolveHypermediaLinksQueueOutput> {
  mediatorRdfResolveHypermediaLinksQueue: Mediator<
  Actor<IActionRdfResolveHypermediaLinksQueue, IActorTest, IActorRdfResolveHypermediaLinksQueueOutput>,
  IActionRdfResolveHypermediaLinksQueue, IActorTest, IActorRdfResolveHypermediaLinksQueueOutput>;
  /**
   * Save path of the information
  */
  filePath: string;
}

export const KEY_CONTEXT_WRAPPED = new ActionContextKey<boolean>(
  '@comunica/actor-rdf-resolve-hypermedia-links-queue-wrapper-debug-links-information:wrapped',
);
