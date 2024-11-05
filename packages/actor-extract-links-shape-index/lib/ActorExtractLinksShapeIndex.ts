import type { MediatorDereferenceRdf } from '@comunica/bus-dereference-rdf';
import type {
  IActionExtractLinks,
  IActorExtractLinksOutput,
} from '@comunica/bus-extract-links';
import { ActorExtractLinks } from '@comunica/bus-extract-links';
import type { ILink } from '@comunica/bus-rdf-resolve-hypermedia-links';
import { KeysInitQuery } from '@comunica/context-entries';
import { KeysFilter } from '@comunica/context-entries-link-traversal';
import type { IActorTest, IActorArgs } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type { FilterFunction } from '@comunica/types-link-traversal';
import { PRODUCED_BY_ACTOR } from '@comunica/types-link-traversal';
import type * as RDF from '@rdfjs/types';
import {
  ContainmentResult,
  generateQuery,
  shapeFromQuads,
  solveShapeQueryContainment,
} from 'query-shape-detection';
import type {
  IResult,
  IQuery,
  IShape,
} from 'query-shape-detection';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';

const DF = new DataFactory<RDF.BaseQuad>();

/**
 * A comunica Shape Index Extract Links Actor.
 */
export class ActorExtractLinksShapeIndex extends ActorExtractLinks {
  public static readonly RDF_TYPE_NODE = DF.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');

  public static readonly RDF_TRUE_NODE = DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean'));
  public static readonly RDF_FALSE_NODE = DF.literal('false', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean'));

  public static readonly SHAPE_INDEX_PREFIX = 'https://shapeIndex.com#';

  public static readonly SHAPE_INDEX_LOCATOR_NODE = DF.namedNode(`${this.SHAPE_INDEX_PREFIX}shapeIndexLocation`);

  public static readonly SHAPE_INDEX_CLASS_DEFINITION_NODE = DF.namedNode(`${this.SHAPE_INDEX_PREFIX}ShapeIndex`);
  public static readonly SHAPE_INDEX_DOMAIN_NODE = DF.namedNode(`${this.SHAPE_INDEX_PREFIX}domain`);
  public static readonly SHAPE_INDEX_ENTRY_NODE = DF.namedNode(`${this.SHAPE_INDEX_PREFIX}entry`);
  public static readonly SHAPE_INDEX_BIND_BY_SHAPE_NODE = DF.namedNode(`${this.SHAPE_INDEX_PREFIX}bindByShape`);
  public static readonly SHAPE_INDEX_IS_COMPLETE_NODE = DF.namedNode(`${this.SHAPE_INDEX_PREFIX}isComplete`);

  public static readonly SOLID_INSTANCE_NODE = DF.namedNode('http://www.w3.org/ns/solid/terms#instance');
  public static readonly SOLID_INSTANCE_CONTAINER_NODE = DF.namedNode('http://www.w3.org/ns/solid/terms#instanceContainer');

  public static readonly LDP_CONTAINS_NODE = DF.namedNode('http://www.w3.org/ns/ldp#contains');

  public static readonly STORAGE_DESCRIPTION = 'http://www.w3.org/ns/solid/terms#storageDescription';

  public static readonly ADAPTATIVE_REACHABILITY_LABEL = 'exclude_domain';

  public readonly mediatorDereferenceRdf: MediatorDereferenceRdf;
  private filters: Map<string, FilterFunction> = new Map();

  private query?: IQuery = undefined;

  private readonly cacheShapeIndexIri = true;
  private readonly shapeIndexHandled: Set<string> = new Set();
  private readonly linkPriority?: number;
  private readonly linkProduced: Set<string> = new Set();

  public constructor(args: IActorExtractLinksShapeIndexArgs) {
    super(args);
  }

  /**
   * Discover a shape index, add to the link queue the entries align with the query
   * and generate a filters to prune entries that are not aligned.
   * Will return an empty list of links if the process fail.
   * @param {IActionExtractLinks} action - The current action
   * @returns {Promise<IActorExtractLinksOutput>} - The new link to add to the link queue
   */
  public async run(action: IActionExtractLinks): Promise<IActorExtractLinksOutput> {
    // If there is no query the engine should not work anyways
    const query: Algebra.Operation = action.context.getSafe(KeysInitQuery.query);
    // Can we add the IRI of the containers has filters?
    let filters: undefined | Map<string, FilterFunction> = action.context.get(KeysFilter.filters);
    // We add filters to the context, if it doesn't exist or the query has changed
    // We also reset the cashing of shape index handled
    if (filters === undefined) {
      filters = new Map();
      action.context = action.context.set(KeysFilter.filters, filters);
      this.shapeIndexHandled.clear();
      try {
        this.query = generateQuery(query);
      } catch {}
    }

    if (filters?.size === 0) {
      this.shapeIndexHandled.clear();
      try {
        this.query = generateQuery(query);
      } catch {}
    }

    this.filters = filters;
    if (this.filters.size === 0) {
      // A placeholder to avoid flushing the state when the query has not being changed
      this.filters.set('placeholder', /* istanbul ignore next */(_: ILink) => false);
    }

    const shapeIndexLocation = await this.discoverShapeIndexLocationFromTriples(action.metadata);
    if (shapeIndexLocation instanceof Error) {
      return {
        links: [],
      };
    }

    if (this.shapeIndexHandled.has(shapeIndexLocation)) {
      return {
        links: [],
      };
    }
    if (this.cacheShapeIndexIri) {
      this.shapeIndexHandled.add(shapeIndexLocation);
    }
    const shapeIndex = await this.generateShapeIndex(shapeIndexLocation, action.context);
    if (shapeIndex instanceof Error) {
      return {
        links: [],
      };
    }

    const filteredResource = await this.filterResourcesFromShapeIndex(shapeIndex, action.context);

    this.addRejectedEntryFilters(filteredResource);
    const links = await this.getIrisFromAcceptedEntries(filteredResource, action.context);
    for (const link of links) {
      this.linkProduced.add(link.url);
    }
    return { links };
  }

  /**
   * Get the current filter map of the engine
   * @returns {Map<string, FilterFunction>} A deep copy of the filter map
   */
  public getFilters(): Map<string, FilterFunction> {
    return new Map(this.filters);
  }

  /**
   * Generate filter function from the rejected entries of the shape index.
   * When it is a resource that the filter simply valide if the resource iri is the
   * same as the one pass, if it is a container than it validate if the iri is in the
   * same container.
   * @param {IFilteredIndexEntries} filteredResources - The index entries filtered
   */
  public addRejectedEntryFilters(filteredResources: IFilteredIndexEntries): void {
    for (const indexEntry of filteredResources.rejected) {
      if (indexEntry.isAContainer) {
        this.filters.set(indexEntry.iri, (link: ILink) => {
          if (link.url === indexEntry.iri) {
            return true;
          }
          if (!link.url.includes(indexEntry.iri)) {
            return false;
          }

          const shapeIndexURL = new URL(indexEntry.iri).pathname.split('/');
          const linkqueueURL = new URL(link.url).pathname.split('/');
          // We check if we are not deeper than the targeted containers
          return linkqueueURL.length === shapeIndexURL.length;
        });
      } else {
        this.filters.set(indexEntry.iri, (link: ILink) => link.url === indexEntry.iri);
      }
    }
  }

  /**
   * Get the iris from the accepted entries of the index.
   * If the flag "addIriFromContainerInLinkQueue" is activate it if it is a container it will
   * add it's resources to the list.
   * @param {IFilteredIndexEntries} filteredResources - The index entries filtered
   * @param {IActionContext} context - The current context of the engine
   * @returns {Promise<ILink[]>} An array of the iris from the index that are accepted
   */
  public async getIrisFromAcceptedEntries(
    filteredResources: IFilteredIndexEntries,
    context: IActionContext,
  ): Promise<ILink[]> {
    let links: ILink[] = [];
    const promises: Promise<ILink[] | Error>[] = [];
    for (const indexEntry of filteredResources.accepted) {
      if (indexEntry.isAContainer) {
        promises.push(this.getResourceIriFromContainer(indexEntry.iri, context));
      } else {
        links.push({
          url: indexEntry.iri,
          metadata: { [PRODUCED_BY_ACTOR]: { name: this.name }, priority: this.linkPriority },
        });
      }
    }
    const irisFromContainers = await Promise.all(promises);
    for (const iris of irisFromContainers) {
      if (!(iris instanceof Error)) {
        links = [ ...links, ...iris ];
      }
    }
    return links;
  }

  /**
   * Get the iri of every resource in container.
   * @param {string} iri - The iri of the container
   * @param {IActionContext} context - The current context of the engine
   * @returns {Promise<ILink[]|Error>} - The iris of the resource in the container
   */
  public getResourceIriFromContainer(iri: string, context: IActionContext): Promise<ILink[] | Error> {
    const links: ILink[] = [];
    return new Promise((resolve) => {
      this.mediatorDereferenceRdf.mediate({ url: iri, context })
        .then((response) => {
          response.data.on('data', (quad: RDF.Quad) => {
            if (quad.predicate.equals(ActorExtractLinksShapeIndex.LDP_CONTAINS_NODE)) {
              links.push({
                url: quad.object.value,
                metadata: { [PRODUCED_BY_ACTOR]: { name: this.name }, priority: this.linkPriority },
              });
            }
          });

          response.data.on('end', () => {
            resolve(links);
          });

          response.data.on('error', (error) => {
            resolve(error);
          });
        }, (error) => {
          resolve(error);
        });
    });
  }

  /**
   * From a quad stream find the shape index location.
   * Will reject the promise if there is no shape index location found.
   * @param {RDF.Stream} metadata - A stream of quad
   * @returns {Promise<string|Error>} The IRI of the shape index
   */
  public discoverShapeIndexLocationFromTriples(metadata: RDF.Stream): Promise<string | Error> {
    return new Promise((resolve) => {
      let shapeIndexLocation: string | undefined;
      metadata.on('data', (quad: RDF.Quad) => {
        if (quad.predicate.equals(ActorExtractLinksShapeIndex.SHAPE_INDEX_LOCATOR_NODE)) {
          shapeIndexLocation = quad.object.value;
        }
      });

      metadata.on('error', (error) => {
        resolve(error);
      });

      metadata.on('end', () => {
        if (shapeIndexLocation === undefined) {
          resolve(new Error('no shape index found'));
        } else {
          resolve(shapeIndexLocation);
        }
      });
    });
  }

  /**
   * Calculate the alignment of the shapes from the shape index with the query
   * and return an object describing the result.
   * @param {IShapeIndex} shapeIndex - The shape index
   * @returns {IFilteredIndexEntries} An object dividing the align and non-align resource IRIs
   */
  public async filterResourcesFromShapeIndex(
    shapeIndex: IShapeIndex,
    context: IActionContext,
  ): Promise<IFilteredIndexEntries> {
    const resp: IFilteredIndexEntries = {
      accepted: [],
      rejected: [],
    };
    if (this.query !== undefined) {
      const shapes = await this.getShapesFromShapeIndex(shapeIndex, context);

      const resultsReport: IResult = solveShapeQueryContainment({
        query: this.query,
        shapes,
      });

      let fullyContained = true;
      const mapResult: Map<string, boolean> = new Map();
      for (const [ starPatternName, result ] of resultsReport.starPatternsContainment) {
        if (result.result === ContainmentResult.ALIGNED || result.result === ContainmentResult.REJECTED) {
          fullyContained = false;
        }
        // If we depend on a star pattern but we don't know what is the shape of the dependency
        // or the shape is not in the domain
        if (result.result === ContainmentResult.DEPEND && (result.target === undefined)) {
          fullyContained = false;
        }
        for (const target of result.target ?? []) {
          const starPattern = this.query.starPatterns.get(starPatternName)!;
          mapResult.set(target, starPattern.isVariable);
        }
      }

      for (const entry of shapeIndex.entries.values()) {
        // We reject the entry if the star pattern is an IRI because we already know the location of the data
        if ((mapResult.get(entry.shape.name) ?? false) || mapResult.size === 0) {
          resp.accepted.push({ iri: entry.iri, isAContainer: entry.isAContainer });
        } else {
          resp.rejected.push({ iri: entry.iri, isAContainer: entry.isAContainer });
        }
      }

      // If we know the domain then we can restrict the domain
      if (this.aprioriKnowledgeOftheSearchDomain(fullyContained, shapeIndex.isComplete)) {
        this.filters.set(`${shapeIndex.domain.source}_${ActorExtractLinksShapeIndex.ADAPTATIVE_REACHABILITY_LABEL}`, (link: ILink): boolean => {
          const metadata = link.metadata;
          if (metadata !== undefined && metadata[PRODUCED_BY_ACTOR]?.name === this.name) {
            return false;
          }

          if (this.linkProduced.has(link.url)) {
            return false;
          }
          const isInDomain = shapeIndex.domain.test(link.url);
          return isInDomain;
        });
      }
    }

    return resp;
  }

  private aprioriKnowledgeOftheSearchDomain(fullyContained: boolean, completeShapeIndex: boolean): boolean {
    return fullyContained || completeShapeIndex;
  }

  /**
   * Generate a shape index object from the IRI of a shape index resource.
   * @param {string} shapeIndexIri - The shape index IRI
   * @param {IActionContext} context - The current context of the engine
   * @returns {Promise<IShapeIndex|Error>} The shape index of the Pod
   */
  public async generateShapeIndex(shapeIndexIri: string, context: IActionContext): Promise<IShapeIndex | Error> {
    return new Promise<IShapeIndex | Error>((resolve) => {
      this.mediatorDereferenceRdf.mediate({ url: shapeIndexIri, context })
        .then(async(response) => {
          const shapeIndexInformation: IShapeIndexInformation = {
            declaration: false,
            isComplete: undefined,
            domain: undefined,
            entries: [],
            bindingShapes: new Map(),
            targets: new Map(),
          };

          response.data.on('data', (quad: RDF.Quad) => {
            this.fillShapeIndexInformation(quad, shapeIndexIri, shapeIndexInformation);
          });

          response.data.on('error', (error) => {
            resolve(error);
          });
          // I don't see a simple alternative
          // eslint-disable-next-line ts/no-misused-promises
          response.data.on('end', async() => {
            const shapeIndex = await this.getShapeIndex(shapeIndexInformation, context);
            resolve(shapeIndex);
          });
        }, (error) => {
          resolve(error);
        });
    });
  }

  /**
   * Associate the information from a quad into a map of shape index information.
   * @param {RDF.Quad} quad - A quad
   * @param {string} shapeIndexIri - Iri of the Shape Index
   * @param {Map<string, {shape?: string; target?: IShapeIndexTarget;}>} shapeIndexInformation
   * - The shape index information fetch from a quad stream
   */
  private fillShapeIndexInformation(
    quad: RDF.Quad,
    shapeIndexIri: string,
    shapeIndexInformation: IShapeIndexInformation,
  ): void {
    if (quad.subject.value === shapeIndexIri && quad.predicate.equals(ActorExtractLinksShapeIndex.RDF_TYPE_NODE)) {
      shapeIndexInformation.declaration =
        quad.object.equals(ActorExtractLinksShapeIndex.SHAPE_INDEX_CLASS_DEFINITION_NODE) ||
        shapeIndexInformation.declaration;
    } else if (quad.predicate.equals(ActorExtractLinksShapeIndex.SHAPE_INDEX_DOMAIN_NODE)) {
      shapeIndexInformation.domain = quad.object.value;
    } else if (quad.subject.value === shapeIndexIri &&
      quad.predicate.equals(ActorExtractLinksShapeIndex.SHAPE_INDEX_ENTRY_NODE)) {
      shapeIndexInformation.entries.push(quad.object.value);
    } else if (quad.predicate.equals(ActorExtractLinksShapeIndex.SHAPE_INDEX_BIND_BY_SHAPE_NODE)) {
      shapeIndexInformation.bindingShapes.set(quad.subject.value, quad.object.value);
    } else if (quad.predicate.equals(ActorExtractLinksShapeIndex.SOLID_INSTANCE_NODE)) {
      shapeIndexInformation.targets.set(quad.subject.value, {
        isAContainer: false,
        iri: quad.object.value,
      });
    } else if (quad.predicate.equals(ActorExtractLinksShapeIndex.SOLID_INSTANCE_CONTAINER_NODE)) {
      shapeIndexInformation.targets.set(quad.subject.value, {
        isAContainer: true,
        iri: quad.object.value,
      });
    } else if (quad.predicate.equals(ActorExtractLinksShapeIndex.SHAPE_INDEX_IS_COMPLETE_NODE)) {
      shapeIndexInformation.isComplete = Boolean(quad.object.equals(ActorExtractLinksShapeIndex.RDF_TRUE_NODE));
    }
  }

  /**
   * Get a shape index from information fetch from a quad stream
   * @param {Map<string, {shape?: string; target?: IShapeIndexTarget;}>} shapeIndexInformation
   * - The shape index information fetch from a quad stream
   * @param {IActionContext} context - The current context of the engine
   * @returns {Promise<[IShape, string]|Error>} The shape index of the Pod
   */
  public async getShapeIndex(
    shapeIndexInformation: IShapeIndexInformation,
    context: IActionContext,
  ): Promise<IShapeIndex | Error> {
    if (!shapeIndexInformation.declaration) {
      return new Error('the RDF type of the shape index is not defined');
    }
    if (shapeIndexInformation.domain === undefined) {
      return new Error('the domain of the shape index is not defined');
    }
    const isComplete = shapeIndexInformation.isComplete ?? false;
    const shapeRequestPromises: Promise<[IShape, string] | Error>[] = [];
    const targets: Map<string, IShapeIndexTarget> = new Map();
    for (const entry of shapeIndexInformation.entries) {
      const shapeIri = shapeIndexInformation.bindingShapes.get(entry);
      const target = shapeIndexInformation.targets.get(entry);

      if (shapeIri === undefined || target === undefined) {
        continue;
      }
      targets.set(entry, target);
      shapeRequestPromises.push(this.getShapeFromIRI(shapeIri, entry, context));
    }

    const results = await Promise.all(shapeRequestPromises);
    return this.shapeIndexFromPromiseResult(results, targets, shapeIndexInformation.domain, isComplete);
  }

  private shapeIndexFromPromiseResult(
    results: ([IShape, string] | Error)[],
    targets: Map<string, IShapeIndexTarget>,
    domain: string,
    isComplete: boolean,
  ): IShapeIndex {
    const shapeIndex: IShapeIndex = {
      isComplete,
      domain: new RegExp(domain, 'u'),
      entries: new Map(),
    };
    for (const res of results) {
      // We simply don't add to the index shapes that are not available or invalid
      if (!(res instanceof Error)) {
        const [ shape, entryIndex ] = res;
        const target = targets.get(entryIndex);
        if (target !== undefined) {
          const entry: IShapeIndexEntry = {
            ...target,
            shape,
          };
          shapeIndex.entries.set(target.iri, entry);
        }
      }
    }
    return shapeIndex;
  }

  /**
   * Fetch the shape from an iri.
   * @param {string} iri - The iri of the shape
   * @param {string} entry - The entry related to the shape
   * @param {IActionContext} context - The context of the current engine
   * @returns {Promise<[IShape, string]|Error>} A shape object and the entry related to the shape
   */
  public async getShapeFromIRI(iri: string, entry: string, context: IActionContext): Promise<[IShape, string] | Error> {
    return new Promise((resolve) => {
      this.mediatorDereferenceRdf.mediate({ url: iri, context }).then(async(response) => {
        const shape = await shapeFromQuads(response.data, iri);
        if (shape instanceof Error) {
          resolve(shape);
          return;
        }
        resolve([ shape, entry ]);
      }, error => resolve(error));
    });
  }

  /**
   * Get the shape form the shape index.
   * @param {IShapeIndex} shapeIndex
   * @returns {IShape[]} the shape from the index
   */
  private async getShapesFromShapeIndex(shapeIndex: IShapeIndex, context: IActionContext): Promise<IShape[]> {
    const shapes: Map<string, IShape> = new Map();
    const getShapeOperations = [];
    for (const entry of shapeIndex.entries.values()) {
      const linkedShapesIri = entry.shape.getLinkedShapeIri();
      for (const iri of linkedShapesIri) {
        getShapeOperations.push(this.getShapeFromIRI(iri, iri, context));
      }
      shapes.set(entry.shape.name, entry.shape);
    }
    for (const entry of shapeIndex.entries.values()) {
      const linkedShapesIri = entry.shape.getLinkedShapeIri();
      for (const iri of linkedShapesIri) {
        if (!shapes.has(iri)) {
          getShapeOperations.push(this.getShapeFromIRI(iri, iri, context));
        }
      }
    }
    const dependentShapes = await Promise.all(getShapeOperations);
    for (const shape of dependentShapes) {
      if (!(shape instanceof Error)) {
        shapes.set(shape[0].name, shape[0]);
      }
    }
    return [ ...shapes.values() ];
  }
}

export interface IActorExtractLinksShapeIndexArgs
  extends IActorArgs<IActionExtractLinks, IActorTest, IActorExtractLinksOutput> {
  /**
   * The Dereference RDF mediator
   */
  mediatorDereferenceRdf: MediatorDereferenceRdf;
  /**
   * Cache the shape index iri. If a document a shape index IRI is discovered subsequent time the
   * engine will not dereference it.
   */
  cacheShapeIndexIri: boolean;
  /**
   * Priority on the link discovered from the index
   */
  linkPriority?: number;
}

/**
 * A description of the shape index entries that are align or not with the query.
 */
type IFilteredIndexEntries = Readonly<{
  /**
   * The index entries aligned with the query
   */
  accepted: IShapeIndexTarget[];
  /**
   * The index entries not aligned with the query
   */
  rejected: IShapeIndexTarget[];
}>;

/**
 * The target of a shape index
 */
type IShapeIndexTarget = Readonly<{
  isAContainer: boolean;
  iri: string;
}>;

/**
 * A shape index
 */
interface IShapeIndex {
  isComplete: boolean;
  domain: RegExp;
  // Iri by IShapeIndexEntry
  entries: Map<string, IShapeIndexEntry>;
}

/**
 * The entry of a shape index
 */
type IShapeIndexEntry = Readonly<{
  isAContainer: boolean;
  iri: string;
  shape: IShape;
}>;

/**
 * Information about a shape index from a set of quads
 */
interface IShapeIndexInformation {
  declaration: boolean;
  domain?: string;
  isComplete?: boolean;
  entries: string[];
  bindingShapes: Map<string, string>;
  targets: Map<string, IShapeIndexTarget>;
}
