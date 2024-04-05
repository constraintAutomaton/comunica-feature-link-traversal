import type { MediatorDereferenceRdf } from '@comunica/bus-dereference-rdf';
import type {
  IActionExtractLinks,
  IActorExtractLinksOutput,
} from '@comunica/bus-extract-links';
import { ActorExtractLinks } from '@comunica/bus-extract-links';
import type { ILink } from '@comunica/bus-rdf-resolve-hypermedia-links';
import { KeysInitQuery } from '@comunica/context-entries';
import { KeyFilter } from '@comunica/context-entries-link-traversal';
import type { IActorTest, IActorArgs } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type { FilterFunction } from '@comunica/types-link-traversal';
import type * as RDF from '@rdfjs/types';
import {
  type Query,
  type IShape,
  generateQuery,
  shapeFromQuads,
  reportAlignment,
  IResult,
} from 'query-shape-detection';
import { DataFactory } from 'rdf-data-factory';
import { Algebra } from 'sparqlalgebrajs';

const DF = new DataFactory<RDF.BaseQuad>();

/**
 * A comunica Shape Index Extract Links Actor.
 */
export class ActorExtractLinksShapeIndex extends ActorExtractLinks {
  public static readonly IRI_SHAPETREE = 'http://www.w3.org/ns/shapetrees#ShapeTreeLocator';
  public static readonly IRI_SHAPETREE_OLD = 'http://shapetrees.org/#ShapeTree';
  public static readonly SHAPE_TREE_IN_SOLID_POD_PATH = 'shapeIndex';
  public static readonly SHAPE_TREE_LOCATOR = DF.namedNode('http://www.w3.org/ns/shapetrees#ShapeTreeLocator');
  public static readonly SHAPE_TREE_SHAPE = DF.namedNode('http://www.w3.org/ns/shapetrees#shape');
  public static readonly SOLID_INSTANCE = DF.namedNode('http://www.w3.org/ns/solid/terms#instance');
  public static readonly SOLID_INSTANCE_CONTAINER = DF.namedNode('http://www.w3.org/ns/solid/terms#instanceContainer');
  public static readonly LDP_CONTAINS = DF.namedNode('http://www.w3.org/ns/ldp#contains');
  public static readonly STORAGE_DESCRIPTION = 'http://www.w3.org/ns/solid/terms#storageDescription';

  public readonly mediatorDereferenceRdf: MediatorDereferenceRdf;
  public readonly addIriFromContainerInLinkQueue: boolean;
  public readonly restrictedToSolid: boolean;
  private filters: Map<string, FilterFunction> = new Map();

  private query?: Query = undefined;
  private readonly shapeIndexHandled: Set<string> = new Set();
  private readonly cacheShapeIndexIri = true;
  private readonly shapeIntersection?: boolean;
  private readonly strongAlignment?: boolean;

  public constructor(args: IActorExtractLinksShapeIndexArgs) {
    super(args);
  }

  /**
   * Indicate if the actor should be run.
   * It will not run if we are not in the context of a query and given the
   * flag "restrictedToSolid" is activated it will not run if a resource outside
   * of a Solid pod is evaluated.
   * @param {IActionExtractLinks} action - the action
   * @returns {Promise<IActorTest>} Whether the actor should be run
   */
  public async test(action: IActionExtractLinks): Promise<IActorTest> {
    return new Promise((resolve, reject) => {
      if (action.context.get(KeysInitQuery.query) === undefined) {
        reject(new Error(`Actor ${this.name} can only work in the context of a query.`));
        return;
      }

      if (!this.restrictedToSolid) {
        resolve(true);
        return;
      }

      if (action.headers === undefined) {
        reject(new Error('There should be an header for the resource to be in a Solid pods'));
        return;
      }

      const links = action.headers.get('Link');
      if (!links) {
        reject(new Error('There should be a link field inside the header for the resource to be in a Solid pods'));
        return;
      }

      const entries = links.split(',')
        .map(value => value.trimStart());

      for (const entry of entries) {
        if (entry.includes(ActorExtractLinksShapeIndex.STORAGE_DESCRIPTION)) {
          resolve(true);
          return;
        }
      }

      reject(new Error(`There should be a "${ActorExtractLinksShapeIndex.STORAGE_DESCRIPTION}" inside the Link field header for the resource to be in a Solid pods`));
    });
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
    const query: Algebra.Operation = action.context.get(KeysInitQuery.query)!;
    // Can we add the IRI of the containers has filters?
    let filters: undefined | Map<string, FilterFunction> = action.context.get(KeyFilter.filters);
    // We add filters to the context, if it doesn't exist or the query has changed
    if (filters === undefined) {
      filters = new Map();
      action.context = action.context.set(KeyFilter.filters, filters);
      this.shapeIndexHandled.clear();
    }
    this.filters = filters;

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

    const filteredResource = this.filterResourcesFromShapeIndex(shapeIndex, query);

    this.addRejectedEntryFilters(filteredResource);
    const links = await this.getIrisFromAcceptedEntries(filteredResource, action.context);
    if (links instanceof Error) {
      return {
        links: [],
      };
    }
    return { links };
  }

  /**
   * Get the current filter map of the engine
   * @returns {Map<string, FilterFunction>} A hard copy of the filter map
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
        this.filters.set(indexEntry.iri, (iri: string) => {
          if (iri === indexEntry.iri) {
            return true;
          }
          if (!iri.includes(indexEntry.iri)) {
            return false;
          }

          const shapeIndexURL = new URL(indexEntry.iri).pathname.split('/');
          const linkqueueURL = new URL(iri).pathname.split('/');
          // We check if we are not deeper than the targeted containers
          return linkqueueURL.length === shapeIndexURL.length;
        });
      } else {
        this.filters.set(indexEntry.iri, (iri: string) => iri === indexEntry.iri);
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
      if (!indexEntry.isAContainer) {
        links.push({ url: indexEntry.iri });
      } else if (this.addIriFromContainerInLinkQueue) {
        promises.push(this.getResourceIriFromContainer(indexEntry.iri, context));
      }
    }
    const irisFromContainers = await Promise.all(promises);
    for (const iris of irisFromContainers) {
      if (!(iris instanceof Error)) {
        links = [...links, ...iris];
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
            if (quad.predicate.equals(ActorExtractLinksShapeIndex.LDP_CONTAINS)) {
              links.push({ url: quad.object.value });
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
        if (quad.predicate.equals(ActorExtractLinksShapeIndex.SHAPE_TREE_LOCATOR)) {
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
   * @param {string} query - The query
   * @returns {IFilteredIndexEntries} An object dividing the align and non-align resource IRIs
   */
  public filterResourcesFromShapeIndex(shapeIndex: IShapeIndex, query: Algebra.Operation): IFilteredIndexEntries {
    const resp: IFilteredIndexEntries = {
      accepted: [],
      rejected: [],
    };
    if ((this.query === undefined) || (this.filters.size === 0)) {
      this.query = generateQuery(query);
    }

    const shapes = ActorExtractLinksShapeIndex.getShapesFromShapeIndex(shapeIndex);

    const resultsReport: IResult = reportAlignment({
      query: this.query,
      shapes,
      option: {
        shapeIntersection: this.shapeIntersection,
        strongAlignment: this.strongAlignment
      }
    });

    for (const [shapeName, entry] of shapeIndex) {
      if (resultsReport.unAlignedShapes.has(shapeName)) {
        resp.rejected.push({ iri: entry.iri, isAContainer: entry.isAContainer });
      } else {
        resp.accepted.push({ iri: entry.iri, isAContainer: entry.isAContainer });
      }
    }
    return resp;
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
        .then(async (response) => {
          const shapeIndexInformation: Map<string, {
            shape?: string;
            target?: IShapeIndexTarget;
          }> = new Map();

          response.data.on('data', (quad: RDF.Quad) => {
            this.fillShapeIndexInformation(quad, shapeIndexInformation);
          });

          response.data.on('error', (error) => {
            resolve(error);
          });
          // I don't see a simple alternative
          // eslint-disable-next-line ts/no-misused-promises
          response.data.on('end', async () => {
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
   * @param {Map<string, {shape?: string; target?: IShapeIndexTarget;}>} shapeIndexInformation
   * - The shape index information fetch from a quad stream
   */
  private fillShapeIndexInformation(quad: RDF.Quad, shapeIndexInformation: Map<string, {
    shape?: string;
    target?: IShapeIndexTarget;
  }>): void {
    if (quad.predicate.equals(ActorExtractLinksShapeIndex.SHAPE_TREE_SHAPE)) {
      const entry = shapeIndexInformation.get(quad.subject.value);
      if (entry === undefined) {
        shapeIndexInformation.set(quad.subject.value, { shape: quad.object.value });
      } else {
        entry.shape = quad.object.value;
      }
    }

    const isAContainer = quad.predicate.equals(ActorExtractLinksShapeIndex.SOLID_INSTANCE_CONTAINER);
    if (quad.predicate.equals(ActorExtractLinksShapeIndex.SOLID_INSTANCE) ||
      isAContainer
    ) {
      const entry = shapeIndexInformation.get(quad.subject.value);
      if (entry === undefined) {
        shapeIndexInformation.set(quad.subject.value, { target: { iri: quad.object.value, isAContainer } });
      } else {
        entry.target = { iri: quad.object.value, isAContainer };
      }
    }
  }

  /**
   * Get a shape index from information fetch from a quad stream
   * @param {Map<string, {shape?: string; target?: IShapeIndexTarget;}>} shapeIndexInformation
   * - The shape index information fetch from a quad stream
   * @param {IActionContext} context - The current context of the engine
   * @returns {Promise<[IShape, string]|Error>} The shape index of the Pod
   */
  public async getShapeIndex(shapeIndexInformation: Map<string, {
    shape?: string;
    target?: IShapeIndexTarget;
  }>, context: IActionContext): Promise<IShapeIndex> {
    const promises: Promise<[IShape, string] | Error>[] = [];
    const iriShapeIndex: Map<string, IShapeIndexTarget> = new Map();
    for (const [_subject, shape_target] of shapeIndexInformation) {
      if (shape_target.shape !== undefined && shape_target.target !== undefined) {
        promises.push(this.getShapeFromIRI(shape_target.shape, context));
        iriShapeIndex.set(shape_target.shape, shape_target.target);
      }
    }
    const results = await Promise.all(promises);
    return this.shapeIndexFromPromiseResult(results, iriShapeIndex);
  }

  private shapeIndexFromPromiseResult(
    results: ([IShape, string] | Error)[],
    iriShapeIndex: Map<string, IShapeIndexTarget>,
  ): IShapeIndex {
    const shapeIndex: IShapeIndex = new Map();
    for (const res of results) {
      // We simply don't add to the index shapes that are not available or invalid
      if (!(res instanceof Error)) {
        const shape = res[0];
        const iri = res[1];
        const shapeTarget = iriShapeIndex.get(iri);
        if (shapeTarget !== undefined) {
          shapeIndex.set(shape.name, {
            shape,
            iri: shapeTarget.iri,
            isAContainer: shapeTarget.isAContainer,
          });
        }
      }
    }
    return shapeIndex;
  }

  /**
   * Fetch the shape from an iri.
   * @param {string} iri - The iri of the shape
   * @param {IActionContext} context - the context of the current engine
   * @returns {Promise<[IShape, string]|Error>} A shape object and the iri where it has been fetch
   */
  public async getShapeFromIRI(iri: string, context: IActionContext): Promise<[IShape, string] | Error> {
    return new Promise((resolve) => {
      this.mediatorDereferenceRdf.mediate({ url: iri, context }).then(async (response) => {
        const shape = await shapeFromQuads(response.data, iri);
        if (shape instanceof Error) {
          resolve(shape);
          return;
        }
        resolve([shape, iri]);
      }, error => resolve(error));
    });
  }

  /**
   * Get the shape form the shape index.
   * @param {IShapeIndex} shapeIndex 
   * @returns {IShape[]} the shape from the index
   */
  private static getShapesFromShapeIndex(shapeIndex: IShapeIndex): IShape[] {
    const shapes: IShape[] = [];
    for (const entry of shapeIndex.values()) {
      shapes.push(entry.shape);
    }
    return shapes;
  }
}

export interface IActorExtractLinksShapeIndexArgs
  extends IActorArgs<IActionExtractLinks, IActorTest, IActorExtractLinksOutput> {
  /**
   * The Dereference RDF mediator
   */
  mediatorDereferenceRdf: MediatorDereferenceRdf;
  /**
   * When the target of shape index is a container fetch the container to add
   * the IRI to the link queue
   */
  addIriFromContainerInLinkQueue: boolean;
  /**
   * Cache the shape index iri. If a document a shape index IRI is discovered subsequent time the
   * engine will not dereference it.
   */
  cacheShapeIndexIri: boolean;
  /**
   * Don't execute the actor if the document is not in a Solid pod.
   */
  restrictedToSolid: boolean;

  /**
   * Discriminate resources based on the shape intersection.
   */
  shapeIntersection?: boolean;

  /**
   * Consider the strong alignment between the shape and the query.
   */
  strongAlignment?: boolean
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
type IShapeIndexTarget = Omit<IShapeIndexEntry, 'shape'>;

/**
 * A shape index
 */
type IShapeIndex = Map<string, IShapeIndexEntry>;

/**
 * The entry of a shape index
 */
type IShapeIndexEntry = Readonly<{
  isAContainer: boolean;
  iri: string;
  shape: IShape;
}>;

export const REACHABILITY_SHAPE_INDEX = 'cShapeIndex';
