import type { EventEmitter } from 'node:events';
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
import { UnionIterator, type AsyncIterator, ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';
import { parseRules } from './Rules';
import type { IRuleGraph, ScopedRules } from './Rules';

const UriTemplate = require('uri-template-lite');

const DF = new DataFactory();
const AF = new Factory();

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

  public readonly implicitQuadStore: RDF.Source & RDF.Sink<RDF.Stream<RDF.Quad>, EventEmitter>;

  public implicitQuadStoreSize: number;

  private readonly engineContext: any;

  public readonly rules: IRuleGraph;

  private readonly getAllQuadsOperation: Algebra.Operation = AF.createPattern(
    DF.variable('s'),
    DF.variable('p'),
    DF.variable('o'),
    DF.variable('g'),
  );

  public constructor(
    innerSource: IQuerySource,
    sourceId: string,
    implicitQuadStore: RDF.Source & RDF.Sink<RDF.Stream<RDF.Quad>, EventEmitter>,
    queryEngine: QueryEngineBase,
    rules: ScopedRules,
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

    this.rules = this.selectCorrespondingRuleSet(rules);
  }

  private selectCorrespondingRuleSet(rules: ScopedRules): IRuleGraph {
    const ruleForAll: IRuleGraph = rules.get('*') === undefined ?
        { rules: []} :
      parseRules(rules.get('*')!);

    if (typeof this.referenceValue === 'string') {
      const correspondingRules: IRuleGraph = ruleForAll;

      for (const [ domain, ruleSet ] of rules) {
        if (typeof domain === 'string') {
          const template = new UriTemplate(domain);
          if (template.match(this.referenceValue) !== null) {
            const ruleGraph = parseRules(ruleSet);
            correspondingRules.rules = [ ...correspondingRules.rules, ...ruleGraph.rules ];
          }
        }
      }
    } else {
      const rawRules = rules.get(this.referenceValue);
      if (rawRules !== undefined) {
        const localStoreRule: IRuleGraph = {
          rules: ruleForAll.rules = [ ...ruleForAll.rules, ...parseRules(rawRules).rules ],
        };
        return localStoreRule;
      }
    }
    return ruleForAll;
  }

  public async updateImplicitStore(context: IActionContext): Promise<void> {
    const innerStoreQuads = await this.innerSource.queryQuads(this.getAllQuadsOperation, context).toArray();
    const importOperations = [];
    let currentStore = innerStoreQuads;
    do {
      const iterationProcessing = [];
      const implicitQuads: RDF.Quad[] = [];
      for (const rule of this.rules.rules) {
        const iteration = new Promise<void>((resolve) => {
          for (const quad of currentStore) {
            const implicitQuad = rule.forwardChaining(quad);
            if (implicitQuad !== undefined) {
              implicitQuads.push(implicitQuad);
            }
          }
          resolve();
        });
        iterationProcessing.push(iteration);
      }
      await Promise.allSettled(iterationProcessing);
      currentStore = implicitQuads;
      importOperations.push(
        new Promise<void>((resolve) => {
          this.implicitQuadStore.import(new ArrayIterator(implicitQuads, { autoStart: false }));
          resolve();
        }),
      );
    } while (currentStore.length > 0);
    await Promise.all(importOperations);
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
