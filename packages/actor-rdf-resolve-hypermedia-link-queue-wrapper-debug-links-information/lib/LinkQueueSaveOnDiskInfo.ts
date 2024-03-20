// eslint-disable-next-line import/no-nodejs-modules
import { writeFileSync } from 'fs';
import type { ILinkQueue, ILink } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import { LinkQueueWrapper } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import type { FilterFunction } from '@comunica/types-link-traversal';

interface IOptionalLinkQueueParameters{
  filterMap?: Map<string, FilterFunction>;
}

interface IHistory {
  iris_popped: string[];
  iris_pushed: string[];
  filters: string[];
  started_empty: boolean;
}
/**
 * A link queue that push to a file an history of the pushing and popping and optional parameters
 */
export class LinkQueueSaveOnDiskInfo extends LinkQueueWrapper {
  public readonly filePath: string;
  public readonly filterMap?: Map<string, FilterFunction>;
  private readonly history: IHistory = {
    iris_popped: [],
    iris_pushed: [],
    filters: [],
    started_empty: true,
  };

  /**
     *
     * @param {ILinkQueue & IOptionalLinkQueueParameters} linkQueue - The link queue with optional public parameters
     * @param {string} filePath - The path where the information is saved
     */
  public constructor(linkQueue: ILinkQueue & IOptionalLinkQueueParameters, filePath: string) {
    super(linkQueue);
    this.filterMap = linkQueue.filterMap;
    this.filePath = filePath;
    Object.freeze(this.filePath);
    this.history.started_empty = this.isEmpty();
    this.addFilterToHistory();
  }

  /**
     * Return a deep copy of the history of the link queue
     * @returns {IHistory} a deep copy of the link queue history
     */
  public getHistory(): IHistory {
    return JSON.parse(JSON.stringify(this.history));
  }

  public push(link: ILink, parent: ILink): boolean {
    const resp: boolean = super.push(link, parent);
    if (resp) {
      this.history.iris_pushed.push(link.url);
      this.materialize();
    }
    return resp;
  }

  public pop(): ILink | undefined {
    const resp = super.pop();
    if (resp !== undefined) {
      this.history.iris_popped.push(resp.url);
      this.materialize();
    }
    return resp;
  }

  /**
     * Add to the history the link queue filters name
     */
  private addFilterToHistory(): void {
    if (this.filterMap !== undefined) {
      this.history.filters = [ ...this.filterMap.keys() ];
    }
  }

  /**
     * Materialize the history to a file
     */
  public materialize(): void {
    this.addFilterToHistory();
    writeFileSync(this.filePath, JSON.stringify(this.history));
  }
}
