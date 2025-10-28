import type { Actor, IAction, IActorOutput, IActorReply, IActorTest, IMediatorArgs, TestResult } from '@comunica/core';
import { Mediator } from '@comunica/core';
import { AsyncIterator, wrap } from 'asynciterator';
import { EventEmitter } from "events";
import { Readable } from "stream";
import { PassThrough } from 'stream';

EventEmitter.defaultMaxListeners = 20;

class EventEmitterReadable extends Readable {
  constructor(private emitter: EventEmitter, private eventName: string) {
    super({ objectMode: true });
    emitter.on(eventName, (data) => this.push(data));
    emitter.on("end", () => this.push(null));
  }
  override _read() {} // no-op
}

/**
 * A comunica mediator that concatenates an array of all actor results.
 *
 * The actors that are registered first will appear earlier in the array.
 */
export class MediatorCombineArray<
  A extends Actor<I, T, O, TS>,
I extends IAction,
T extends IActorTest,
O extends IActorOutput,
TS = undefined,
> extends Mediator<A, I, T, O, TS> implements IMediatorCombineUnionArgs<A, I, T, O, TS> {
  public readonly filterErrors: boolean | undefined;
  public readonly fields: string[];
  public readonly combiner: (results: O[]) => O;

  public constructor(args: IMediatorCombineUnionArgs<A, I, T, O, TS>) {
    super(args);
    this.combiner = this.createCombiner();
  }

  public override async mediate(action: I): Promise<O> {
    let testResults: IActorReply<A, I, T, O, TS>[];
    try {
      testResults = this.publish(action);
    } catch {
      testResults = [];
    }

    const passthroughs:PassThrough[] = [];
    const metadataIterators: AsyncIterator<any>[] = [];

    if((<any>action).metadata && (<any>action).metadata.clone){
      
      for(const _ of testResults){
        const passthrough = new PassThrough({ objectMode: true });
        const iterator = wrap(passthrough, {autoStart:false});
        metadataIterators.push(iterator);
        passthroughs.push(passthrough);
      }
      (<any>action).metadata.on("data", (quad:any)=>{
        for(const passthrough of passthroughs){
          passthrough.write(quad);
        }
      });
      (<any>action).metadata.on("end", ()=>{
        for(const passthrough of passthroughs){
          passthrough.end();
        }
      })
    }
    
    if (this.filterErrors) {
      const _testResults: IActorReply<A, I, T, O, TS>[] = [];
      for (const result of testResults) {
        const reply = await result.reply;
        if (reply.isPassed()) {
          _testResults.push(result);
        }
      }
      testResults = _testResults;
    }

    // Delegate reply errors.
    const sideDatas: (TS | undefined)[] = [];
    await Promise.all(testResults.map(async({ reply }, i) => {
      const awaited = (await reply);
      const value = awaited.getOrThrow();
      sideDatas[i] = awaited.getSideData();
      return value;
    }));

    // Run action on all actors.
    const results: O[] = await Promise.all(testResults
      .map((result, i) => {
        if((<any>action).metadata && (<any>action).metadata.clone){
          return result.actor.runObservable({...action, metadata:metadataIterators[i]}, sideDatas[i]!);
        }
        return result.actor.runObservable(action, sideDatas[i]!);
      }));

    // Return the combined results.
    return this.combiner(results);
  }

  protected override mediateWith(): Promise<TestResult<any, TS>> {
    throw new Error('Method not supported.');
  }

  protected createCombiner(): (results: O[]) => O {
    return (results: O[]) => {
      const data: any = {};
      for (const field of this.fields) {
        data[field] = [];
        // eslint-disable-next-line unicorn/prefer-spread
        for (const value of [[]].concat(results.map((result: any) => result[field]))) {
          if (value) {
            data[field].push(...value);
          }
        }
      }
      return data;
    };
  }
}

export interface IMediatorCombineUnionArgs<
  A extends Actor<I, T, O, TS>,
I extends IAction,
T extends IActorTest,
O extends IActorOutput,
TS = undefined,
> extends IMediatorArgs<A, I, T, O, TS> {
  /**
   * If actors that throw test errors should be ignored
   */
  filterErrors?: boolean;
  /**
   * The field names of the test result fields over which must be mediated.
   */
  fields: string[];
}
