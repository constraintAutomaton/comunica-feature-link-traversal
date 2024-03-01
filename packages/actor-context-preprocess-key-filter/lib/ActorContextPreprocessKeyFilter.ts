import type { IActorContextPreprocessOutput, IActorContextPreprocessArgs } from '@comunica/bus-context-preprocess';
import { ActorContextPreprocess } from '@comunica/bus-context-preprocess';
import { KeyFilter } from '@comunica/context-entries-link-traversal';
import type { IActorTest, IAction } from '@comunica/core';

/**
 * A comunica Key Filter Context Preprocess Actor.
 */
export class ActorContextPreprocessKeyFilter extends ActorContextPreprocess {
  public constructor(args: IActorContextPreprocessArgs) {
    super(args);
  }

  public async test(_: IAction): Promise<IActorTest> {
    return true;
  }

  public async run(action: IAction): Promise<IActorContextPreprocessOutput> {
    if (action.context.get(KeyFilter.filters) === undefined) {
      action.context.set(KeyFilter.filters, new Map());
    }
    return action;
  }
}
