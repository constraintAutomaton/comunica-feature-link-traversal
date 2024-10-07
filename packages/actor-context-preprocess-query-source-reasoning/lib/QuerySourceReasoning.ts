import type { QueryEngineBase } from '@comunica/actor-init-query';
import { KeysQuerySourceIdentify } from '@comunica/context-entries';
import { KeysRdfJoin } from '@comunica/context-entries-link-traversal';
import type {
  BindingsStream,
  FragmentSelectorShape,
  IActionContext,
  IQueryBindingsOptions,
  IQuerySource,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { UnionIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';

export class QuerySourceReasoning implements IQuerySource {
  /**
   * The query source to wrap over.
   */
  private readonly innerSource: IQuerySource;
  /**
   * ID of the inner source, see KeysQuerySourceIdentify.sourceIds.
   */
  public readonly sourceId: string;

  private readonly queryEngine: QueryEngineBase;

  public readonly implicitQuadStore: RDF.Store;

  public implicitQuadStoreSize: number;

  private readonly engineContext: any;

  public constructor(
    innerSource: IQuerySource,
    sourceId: string,
    implicitQuadStore: RDF.Store,
    queryEngine: QueryEngineBase,
    rules: any,
  ) {
    this.innerSource = innerSource;
    this.sourceId = sourceId;
    this.implicitQuadStore = implicitQuadStore;
    this.queryEngine = queryEngine;
    this.engineContext = {
      sources: [ this.implicitQuadStore ],
      [KeysQuerySourceIdentify.traverse.name]: false,
      [KeysRdfJoin.skipAdaptiveJoin.name]: true,
      lenient: true,
    };
  }

  public async getSelectorShape(context: IActionContext): Promise<FragmentSelectorShape> {
    return this.innerSource.getSelectorShape(context);
  }

  public queryBindings(
    operation: Algebra.Operation,
    context: IActionContext,
    options: IQueryBindingsOptions | undefined,
  ): BindingsStream {
    if (options !== undefined) {
      throw new Error('options in queryBindings are not supported in QuerySourceReasoning');
    }
    const bindingStreamOriginal = this.innerSource.queryBindings(operation, context, options);
    const implicitBindingStream = this.queryEngine.queryBindings(operation, this.engineContext);
    return new UnionIterator([ bindingStreamOriginal, implicitBindingStream ], { autoStart: false });
  }

  public async queryBoolean(operation: Algebra.Ask, context: IActionContext): Promise<boolean> {
    const booleanRespOriginal = await this.innerSource.queryBoolean(operation, context);
    const booleanRespImplicit = await this.queryEngine.queryBoolean(operation, this.engineContext);
    return booleanRespOriginal || booleanRespImplicit;
  }

  public queryQuads(operation: Algebra.Operation, context: IActionContext): AsyncIterator<RDF.Quad> {
    const originalQuads = this.innerSource.queryQuads(operation, context);
    const implicitQuads = this.queryEngine.queryQuads(operation, this.engineContext);
    return new UnionIterator([ originalQuads, implicitQuads ], { autoStart: false });
  }

  public queryVoid(): Promise<void> {
    throw new Error('queryVoid is not implemented in QuerySourceReasoning');
  }

  public get referenceValue(): string | RDF.Source {
    return this.innerSource.referenceValue;
  }

  public toString(): string {
    return `QuerySourceReasoning(${this.innerSource.constructor.name})`;
  }
}
