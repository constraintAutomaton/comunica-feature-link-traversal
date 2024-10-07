import { ArrayIterator, UnionIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { QuerySourceReasoning } from '../lib/QuerySourceReasoning';
import '@comunica/jest';
import 'jest-rdf';

const DF = new DataFactory();

describe('QuerySourceReasoning', () => {
  describe('getSelectorShape', () => {
    it('should provid the selector shape', async() => {
      const innerSource = {
        getSelectorShape: jest.fn().mockReturnValueOnce('foo'),
      };
      const sourceId = 'bar';
      const implicitQuadStore = jest.fn();
      const queryEngine = jest.fn();
      const rules = undefined;
      const querySource = new QuerySourceReasoning(
                <any>innerSource,
                sourceId,
                <any>implicitQuadStore,
                <any>queryEngine,
                <any>rules,
      );
      const context = jest.fn();

      await expect(querySource.getSelectorShape(<any>context)).resolves.toBe('foo');
    });
  });

  describe('queryBindings', () => {
    it('should provide a stream with inner source binding given the implicit store is empty', () => {
      const innersourceResp = new ArrayIterator([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.blankNode('o1')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.blankNode('o2')),
      ], { autoStart: false });
      const implicitStoreResp = new ArrayIterator<any>([], { autoStart: false });

      const innerSource = {
        queryBindings: jest.fn().mockReturnValueOnce(innersourceResp),
      };
      const sourceId = 'bar';
      const implicitQuadStore = jest.fn();
      const queryEngine = {
        queryBindings: jest.fn().mockReturnValueOnce(implicitStoreResp),
      };
      const rules = undefined;
      const querySource = new QuerySourceReasoning(
                <any>innerSource,
                sourceId,
                <any>implicitQuadStore,
                <any>queryEngine,
                <any>rules,
      );
      const context = jest.fn();
      const operation = jest.fn();

      const expectedResp = new UnionIterator([ innersourceResp, implicitStoreResp ], { autoStart: false });

      expect(querySource.queryBindings(<any>operation, <any>context, undefined)).toStrictEqual(expectedResp);
    });

    it(
      'should provide a stream with the inner source and implicit store bindings with an non-empty implicit store'
      , () => {
        const innersourceResp = new ArrayIterator([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.blankNode('o1')),
          DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.blankNode('o2')),
        ], { autoStart: false });
        const implicitStoreResp = new ArrayIterator([
          DF.quad(DF.namedNode('s2'), DF.namedNode('p45'), DF.blankNode('o41')),

        ], { autoStart: false });

        const innerSource = {
          queryBindings: jest.fn().mockReturnValueOnce(innersourceResp),
        };
        const sourceId = 'bar';
        const implicitQuadStore = jest.fn();
        const queryEngine = {
          queryBindings: jest.fn().mockReturnValueOnce(implicitStoreResp),
        };
        const rules = undefined;
        const querySource = new QuerySourceReasoning(
                    <any>innerSource,
                    sourceId,
                    <any>implicitQuadStore,
                    <any>queryEngine,
                    <any>rules,
        );
        const context = jest.fn();
        const operation = jest.fn();

        const expectedResp = new UnionIterator([ innersourceResp, implicitStoreResp ], { autoStart: false });

        expect(querySource.queryBindings(<any>operation, <any>context, undefined)).toStrictEqual(expectedResp);
      },
    );

    it('should throw given options are provided', () => {
      const innersourceResp = new ArrayIterator([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.blankNode('o1')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.blankNode('o2')),
      ], { autoStart: false });
      const implicitStoreResp = new ArrayIterator([
        DF.quad(DF.namedNode('s2'), DF.namedNode('p45'), DF.blankNode('o41')),

      ], { autoStart: false });

      const innerSource = {
        queryBindings: jest.fn().mockReturnValueOnce(innersourceResp),
      };
      const sourceId = 'bar';
      const implicitQuadStore = jest.fn();
      const queryEngine = {
        queryBindings: jest.fn().mockReturnValueOnce(implicitStoreResp),
      };
      const rules = undefined;
      const querySource = new QuerySourceReasoning(
                <any>innerSource,
                sourceId,
                <any>implicitQuadStore,
                <any>queryEngine,
                <any>rules,
      );
      const context = jest.fn();
      const operation = jest.fn();

      expect(() => querySource.queryBindings(<any>operation, <any>context, {}))
        .toThrow('options in queryBindings are not supported in QuerySourceReasoning');
    });
  });

  describe('queryBoolean', () => {
    it('should return true given the inner source has respect the query and the implicit store does not', async() => {
      const innerSource = {
        queryBoolean: jest.fn().mockResolvedValueOnce(true),
      };
      const sourceId = 'bar';
      const implicitQuadStore = jest.fn();
      const queryEngine = {
        queryBoolean: jest.fn().mockResolvedValueOnce(false),
      };
      const rules = undefined;
      const querySource = new QuerySourceReasoning(
                <any>innerSource,
                sourceId,
                <any>implicitQuadStore,
                <any>queryEngine,
                <any>rules,
      );
      const context = jest.fn();
      const operation = jest.fn();

      const expectedResp = true;

      await expect(querySource.queryBoolean(<any>operation, <any>context)).resolves.toStrictEqual(expectedResp);
    });

    it('should return true given the inner source and the implicit store respect the query', async() => {
      const innerSource = {
        queryBoolean: jest.fn().mockResolvedValueOnce(true),
      };
      const sourceId = 'bar';
      const implicitQuadStore = jest.fn();
      const queryEngine = {
        queryBoolean: jest.fn().mockResolvedValueOnce(true),
      };
      const rules = undefined;
      const querySource = new QuerySourceReasoning(
                <any>innerSource,
                sourceId,
                <any>implicitQuadStore,
                <any>queryEngine,
                <any>rules,
      );
      const context = jest.fn();
      const operation = jest.fn();

      const expectedResp = true;

      await expect(querySource.queryBoolean(<any>operation, <any>context)).resolves.toStrictEqual(expectedResp);
    });

    it('should return true given only the implicit store respect the query', async() => {
      const innerSource = {
        queryBoolean: jest.fn().mockResolvedValueOnce(false),
      };
      const sourceId = 'bar';
      const implicitQuadStore = jest.fn();
      const queryEngine = {
        queryBoolean: jest.fn().mockResolvedValueOnce(true),
      };
      const rules = undefined;
      const querySource = new QuerySourceReasoning(
                <any>innerSource,
                sourceId,
                <any>implicitQuadStore,
                <any>queryEngine,
                <any>rules,
      );
      const context = jest.fn();
      const operation = jest.fn();

      const expectedResp = true;

      await expect(querySource.queryBoolean(<any>operation, <any>context)).resolves.toStrictEqual(expectedResp);
    });

    it('should return false given no store respect the query', async() => {
      const innerSource = {
        queryBoolean: jest.fn().mockResolvedValueOnce(false),
      };
      const sourceId = 'bar';
      const implicitQuadStore = jest.fn();
      const queryEngine = {
        queryBoolean: jest.fn().mockResolvedValueOnce(false),
      };
      const rules = undefined;
      const querySource = new QuerySourceReasoning(
                <any>innerSource,
                sourceId,
                <any>implicitQuadStore,
                <any>queryEngine,
                <any>rules,
      );
      const context = jest.fn();
      const operation = jest.fn();

      const expectedResp = false;

      await expect(querySource.queryBoolean(<any>operation, <any>context)).resolves.toStrictEqual(expectedResp);
    });
  });

  describe('queryQuads', () => {
    it('should provide a stream with inner source quads given the implicit store is empty', () => {
      const innersourceResp = new ArrayIterator([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.blankNode('o1')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.blankNode('o2')),
      ], { autoStart: false });
      const implicitStoreResp = new ArrayIterator<any>([], { autoStart: false });

      const innerSource = {
        queryQuads: jest.fn().mockReturnValueOnce(innersourceResp),
      };
      const sourceId = 'bar';
      const implicitQuadStore = jest.fn();
      const queryEngine = {
        queryQuads: jest.fn().mockReturnValueOnce(implicitStoreResp),
      };
      const rules = undefined;
      const querySource = new QuerySourceReasoning(
                <any>innerSource,
                sourceId,
                <any>implicitQuadStore,
                <any>queryEngine,
                <any>rules,
      );
      const context = jest.fn();
      const operation = jest.fn();

      const expectedResp = new UnionIterator([ innersourceResp, implicitStoreResp ], { autoStart: false });

      expect(querySource.queryQuads(<any>operation, <any>context)).toStrictEqual(expectedResp);
    });

    it('should provide a stream with inner source and implicit store quads with an non-empty implicit store', () => {
      const innersourceResp = new ArrayIterator([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.blankNode('o1')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.blankNode('o2')),
      ], { autoStart: false });
      const implicitStoreResp = new ArrayIterator([
        DF.quad(DF.namedNode('s2'), DF.namedNode('p45'), DF.blankNode('o41')),

      ], { autoStart: false });

      const innerSource = {
        queryQuads: jest.fn().mockReturnValueOnce(innersourceResp),
      };
      const sourceId = 'bar';
      const implicitQuadStore = jest.fn();
      const queryEngine = {
        queryQuads: jest.fn().mockReturnValueOnce(implicitStoreResp),
      };
      const rules = undefined;
      const querySource = new QuerySourceReasoning(
                <any>innerSource,
                sourceId,
                <any>implicitQuadStore,
                <any>queryEngine,
                <any>rules,
      );
      const context = jest.fn();
      const operation = jest.fn();

      const expectedResp = new UnionIterator([ innersourceResp, implicitStoreResp ], { autoStart: false });

      expect(querySource.queryQuads(<any>operation, <any>context)).toStrictEqual(expectedResp);
    });
  });

  describe('queryVoid', () => {
    it('should throw', () => {
      const innerSource = jest.fn();
      const sourceId = 'bar';
      const implicitQuadStore = jest.fn();
      const queryEngine = jest.fn();
      const rules = undefined;
      const querySource = new QuerySourceReasoning(
                <any>innerSource,
                sourceId,
                <any>implicitQuadStore,
                <any>queryEngine,
                <any>rules,
      );

      expect(() => querySource.queryVoid()).toThrow('queryVoid is not implemented in QuerySourceReasoning');
    });
  });

  describe('referenceValue', () => {
    it('should get the reference value', () => {
      const innerSource = {
        referenceValue: 'foo',
      };
      const sourceId = 'bar';
      const implicitQuadStore = jest.fn();
      const queryEngine = jest.fn();
      const rules = undefined;
      const querySource = new QuerySourceReasoning(
                <any>innerSource,
                sourceId,
                <any>implicitQuadStore,
                <any>queryEngine,
                <any>rules,
      );

      expect(querySource.referenceValue).toBe('foo');
    });
  });

  describe('toString', () => {
    it('should transform to string', () => {
      const innerSource = {
        constructor: {
          name: 'foo',
        },
      };
      const sourceId = 'bar';
      const implicitQuadStore = jest.fn();
      const queryEngine = jest.fn();
      const rules = undefined;
      const querySource = new QuerySourceReasoning(
                <any>innerSource,
                sourceId,
                <any>implicitQuadStore,
                <any>queryEngine,
                <any>rules,
      );

      expect(querySource.toString()).toBe('QuerySourceReasoning(foo)');
    });
  });
});
