import { getSourceId } from '@comunica/actor-context-preprocess-query-source-skolemize';
import { QueryEngineBase } from '@comunica/actor-init-query';
import type { ActorInitQueryBase } from '@comunica/actor-init-query';
import type { IActionContextPreprocess, IActorContextPreprocessOutput } from '@comunica/bus-context-preprocess';
import { ActorContextPreprocess } from '@comunica/bus-context-preprocess';
import { KeysQueryOperation, KeysQuerySourceIdentify } from '@comunica/context-entries';
import { KeyReasoning } from '@comunica/context-entries-link-traversal';
import type { IActorArgs, IActorTest, TestResult} from '@comunica/core';
import type { IQuerySourceWrapper, QuerySourceReference } from '@comunica/types';
import { StreamingStore } from 'rdf-streaming-store';
import { QuerySourceReasoning } from './QuerySourceReasoning';
import type { ScopedRules } from './Rules';
import { passTestVoid } from '@comunica/core';


/**
 * A comunica Query Source Reasoning Context Preprocess Actor.
 */
export class ActorContextPreprocessQuerySourceReasoning extends ActorContextPreprocess {
  public readonly queryEngine: QueryEngineBase;

  public constructor(args: IActorContextPreprocessQuerySourceReasoning) {
    super(args);
    this.queryEngine = new QueryEngineBase(args.actorInitQuery);
  }

  public async test(_action: IActionContextPreprocess): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionContextPreprocess): Promise<IActorContextPreprocessOutput> {
    let context = action.context;

    // Wrap sources in reasoning sources
    if (context.has(KeysQueryOperation.querySources)) {
      // Determine map of source id's
      if (!context.has(KeysQuerySourceIdentify.sourceIds)) {
        context = context.set(KeysQuerySourceIdentify.sourceIds, new Map());
      }
      const sourceIds: Map<QuerySourceReference, string> = context.getSafe(KeysQuerySourceIdentify.sourceIds);

      let sources: IQuerySourceWrapper[] = context.getSafe(KeysQueryOperation.querySources);
      const rules: ScopedRules | undefined = context.get(KeyReasoning.rules);
      if (rules === undefined) {
        throw new Error('no rule key defined');
      }

      sources = await Promise.all(sources.map(async(sourceWrapper) => {
        const store = new StreamingStore();

        const source = new QuerySourceReasoning(
          sourceWrapper.source,
          getSourceId(sourceIds, sourceWrapper.source),
          store,
          this.queryEngine,
          rules,
        );

        await source.updateImplicitStore(context);
        return {
          source,
          context: sourceWrapper.context,
        };
      }));
      context = context.set(KeysQueryOperation.querySources, sources);
    }

    return { context };
  }
}

export interface IActorContextPreprocessQuerySourceReasoning
  extends IActorArgs<IActionContextPreprocess, IActorTest, IActorContextPreprocessOutput> {
  /**
   * An init query actor that is used to query shapes.
   * @default {<urn:comunica:default:init/actors#query>}
   */
  actorInitQuery: ActorInitQueryBase;
}
