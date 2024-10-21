import { ArrayIterator, UnionIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { QuerySourceReasoning } from '../lib/QuerySourceReasoning';
import '@comunica/jest';
import { Operator } from '../lib/Rules';

const DF = new DataFactory();

describe('QuerySourceReasoning', () => {
  describe('constructor', () => {
    it('should construct when their is no rules', () => {
      const innerSource = {};
      const sourceId = 'bar';
      const implicitQuadStore = jest.fn();
      const queryEngine = jest.fn();
      const rules = new Map();
      const querySource = new QuerySourceReasoning(
        <any>innerSource,
        sourceId,
        <any>implicitQuadStore,
        <any>queryEngine,
        <any>rules,
      );

      expect(querySource.rules.rules).toHaveLength(0);
    });

    it('should construct when no rules apply for the query source', () => {
      const referenceValue = 'iri';
      const rule = [
        DF.quad(DF.blankNode(), DF.namedNode('bar'), DF.blankNode()),
        DF.quad(DF.blankNode(), DF.namedNode('boo'), DF.literal('abc')),
        DF.quad(DF.namedNode('sFoo'), DF.namedNode(Operator.SAME_AS), DF.namedNode('oFoo')),
        DF.quad(DF.namedNode('sBar'), DF.namedNode(Operator.SAME_AS), DF.namedNode('oBar')),
      ];
      const innerSource = {
        referenceValue,
      };
      const sourceId = 'bar';
      const implicitQuadStore = jest.fn();
      const queryEngine = jest.fn();
      const rules = new Map([[ 'abc', rule ]]);
      const querySource = new QuerySourceReasoning(
        <any>innerSource,
        sourceId,
        <any>implicitQuadStore,
        <any>queryEngine,
        <any>rules,
      );

      expect(querySource.rules.rules).toHaveLength(0);
    });

    it('should construct when the rules are for an IRI', () => {
      const referenceValue = 'iri';
      const rule = [
        DF.quad(DF.blankNode(), DF.namedNode('bar'), DF.blankNode()),
        DF.quad(DF.blankNode(), DF.namedNode('boo'), DF.literal('abc')),
        DF.quad(DF.namedNode('sFoo'), DF.namedNode(Operator.SAME_AS), DF.namedNode('oFoo')),
        DF.quad(DF.namedNode('sBar'), DF.namedNode(Operator.SAME_AS), DF.namedNode('oBar')),
      ];
      const innerSource = {
        referenceValue,
      };
      const sourceId = 'bar';
      const implicitQuadStore = jest.fn();
      const queryEngine = jest.fn();
      const rules = new Map([[ referenceValue, rule ]]);
      const querySource = new QuerySourceReasoning(
        <any>innerSource,
        sourceId,
        <any>implicitQuadStore,
        <any>queryEngine,
        <any>rules,
      );

      expect(querySource.rules.rules).toHaveLength(2);
      expect(querySource.rules.rules[0].premise).toStrictEqual(DF.namedNode('sFoo'));
      expect(querySource.rules.rules[0].operator).toStrictEqual(Operator.SAME_AS);
      expect(querySource.rules.rules[0].conclusion).toStrictEqual(DF.namedNode('oFoo'));

      expect(querySource.rules.rules[1].premise).toStrictEqual(DF.namedNode('sBar'));
      expect(querySource.rules.rules[1].operator).toStrictEqual(Operator.SAME_AS);
      expect(querySource.rules.rules[1].conclusion).toStrictEqual(DF.namedNode('oBar'));
    });

    it('should construct when the rules are for every data source', () => {
      const referenceValue = 'iri';
      const rule = [
        DF.quad(DF.blankNode(), DF.namedNode('bar'), DF.blankNode()),
        DF.quad(DF.blankNode(), DF.namedNode('boo'), DF.literal('abc')),
        DF.quad(DF.namedNode('sFoo'), DF.namedNode(Operator.SAME_AS), DF.namedNode('oFoo')),
        DF.quad(DF.namedNode('sBar'), DF.namedNode(Operator.SAME_AS), DF.namedNode('oBar')),
      ];
      const innerSource = {
        referenceValue,
      };
      const sourceId = 'bar';
      const implicitQuadStore = jest.fn();
      const queryEngine = jest.fn();
      const rules = new Map([[ '*', rule ]]);
      const querySource = new QuerySourceReasoning(
        <any>innerSource,
        sourceId,
        <any>implicitQuadStore,
        <any>queryEngine,
        <any>rules,
      );

      expect(querySource.rules.rules).toHaveLength(2);
      expect(querySource.rules.rules[0].premise).toStrictEqual(DF.namedNode('sFoo'));
      expect(querySource.rules.rules[0].operator).toStrictEqual(Operator.SAME_AS);
      expect(querySource.rules.rules[0].conclusion).toStrictEqual(DF.namedNode('oFoo'));

      expect(querySource.rules.rules[1].premise).toStrictEqual(DF.namedNode('sBar'));
      expect(querySource.rules.rules[1].operator).toStrictEqual(Operator.SAME_AS);
      expect(querySource.rules.rules[1].conclusion).toStrictEqual(DF.namedNode('oBar'));
    });

    it('should construct when the rules are for a data source', () => {
      const referenceValue = jest.fn();
      const rule = [
        DF.quad(DF.blankNode(), DF.namedNode('bar'), DF.blankNode()),
        DF.quad(DF.blankNode(), DF.namedNode('boo'), DF.literal('abc')),
        DF.quad(DF.namedNode('sFoo'), DF.namedNode(Operator.SAME_AS), DF.namedNode('oFoo')),
        DF.quad(DF.namedNode('sBar'), DF.namedNode(Operator.SAME_AS), DF.namedNode('oBar')),
      ];
      const innerSource = {
        referenceValue,
      };
      const sourceId = 'bar';
      const implicitQuadStore = jest.fn();
      const queryEngine = jest.fn();
      const rules = new Map([[ referenceValue, rule ]]);
      const querySource = new QuerySourceReasoning(
        <any>innerSource,
        sourceId,
        <any>implicitQuadStore,
        <any>queryEngine,
        <any>rules,
      );

      expect(querySource.rules.rules).toHaveLength(2);
      expect(querySource.rules.rules[0].premise).toStrictEqual(DF.namedNode('sFoo'));
      expect(querySource.rules.rules[0].operator).toStrictEqual(Operator.SAME_AS);
      expect(querySource.rules.rules[0].conclusion).toStrictEqual(DF.namedNode('oFoo'));

      expect(querySource.rules.rules[1].premise).toStrictEqual(DF.namedNode('sBar'));
      expect(querySource.rules.rules[1].operator).toStrictEqual(Operator.SAME_AS);
      expect(querySource.rules.rules[1].conclusion).toStrictEqual(DF.namedNode('oBar'));
    });

    it('should construct when multiple rules apply', () => {
      const referenceValue: any = jest.fn();
      const ruleAll = [
        DF.quad(DF.blankNode(), DF.namedNode('boo'), DF.literal('abc')),
        DF.quad(DF.namedNode('sBar'), DF.namedNode(Operator.SAME_AS), DF.namedNode('oBar')),
      ];
      const ruleDirect = [
        DF.quad(DF.blankNode(), DF.namedNode('bar'), DF.blankNode()),
        DF.quad(DF.namedNode('sFoo'), DF.namedNode(Operator.SAME_AS), DF.namedNode('oFoo')),
      ];

      const innerSource = {
        referenceValue,
      };
      const sourceId = 'bar';
      const implicitQuadStore = jest.fn();
      const queryEngine = jest.fn();
      const rules = new Map([[ referenceValue, ruleDirect ], [ '*', ruleAll ]]);
      const querySource = new QuerySourceReasoning(
        <any>innerSource,
        sourceId,
        <any>implicitQuadStore,
        <any>queryEngine,
        <any>rules,
      );

      expect(querySource.rules.rules).toHaveLength(2);

      expect(querySource.rules.rules[0].premise).toStrictEqual(DF.namedNode('sBar'));
      expect(querySource.rules.rules[0].operator).toStrictEqual(Operator.SAME_AS);
      expect(querySource.rules.rules[0].conclusion).toStrictEqual(DF.namedNode('oBar'));

      expect(querySource.rules.rules[1].premise).toStrictEqual(DF.namedNode('sFoo'));
      expect(querySource.rules.rules[1].operator).toStrictEqual(Operator.SAME_AS);
      expect(querySource.rules.rules[1].conclusion).toStrictEqual(DF.namedNode('oFoo'));
    });

    it('should construct when multiple rules with URI template apply', () => {
      const referenceValue: any = 'http://example.com/fred/foo';
      const ruleDirect = [
        DF.quad(DF.blankNode(), DF.namedNode('boo'), DF.literal('abc')),
        DF.quad(DF.namedNode('sBar'), DF.namedNode(Operator.SAME_AS), DF.namedNode('oBar')),
      ];
      const ruleTemplate = [
        DF.quad(DF.blankNode(), DF.namedNode('bar'), DF.blankNode()),
        DF.quad(DF.namedNode('sFoo'), DF.namedNode(Operator.SAME_AS), DF.namedNode('oFoo')),
      ];

      const innerSource = {
        referenceValue,
      };
      const sourceId = 'bar';
      const implicitQuadStore = jest.fn();
      const queryEngine = jest.fn();
      const rules = new Map([[ 'http://example.com/{name}/{directory}', ruleTemplate ], [ 'http://example.com/fred/foo', ruleDirect ]]);
      const querySource = new QuerySourceReasoning(
        <any>innerSource,
        sourceId,
        <any>implicitQuadStore,
        <any>queryEngine,
        <any>rules,
      );

      expect(querySource.rules.rules).toHaveLength(2);

      expect(querySource.rules.rules[0].premise).toStrictEqual(DF.namedNode('sFoo'));
      expect(querySource.rules.rules[0].operator).toStrictEqual(Operator.SAME_AS);
      expect(querySource.rules.rules[0].conclusion).toStrictEqual(DF.namedNode('oFoo'));

      expect(querySource.rules.rules[1].premise).toStrictEqual(DF.namedNode('sBar'));
      expect(querySource.rules.rules[1].operator).toStrictEqual(Operator.SAME_AS);
      expect(querySource.rules.rules[1].conclusion).toStrictEqual(DF.namedNode('oBar'));
    });
  });

  describe('updateImplicitStore', () => {
    it('should generate no implicit quads given no rules are provided', async() => {
      const innerSource = {
        queryQuads: jest.fn().mockReturnValueOnce(new ArrayIterator([], { autoStart: false })),
      };
      const sourceId = 'bar';
      const implicitQuadStore = {
        import: jest.fn(),
      };
      const queryEngine = jest.fn();
      const context: any = jest.fn();
      const rules = new Map();
      const querySource = new QuerySourceReasoning(
        <any>innerSource,
        sourceId,
        <any>implicitQuadStore,
        <any>queryEngine,
        <any>rules,
      );

      await querySource.updateImplicitStore(context);

      expect(implicitQuadStore.import).toHaveBeenCalledTimes(1);
      const expectedIt = new ArrayIterator([], { autoStart: false });

      expect(implicitQuadStore.import).toHaveBeenNthCalledWith(1, expectedIt);
    });

    it('should generate no implicit quads given rules and an empty inner source', async() => {
      const referenceValue: any = jest.fn();
      const ruleAll = [
        DF.quad(DF.blankNode(), DF.namedNode('boo'), DF.literal('abc')),
        DF.quad(DF.namedNode('sBar'), DF.namedNode(Operator.SAME_AS), DF.namedNode('oBar')),
      ];
      const innerSource = {
        queryQuads: jest.fn().mockReturnValueOnce(new ArrayIterator()),
        referenceValue,
      };
      const sourceId = 'bar';
      const implicitQuadStore = {
        import: jest.fn(),
      };
      const queryEngine = jest.fn();
      const context: any = jest.fn();
      const rules = new Map([[ '*', ruleAll ]]);
      const querySource = new QuerySourceReasoning(
        <any>innerSource,
        sourceId,
        <any>implicitQuadStore,
        <any>queryEngine,
        <any>rules,
      );

      await querySource.updateImplicitStore(context);

      expect(implicitQuadStore.import).toHaveBeenCalledTimes(1);
      const expectedIt = new ArrayIterator([], { autoStart: false });
      expect(implicitQuadStore.import).toHaveBeenNthCalledWith(1, expectedIt);
    });

    it('should generate no implicit quads given rules and an inner source with no quads related to the rules', async() => {
      const referenceValue: any = jest.fn();
      const ruleAll = [
        DF.quad(DF.blankNode(), DF.namedNode('boo'), DF.literal('abc')),
        DF.quad(DF.namedNode('sBar'), DF.namedNode(Operator.SAME_AS), DF.namedNode('oBar')),
      ];

      const quads = [
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
        DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.namedNode('o3')),
      ];

      const innerSource = {
        queryQuads: jest.fn().mockReturnValueOnce(new ArrayIterator(quads, { autoStart: false })),
        referenceValue,
      };
      const sourceId = 'bar';
      const implicitQuadStore = {
        import: jest.fn(),
      };
      const queryEngine = jest.fn();
      const context: any = jest.fn();
      const rules = new Map([[ '*', ruleAll ]]);
      const querySource = new QuerySourceReasoning(
        <any>innerSource,
        sourceId,
        <any>implicitQuadStore,
        <any>queryEngine,
        <any>rules,
      );

      await querySource.updateImplicitStore(context);

      expect(implicitQuadStore.import).toHaveBeenCalledTimes(1);
      const expectedIt = new ArrayIterator([], { autoStart: false });
      expect(implicitQuadStore.import).toHaveBeenNthCalledWith(1, expectedIt);
    });

    it('should generate an implicit quad given one rule', async() => {
      const referenceValue: any = jest.fn();
      const ruleAll = [
        DF.quad(DF.blankNode(), DF.namedNode('boo'), DF.literal('abc')),
        DF.quad(DF.namedNode('sBar'), DF.namedNode(Operator.SAME_AS), DF.namedNode('oBar')),
      ];

      const quads = [
        DF.quad(DF.namedNode('sBar'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
        DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.namedNode('o3')),
      ];

      const innerSource = {
        queryQuads: jest.fn().mockReturnValueOnce(new ArrayIterator(quads, { autoStart: false })),
        referenceValue,
      };
      const sourceId = 'bar';
      const implicitQuadStore = {
        import: jest.fn(),
      };
      const queryEngine = jest.fn();
      const context: any = jest.fn();
      const rules = new Map([[ '*', ruleAll ]]);
      const querySource = new QuerySourceReasoning(
        <any>innerSource,
        sourceId,
        <any>implicitQuadStore,
        <any>queryEngine,
        <any>rules,
      );
      const expectedImplicitQuads = [ DF.quad(DF.namedNode('oBar'), DF.namedNode('p1'), DF.namedNode('o1')) ];

      await querySource.updateImplicitStore(context);

      expect(implicitQuadStore.import).toHaveBeenCalledTimes(2);
      expect(implicitQuadStore.import)
        .toHaveBeenNthCalledWith(1, new ArrayIterator(expectedImplicitQuads, { autoStart: false }));
      expect(implicitQuadStore.import)
        .toHaveBeenNthCalledWith(2, new ArrayIterator([], { autoStart: false }));
    });

    it('should generate multiple implicit quads given one rule', async() => {
      const referenceValue: any = jest.fn();
      const ruleAll = [
        DF.quad(DF.blankNode(), DF.namedNode('boo'), DF.literal('abc')),
        DF.quad(DF.namedNode('sBar'), DF.namedNode(Operator.SAME_AS), DF.namedNode('oBar')),
      ];

      const quads = [
        DF.quad(DF.namedNode('sBar'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
        DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.namedNode('o3')),
        DF.quad(DF.namedNode('sBar'), DF.namedNode('p2'), DF.namedNode('o2')),
        DF.quad(DF.namedNode('sBar'), DF.namedNode('p3'), DF.namedNode('o3')),
      ];

      const innerSource = {
        queryQuads: jest.fn().mockReturnValueOnce(new ArrayIterator(quads, { autoStart: false })),
        referenceValue,
      };
      const sourceId = 'bar';
      const implicitQuadStore = {
        import: jest.fn(),
      };
      const queryEngine = jest.fn();
      const context: any = jest.fn();
      const rules = new Map([[ '*', ruleAll ]]);
      const querySource = new QuerySourceReasoning(
        <any>innerSource,
        sourceId,
        <any>implicitQuadStore,
        <any>queryEngine,
        <any>rules,
      );
      const expectedImplicitQuads = [
        DF.quad(DF.namedNode('oBar'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.namedNode('oBar'), DF.namedNode('p2'), DF.namedNode('o2')),
        DF.quad(DF.namedNode('oBar'), DF.namedNode('p3'), DF.namedNode('o3')),
      ];

      await querySource.updateImplicitStore(context);

      expect(implicitQuadStore.import).toHaveBeenCalledTimes(2);
      expect(implicitQuadStore.import)
        .toHaveBeenNthCalledWith(1, new ArrayIterator(expectedImplicitQuads, { autoStart: false }));
      expect(implicitQuadStore.import)
        .toHaveBeenNthCalledWith(2, new ArrayIterator([], { autoStart: false }));
    });

    it('should generate multiple implicit quads given multiple rules', async() => {
      const referenceValue: any = jest.fn();
      const ruleAll = [
        DF.quad(DF.blankNode(), DF.namedNode('boo'), DF.literal('abc')),
        DF.quad(DF.namedNode('sBar'), DF.namedNode(Operator.SAME_AS), DF.namedNode('oBar')),
        DF.quad(DF.namedNode('sBar1'), DF.namedNode(Operator.SAME_AS), DF.namedNode('oBar1')),
        DF.quad(DF.namedNode('sBar2'), DF.namedNode(Operator.SAME_AS), DF.namedNode('oBar2')),
      ];

      const quads = [
        DF.quad(DF.namedNode('sBar'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
        DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.namedNode('o3')),
        DF.quad(DF.namedNode('sBar'), DF.namedNode('p2'), DF.namedNode('o2')),
        DF.quad(DF.namedNode('sBar'), DF.namedNode('p3'), DF.namedNode('o3')),
        DF.quad(DF.namedNode('sBar2'), DF.namedNode('p1'), DF.namedNode('o1')),
      ];

      const innerSource = {
        queryQuads: jest.fn().mockReturnValueOnce(new ArrayIterator(quads, { autoStart: false })),
        referenceValue,
      };
      const sourceId = 'bar';
      const implicitQuadStore = {
        import: jest.fn(),
      };
      const queryEngine = jest.fn();
      const context: any = jest.fn();
      const rules = new Map([[ '*', ruleAll ]]);
      const querySource = new QuerySourceReasoning(
        <any>innerSource,
        sourceId,
        <any>implicitQuadStore,
        <any>queryEngine,
        <any>rules,
      );
      const expectedImplicitQuads = [
        DF.quad(DF.namedNode('oBar'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.namedNode('oBar'), DF.namedNode('p2'), DF.namedNode('o2')),
        DF.quad(DF.namedNode('oBar'), DF.namedNode('p3'), DF.namedNode('o3')),
        DF.quad(DF.namedNode('oBar2'), DF.namedNode('p1'), DF.namedNode('o1')),
      ];

      await querySource.updateImplicitStore(context);

      expect(implicitQuadStore.import).toHaveBeenCalledTimes(2);
      expect(implicitQuadStore.import)
        .toHaveBeenNthCalledWith(1, new ArrayIterator(expectedImplicitQuads, { autoStart: false }));
      expect(implicitQuadStore.import)
        .toHaveBeenNthCalledWith(2, new ArrayIterator([], { autoStart: false }));
    });

    it('should generate multiple implicit quads given dependent rules', async() => {
      const referenceValue: any = jest.fn();
      const ruleAll = [
        DF.quad(DF.blankNode(), DF.namedNode('boo'), DF.literal('abc')),
        DF.quad(DF.namedNode('sBar1'), DF.namedNode(Operator.SAME_AS), DF.namedNode('sBar2')),
        DF.quad(DF.namedNode('sBar2'), DF.namedNode(Operator.SAME_AS), DF.namedNode('sBar3')),
        DF.quad(DF.namedNode('sBar3'), DF.namedNode(Operator.SAME_AS), DF.namedNode('sBar4')),
      ];

      const quads = [
        DF.quad(DF.namedNode('s1'), DF.namedNode('sBar1'), DF.namedNode('o1')),
        DF.quad(DF.namedNode('s1'), DF.namedNode('sBar2'), DF.namedNode('o1')),
      ];

      const innerSource = {
        queryQuads: jest.fn().mockReturnValueOnce(new ArrayIterator(quads, { autoStart: false })),
        referenceValue,
      };
      const sourceId = 'bar';
      const implicitQuadStore = {
        import: jest.fn(),
      };
      const queryEngine = jest.fn();
      const context: any = jest.fn();
      const rules = new Map([[ '*', ruleAll ]]);
      const querySource = new QuerySourceReasoning(
        <any>innerSource,
        sourceId,
        <any>implicitQuadStore,
        <any>queryEngine,
        <any>rules,
      );
      const expectedImplicitQuads1 = [
        DF.quad(DF.namedNode('s1'), DF.namedNode('sBar2'), DF.namedNode('o1')),
        DF.quad(DF.namedNode('s1'), DF.namedNode('sBar3'), DF.namedNode('o1')),
      ];
      const expectedImplicitQuads2 = [
        DF.quad(DF.namedNode('s1'), DF.namedNode('sBar3'), DF.namedNode('o1')),
        DF.quad(DF.namedNode('s1'), DF.namedNode('sBar4'), DF.namedNode('o1')),
      ];
      const expectedImplicitQuads3 = [
        DF.quad(DF.namedNode('s1'), DF.namedNode('sBar4'), DF.namedNode('o1')),
      ];

      await querySource.updateImplicitStore(context);

      expect(implicitQuadStore.import).toHaveBeenCalledTimes(4);
      expect(implicitQuadStore.import)
        .toHaveBeenNthCalledWith(1, new ArrayIterator(expectedImplicitQuads1, { autoStart: false }));
      expect(implicitQuadStore.import)
        .toHaveBeenNthCalledWith(2, new ArrayIterator(expectedImplicitQuads2, { autoStart: false }));
      expect(implicitQuadStore.import)
        .toHaveBeenNthCalledWith(3, new ArrayIterator(expectedImplicitQuads3, { autoStart: false }));
      expect(implicitQuadStore.import)
        .toHaveBeenNthCalledWith(4, new ArrayIterator([], { autoStart: false }));
    });
  });

  describe('getSelectorShape', () => {
    it('should provid the selector shape', async() => {
      const innerSource = {
        getSelectorShape: jest.fn().mockReturnValueOnce('foo'),
      };
      const sourceId = 'bar';
      const implicitQuadStore = jest.fn();
      const queryEngine = jest.fn();
      const rules = new Map();
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
      const rules = new Map();
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
        const rules = new Map();
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
      const rules = new Map();
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
      const rules = new Map();
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
      const rules = new Map();
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
      const rules = new Map();
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
      const rules = new Map();
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
      const rules = new Map();
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
      const rules = new Map();
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
      const rules = new Map();
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
      const rules = new Map();
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
      const rules = new Map();
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
