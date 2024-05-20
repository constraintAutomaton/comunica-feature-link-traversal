import type { ILinkQueue, ILink } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import { LinkQueueWrapper } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import type { FilterFunction } from '@comunica/types-link-traversal';

/**
 * A link queue that only allow to enter and exiting the link queue links respecting the filters
 */
export class LinkQueueFilterLinks extends LinkQueueWrapper {
  public readonly filterMap: Map<string, FilterFunction>;
  private readonly internalLinkSet: Set<ILink> = new Set();
  // If disactivated doesn't use the filter to calculate the size
  private readonly calculateSize: boolean;

  public constructor(linkQueue: ILinkQueue, filterMap: Map<string, FilterFunction>, calculateSize?: boolean) {
    super(linkQueue);
    if (!super.isEmpty()) {
      throw new Error('the wrapped link queue should be empty upon construction of the wrapper');
    }
    this.filterMap = filterMap;
    this.calculateSize = calculateSize ?? true;
  }

  public override push(link: ILink, parent: ILink): boolean {
    for (const filter of this.filterMap.values()) {
      if (filter(link)) {
        return false;
      }
    }
    const hasBeenPushed = super.push(link, parent);
    if (hasBeenPushed) {
      if (this.calculateSize) {
        this.internalLinkSet.add(link);
      }
      return hasBeenPushed;
    }
    return hasBeenPushed;
  }

  public override pop(): ILink | undefined {
    let nextLink: ILink | undefined;
    do {
      nextLink = super.pop();
      if (nextLink === undefined) {
        return nextLink;
      }

      let isAccepted = true;
      for (const filter of this.filterMap.values()) {
        if (filter(nextLink)) {
          isAccepted = false;
          break;
        }
      }
      if (isAccepted) {
        if (this.calculateSize) {
          this.internalLinkSet.delete(nextLink);
        }
        return nextLink;
      }
    } while (!super.isEmpty());
  }

  /**
   * Determine if the link queue is empty or not with same limitation of
   * the getSize method
   * @returns {boolean} whether the link queue is empty or not
   */
  public override isEmpty(): boolean {
    return this.getSize() === 0;
  }

  /**
   * Will return the size of the link queue considering the current filters.
   * The size is calculated from an internal link set , so the results might be invalid
   * if the link queue or another wrapper does special calculation for the size of queue.
   * @returns {number} the size the link queue
   */
  public override getSize(): number {
    if (super.isEmpty()) {
      return 0;
    }
    if (!this.calculateSize) {
      return super.getSize();
    }
    const toDelete: ILink[] = [];
    for (const link of this.internalLinkSet) {
      for (const filter of this.filterMap.values()) {
        if (filter(link)) {
          toDelete.push(link);
          break;
        }
      }
    }
    for (const link of toDelete) {
      this.internalLinkSet.delete(link);
    }
    return this.internalLinkSet.size;
  }

  /**
   * It will return undefined upon the condition of the wrapped link queue and
   * if the next link doesn't respect the filter
   * @returns {ILink | undefined} next link
   */
  public override peek(): ILink | undefined {
    const link = super.peek();
    if (link === undefined) {
      return link;
    }
    for (const filter of this.filterMap.values()) {
      if (filter(link)) {
        return undefined;
      }
    }
    return link;
  }
}
