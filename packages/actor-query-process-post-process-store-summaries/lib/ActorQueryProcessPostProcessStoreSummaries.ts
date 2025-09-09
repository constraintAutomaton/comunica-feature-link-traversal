import { ActorQueryProcess, IActionQueryProcess, IActorQueryProcessOutput, IActorQueryProcessArgs, MediatorQueryProcess } from '@comunica/bus-query-process';
import { KeyCacheSummaries, KeysInitQueryLTQP } from '@comunica/context-entries-link-traversal';
import { TestResult, IActorArgs, IActorTest, passTestVoid, ActionContextKey, failTest } from '@comunica/core';
import { IActionContext } from '@comunica/types';
import { ISummary, SummaryCache } from '@comunica/types-link-traversal';
import { result, safePromise, type SafePromise, error } from "result-interface";

/**
 * A comunica Post Process Store Summaries Query Process Actor.
 */
export class ActorQueryProcessPostProcessStoreSummaries extends ActorQueryProcess {
  private readonly nestedQueryProcess: ActorQueryProcess;
  private readonly destination: Destination;
  private static readonly LOCAL_STORATE_KEY = "COMUNICA-SUMMARIES";

  public constructor(args: IActorQueryProcessPostProcessStoreSummariesArgs) {
    super(args);
  }

  public async test(action: IActionQueryProcess): Promise<TestResult<IActorTest>> {
    const materialize = action.context.get(KeysInitQueryLTQP.materializedSummaries);
    if (materialize) {
      return passTestVoid();
    } else if (materialize === false) {
      return failTest(`${KeysInitQueryLTQP.materializedSummaries} is set to not be materialized the summaries`);
    }
    return failTest(`${KeysInitQueryLTQP.materializedSummaries} is not in the context`);
  }

  public async run(action: IActionQueryProcess, sideData: undefined): Promise<IActorQueryProcessOutput> {
    const processResponse = this.nestedQueryProcess.run(action, sideData);
    await this.save(action.context);
    return processResponse;
  }

  public async save(context: IActionContext): SafePromise<undefined, never> {
    const summary: SummaryCache | undefined = context.get(KeyCacheSummaries.summaries);
    if (summary === undefined) {
      return result();
    }
    const obj = Object.fromEntries(summary);
    const jsonObject: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const nestedObject = Object.fromEntries(value);
      const nestedJson = Object.fromEntries(Object.entries(nestedObject).map(([nestedKey, value]) => {
        return [nestedKey, value.toJson()]
      }));
      jsonObject[key] = nestedJson;
    }
    if (this.destination.type === DestinationType.LOCAL_STORAGE) {
      this.saveToLocalStorage(jsonObject);
    } else {
      await this.saveToFile(jsonObject, this.destination.filepath);
    }
    return result();
  }

  /* istanbul ignore next */
  private saveToLocalStorage(jsonObject: Record<string, any>): void {
    localStorage.setItem(ActorQueryProcessPostProcessStoreSummaries.LOCAL_STORATE_KEY, JSON.stringify(jsonObject));
  }

  /* istanbul ignore next */
  private async saveToFile(jsonObject: Record<string, any>, filepath: string): Promise<void> {
    const fs = await import("node:fs/promises");
    await fs.writeFile(filepath, JSON.stringify(jsonObject));
  }
}

export interface IActorQueryProcessPostProcessStoreSummariesArgs
  extends IActorArgs<IActionQueryProcess, IActorTest, IActorQueryProcessOutput> {
  nestedQueryProcess: ActorQueryProcess,
  destination: Destination
}

type Destination = { type: DestinationType.LOCAL_STORAGE } | { type: DestinationType.FILE, filepath: string };

export enum DestinationType {
  FILE,
  LOCAL_STORAGE
}

