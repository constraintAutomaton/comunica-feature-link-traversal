// eslint-disable-next-line import/no-nodejs-modules
import { writeFileSync } from 'node:fs';
import type { ILinkQueue, ILink } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import { LinkQueueWrapper } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import { PRODUCED_BY_ACTOR } from '@comunica/types-link-traversal';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * Optional parameters necessitating special processing
 */
interface IOptionalLinkQueueParameters {
}

interface IHistory {
  iris_popped: IURLStatistic[];
  iris_pushed: IURLStatistic[];
  started_empty: boolean;
  query: Algebra.Operation | string;
}

interface IURLStatistic {
  url: string;
  reachability_criteria: string | undefined;
  timestamp: number;
}
/**
 * A link queue that push to a file an history of the pushing and popping and optional parameters
 */
export class LinkQueueSaveOnDiskInfo extends LinkQueueWrapper {
  public readonly filePath: string;
  private readonly history: IHistory = {
    iris_popped: [],
    iris_pushed: [],
    started_empty: true,
    query: '',
  };

  /**
   *
   * @param {ILinkQueue & IOptionalLinkQueueParameters} linkQueue - The link queue with optional public parameters
   * @param {string} filePath - The path where the information is saved
   */
  public constructor(
    linkQueue: ILinkQueue & IOptionalLinkQueueParameters,
    filePath: string,
    query: Algebra.Operation | string,
  ) {
    super(linkQueue);
    this.filePath = filePath;
    Object.freeze(this.filePath);
    this.history.started_empty = this.isEmpty();
    this.history.query = query;
  }

  /**
   * Return a deep copy of the history of the link queue
   * @returns {IHistory} a deep copy of the link queue history
   */
  public getHistory(): IHistory {
    return JSON.parse(JSON.stringify(this.history));
  }

  public override push(link: ILink, parent: ILink): boolean {
    const resp: boolean = super.push(link, parent);
    if (resp) {
      const metadata = link.metadata;
      let reachability_criteria = null;
      if (metadata !== undefined) {
        reachability_criteria = metadata[PRODUCED_BY_ACTOR].name;
      }
      this.history.iris_pushed.push({ url: link.url, reachability_criteria, timestamp: Date.now() });
      this.materialize();
    }
    return resp;
  }

  public override pop(): ILink | undefined {
    const resp = super.pop();
    if (resp !== undefined) {
      const metadata = resp.metadata;
      let reachability_criteria = null;
      if (metadata !== undefined) {
        reachability_criteria = metadata[PRODUCED_BY_ACTOR].name;
      }
      this.history.iris_popped.push({ url: resp.url, reachability_criteria, timestamp: Date.now() });
      this.materialize();
    }
    return resp;
  }

  /**
   * Materialize the history to a file
   */
  public materialize(): void {
    writeFileSync(this.filePath, JSON.stringify(this.history));
  }
}
