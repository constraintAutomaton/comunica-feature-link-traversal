import { ActionContext, Bus } from '@comunica/core';
import { ActorQueryProcessPostProcessStoreSummaries, DestinationType } from '../lib/ActorQueryProcessPostProcessStoreSummaries';
import { KeyCacheSummaries, KeysInitQueryLTQP } from '@comunica/context-entries-link-traversal';
import { IActionQueryProcess } from '@comunica/bus-query-process';
import '@comunica/utils-jest';
import { SummaryCache } from '@comunica/types-link-traversal';
import { ActorExtractLinksShapeIndex, IShapeIndex } from '../../actor-extract-links-shape-index/lib/ActorExtractLinksShapeIndex';
import { ShapeIndexSummary } from '../../actor-extract-links-shape-index/lib/ShapeIndexSummary';
import { Shape } from "query-shape-detection";
import { result } from 'result-interface';

describe('ActorQueryProcessPostProcessStoreSummaries', () => {
  let bus: any;

  const a_shape_index: IShapeIndex = {
    isComplete: true,
    subweb: /abc/,
    entries: new Map([
      ["bar", {
        isAContainer: false,
        iri: "foo",
        shape: new Shape({ name: "bar", positivePredicates: ['a', { name: "b" }] })
      }],
      ["foo", {
        isAContainer: false,
        iri: "foo",
        shape: new Shape({ name: "far", positivePredicates: ['c', { name: "d" }] })
      }]
    ])
  }

  const another_shape_index: IShapeIndex = {
    isComplete: false,
    subweb: /abc/,
    entries: new Map([
      ["bar", {
        isAContainer: false,
        iri: "foo",
        shape: new Shape({ name: "bar", positivePredicates: ['a', { name: "b" }] })
      }],
      ["foo", {
        isAContainer: false,
        iri: "foo",
        shape: new Shape({ name: "far", positivePredicates: ['c', { name: "d" }] })
      }]
    ])
  }

  const summaryCache: SummaryCache = new Map([
    [ActorExtractLinksShapeIndex.SHAPE_INDEX_SUMMARY_METHOD_LABEL, new Map([
      ["foo", new ShapeIndexSummary(a_shape_index)],
      ["foo", new ShapeIndexSummary(another_shape_index)],
    ])],
    ["other index", new Map([
      ["foo", new ShapeIndexSummary(a_shape_index)],
      ["foo", new ShapeIndexSummary(another_shape_index)],
    ])]
  ]);

  describe("test", () => {
    beforeEach(() => {
      bus = new Bus({ name: 'bus' });
    });

    it(`should pass when ${KeysInitQueryLTQP.materializedSummaries.name} is set to true`, async () => {
      const action = {
        context: new ActionContext({
          [KeysInitQueryLTQP.materializedSummaries.name]: true
        })
      }
      const actor = new ActorQueryProcessPostProcessStoreSummaries({
        name: "actor",
        bus,
        destination: {
          type: DestinationType.LOCAL_STORAGE
        },
        nestedQueryProcess: <any>jest.fn()
      });
      expect(await actor.test(<any>action)).toPassTestVoid();
    });

    it(`should fail when ${KeysInitQueryLTQP.materializedSummaries.name} is set to false`, async () => {
      const action = {
        context: new ActionContext({
          [KeysInitQueryLTQP.materializedSummaries.name]: false
        })
      }
      const actor = new ActorQueryProcessPostProcessStoreSummaries({
        name: "actor",
        bus,
        destination: {
          type: DestinationType.LOCAL_STORAGE
        },
        nestedQueryProcess: <any>jest.fn()
      });
      expect(await actor.test(<any>action)).toFailTest(`${KeysInitQueryLTQP.materializedSummaries} is set to not be materialized the summaries`);
    });

    it(`should fail when ${KeysInitQueryLTQP.materializedSummaries.name} does not exist`, async () => {
      const action = {
        context: new ActionContext({
        })
      }
      const actor = new ActorQueryProcessPostProcessStoreSummaries({
        name: "actor",
        bus,
        destination: {
          type: DestinationType.LOCAL_STORAGE
        },
        nestedQueryProcess: <any>jest.fn()
      });
      expect(await actor.test(<any>action)).toFailTest(`${KeysInitQueryLTQP.materializedSummaries} is not in the context`);
    });
  });

  describe("save", () => {
    beforeEach(() => {
      bus = new Bus({ name: 'bus' });
    });

    it("should save a context with no summary", async () => {
      const actor = new ActorQueryProcessPostProcessStoreSummaries({
        name: "actor",
        bus,
        destination: {
          type: DestinationType.LOCAL_STORAGE
        },
        nestedQueryProcess: <any>jest.fn()
      });

      const saveLocalSpy = jest.spyOn(<any>actor, "saveToLocalStorage");
      const saveFileSpy = jest.spyOn(<any>actor, "saveToFile");
      const context = new ActionContext({});

      await actor.save(context);

      expect(saveFileSpy).not.toHaveBeenCalled();
      expect(saveLocalSpy).not.toHaveBeenCalled();
    });

    it("should save to file the summaries in the context", async () => {
      const actor = new ActorQueryProcessPostProcessStoreSummaries({
        name: "actor",
        bus,
        destination: {
          type: DestinationType.FILE,
          filepath: "foo"
        },
        nestedQueryProcess: <any>jest.fn()
      });

      jest.spyOn(<any>actor, "saveToLocalStorage").mockReturnValue(undefined);
      jest.spyOn(<any>actor, "saveToFile").mockResolvedValue(undefined);
      const context = new ActionContext({
        [KeyCacheSummaries.summaries.name]: summaryCache
      });

      await actor.save(context);

      expect((<any>actor).saveToFile).toHaveBeenCalledTimes(1);
      // will need to be changed to be more thorough
      expect((<any>actor).saveToFile).toHaveBeenLastCalledWith(expect.any(Object), "foo")
      expect((<any>actor).saveToLocalStorage).not.toHaveBeenCalled();
    });

    it("should save to local storage the summaries in the context", async () => {
      const actor = new ActorQueryProcessPostProcessStoreSummaries({
        name: "actor",
        bus,
        destination: {
          type: DestinationType.LOCAL_STORAGE,
        },
        nestedQueryProcess: <any>jest.fn()
      });

      jest.spyOn(<any>actor, "saveToLocalStorage").mockReturnValue(undefined);
      jest.spyOn(<any>actor, "saveToFile").mockResolvedValue(undefined);

      const context = new ActionContext({
        [KeyCacheSummaries.summaries.name]: summaryCache
      });

      await actor.save(context);

      expect((<any>actor).saveToLocalStorage).toHaveBeenCalledTimes(1);
      // will need to be changed to be more thorough
      expect((<any>actor).saveToLocalStorage).toHaveBeenLastCalledWith(expect.any(Object))
      expect((<any>actor).saveToFile).not.toHaveBeenCalled();
    });
  });

  describe("run", () => {

    beforeEach(() => {
      bus = new Bus({ name: 'bus' });
    });

    it("should run the nested process nad the save process with the modified context", () => {
      const nestedQueryProcess: any = {
        run:(action: IActionQueryProcess) => {
          action.context = action.context.set(KeyCacheSummaries.summaries, summaryCache);
        }
      }
      
      const action: any = {
        context: new ActionContext({
          [KeysInitQueryLTQP.materializedSummaries.name]: false
        })
      }
      const actor = new ActorQueryProcessPostProcessStoreSummaries({
        name: "actor",
        bus,
        destination: {
          type: DestinationType.LOCAL_STORAGE
        },
        nestedQueryProcess
      });

      const expectedContext = new ActionContext({
        [KeysInitQueryLTQP.materializedSummaries.name]: false,
        [KeyCacheSummaries.summaries.name]: summaryCache
      })
      jest.spyOn(actor, "save").mockResolvedValueOnce(result())
      actor.run(action, undefined);

      expect(actor.save).toHaveBeenCalledTimes(1);
      expect(actor.save).toHaveBeenLastCalledWith(expectedContext);
    });
  });

});