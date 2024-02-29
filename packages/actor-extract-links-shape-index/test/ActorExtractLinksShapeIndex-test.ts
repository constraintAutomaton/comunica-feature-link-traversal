import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { JsonLdParser } from 'jsonld-streaming-parser';
import * as N3 from 'n3';
import type { ISimpleShape } from 'query-shape-detection';
import { DataFactory } from 'rdf-data-factory';
import { ActorExtractLinksShapeIndex } from '../lib/ActorExtractLinksShapeIndex';

import * as SHEX_CONTEXT from './shex_context.json';

const DF = new DataFactory<RDF.BaseQuad>();
const n3Parser = new N3.Parser();

describe('ActorExtractLinksShapeIndex', () => {
  describe('An ActorExtractLinksShapeIndex instance', () => {
    let actor: ActorExtractLinksShapeIndex;
    let bus: any;
    let mediatorDereferenceRdf: any;
    const addIriFromContainerInLinkQueue = false;
    const cacheShapeIndexIri = false;

    describe('test', () => {
      beforeEach(() => {
        bus = new Bus({ name: 'bus' });

        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });
      });

      it('should not test if the context is empty', async() => {
        const context = new ActionContext({
        });
        await expect(actor.test(<any>{ context })).rejects
          .toThrowError('Actor actor can only work in the context of a query.');
      });

      it('should not test if there is no header', async() => {
        const context = new ActionContext({
          [KeysInitQuery.query.name]: '',
        });
        await expect(actor.test(<any>{ context })).rejects
          .toThrowError('There should be an header for the resource to be in a Solid pods');
      });

      it('should test header information are missing but the actor is not restricted to Solid', async() => {
        const context = new ActionContext({
          [KeysInitQuery.query.name]: '',
        });
        const headers = new Headers();
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue,
          cacheShapeIndexIri,
          restrictedToSolid: false,
        });
        expect(await actor.test(<any>{ context, headers })).toBe(true);
      });

      it('should not test if there is an empty header', async() => {
        const headers = new Headers();
        const context = new ActionContext({
          [KeysInitQuery.query.name]: '',
        });
        await expect(actor.test(<any>{
          context, headers,
        })).rejects
          .toThrowError('There should be a link field inside the header for the resource to be in a Solid pods');
      });

      it('should not test if the header doesn\'t have the link to storage description', async() => {
        const headers = new Headers(
          [
            [ 'Link', 'bar' ],
            [ 'Link', 'foo' ],
            [ 'foo', 'boo' ],
          ],
        );
        const context = new ActionContext({
          [KeysInitQuery.query.name]: '',
        });
        await expect(actor.test(<any>{
          context, headers,
        })).rejects.toThrowError(`There should be a "${ActorExtractLinksShapeIndex.STORAGE_DESCRIPTION}" inside the Link field header for the resource to be in a Solid pods`);
      });

      it('should test if the header and a valid context is in the action', async() => {
        const headers = new Headers(
          [
            [ 'Link', 'bar' ],
            [ 'Link', 'foo' ],
            [ 'Link', `http://ex.com/bar ;rel=${ActorExtractLinksShapeIndex.STORAGE_DESCRIPTION}` ],
          ],
        );
        const context = new ActionContext({
          [KeysInitQuery.query.name]: '',
        });
        expect(await actor.test(<any>{ context, headers })).toBe(true);
      });
    });

    describe('getShapeFromIRI', () => {
      const iri = 'foo';
      const context: any = {};
      beforeEach(() => {
        bus = new Bus({ name: 'bus' });
      });

      it('should return an Error if the shape IRI resource contains no quads', async() => {
        mediatorDereferenceRdf = <any>{
          mediate: jest.fn(async() => ({
            data: new ArrayIterator([], { autoStart: false }),
          })),
        };
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue: false,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });

        expect(await actor.getShapeFromIRI(iri, context)).toBeInstanceOf(Error);
      });

      it('should return an error the mediator fail to fetch the quads', async() => {
        mediatorDereferenceRdf = <any>{
          mediate: jest.fn(async() => {
            return new Promise((_, reject) => {
              reject(new Error('foo'));
            });
          }),
        };
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue: false,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });

        expect(await actor.getShapeFromIRI(iri, context)).toBeInstanceOf(Error);
      });

      it('should return an error given quads not representing a ShEx shape', async() => {
        mediatorDereferenceRdf = <any>{
          mediate: jest.fn(async() => ({
            data: new ArrayIterator([
              DF.quad(
                DF.blankNode(),
                DF.blankNode(),
                DF.blankNode(),
              ),
            ], { autoStart: false }),
          })),
        };
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue: false,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });

        expect(await actor.getShapeFromIRI(iri, context)).toBeInstanceOf(Error);
      });

      it('should return an error given quads representing multiple ShEx shapes', async() => {
        const shexj = `{
          "type" : "Schema",
          "shapes" : [
            {
              "@type" : "Shape",
              "@id" : "file:/app/#a",
              "expression" : {
                "@type" : "TripleConstraint",
                "predicate" : "http://exemple.com#id",
                "valueExpr" : {
                  "@type" : "NodeConstraint",
                  "datatype" : "http://exemple.com#long"
                }
              }
            },
            {
              "@type" : "Shape",
              "@id" : "file:/app/#b",
              "expression" : {
                "@type" : "TripleConstraint",
                "predicate" : "http://exemple.com#id",
                "valueExpr" : {
                  "@type" : "NodeConstraint",
                  "datatype" : "http://exemple.com#long"
                }
              }
            }
          ]
        }`;
        const quads = await rdfFromJsonLDString(shexj);
        mediatorDereferenceRdf = <any>{
          mediate: jest.fn(async() => ({
            data: new ArrayIterator(quads, { autoStart: false }),
          })),
        };
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue: false,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });

        expect(await actor.getShapeFromIRI(iri, context)).toBeInstanceOf(Error);
      });

      it('should return a SimpleShape given quads representing a ShEx shapes', async() => {
        const shexj = `{
          "type" : "Schema",
          "@context" : "http://www.w3.org/ns/shex.jsonld",
          "shapes" : [
            {
              "type" : "Shape",
              "id" : "http://exemple.com#foo",
              "expression" : {
                "predicate" : "http://exemple.com#id",
                "valueExpr" : {
                  "type" : "NodeConstraint",
                  "datatype" : "http://exemple.com#long"
                },
                "min" : 1,
                "max" : 1,
                "type" : "TripleConstraint"
              }
            }
          ]
        }`;
        const quads = await rdfFromJsonLDString(shexj);
        mediatorDereferenceRdf = <any>{
          mediate: jest.fn(async() => ({
            data: new ArrayIterator(quads, { autoStart: false }),
          })),
        };
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue: false,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });

        const expectedSimpleShape: ISimpleShape = {
          name: 'http://exemple.com#foo',
          predicates: [ 'http://exemple.com#id' ],
        };
        expect(await actor.getShapeFromIRI(iri, context))
          .toStrictEqual([ expectedSimpleShape, iri ]);
      });
    });

    describe('getShapeIndex', () => {
      const context: any = {};
      beforeEach(() => {
        bus = new Bus({ name: 'bus' });
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });
        jest.restoreAllMocks();
      });

      it('should return an empty shape index given an empty map of shape index information', async() => {
        const shapeIndexInformation: Map<string, {
          shape?: string;
          target?: any;
        }> = new Map();
        const spy = jest.spyOn(actor, 'getShapeFromIRI');

        expect(await actor.getShapeIndex(shapeIndexInformation, context)).toStrictEqual([]);
        expect(spy).not.toHaveBeenCalled();
      });

      it('should return an empty shape index given that every shape information are invalid', async() => {
        const shapeIndexInformation: Map<string, {
          shape?: string;
          target?: any;
        }> = new Map([
          [ 'foo', { shape: 'bar', target: { iri: 'boo', isAContainer: false }}],
          [ 'foo1', { shape: 'bar1', target: { iri: 'boo1', isAContainer: true }}],
          [ 'foo2', { shape: 'bar2', target: { iri: 'boo2', isAContainer: false }}],
        ]);

        const spy = jest.spyOn(actor, 'getShapeFromIRI');
        spy.mockResolvedValue(new Error('foo'));

        expect(await actor.getShapeIndex(shapeIndexInformation, context)).toStrictEqual([]);
      });

      it('should return an empty shape index given that every shape information are incomplete', async() => {
        const shapeIndexInformation: Map<string, {
          shape?: string;
          target?: any;
        }> = new Map([
          [ 'foo', { target: { iri: 'boo', isAContainer: false }}],
          [ 'foo1', { shape: 'bar1' }],
          [ 'foo2', {}],
        ]);
        const spy = jest.spyOn(actor, 'getShapeFromIRI');

        expect(await actor.getShapeIndex(shapeIndexInformation, context)).toStrictEqual([]);
        expect(spy).not.toHaveBeenCalled();
      });

      it('should return a shape index with element from complete information', async() => {
        const shapeIndexInformation: Map<string, {
          shape?: string;
          target?: any;
        }> = new Map([
          [ 'foo', { shape: 'bar', target: { iri: 'boo', isAContainer: false }}],
          [ 'foo1', { shape: 'bar1' }],
          [ 'foo2', {}],
          [ 'foo3', { shape: 'bar3', target: { iri: 'boo3', isAContainer: true }}],
        ]);
        const spy = jest.spyOn(actor, 'getShapeFromIRI');
        spy.mockImplementation((iri: string, _context: any): Promise<[any, string]> => {
          return new Promise(resolve => {
            resolve([{}, iri ]);
          });
        });

        const expectedResult = [
          {
            isAContainer: false,
            iri: 'boo',
            shape: {},
          },
          {
            isAContainer: true,
            iri: 'boo3',
            shape: {},
          },
        ];

        expect(await actor.getShapeIndex(shapeIndexInformation, context)).toStrictEqual(expectedResult);
        expect(spy).toHaveBeenCalledTimes(2);
      });

      it(`should return a shape index with element from complete information
       given that some information are not valid`, async() => {
        const shapeIndexInformation: Map<string, {
          shape?: string;
          target?: any;
        }> = new Map([
          [ 'foo', { shape: 'bar', target: { iri: 'boo', isAContainer: false }}],
          [ 'foo1', { shape: 'bar1' }],
          [ 'foo2', {}],
          [ 'foo3', { shape: 'bar3', target: { iri: 'boo3', isAContainer: true }}],
          [ 'foo4', { shape: 'bar4', target: { iri: 'boo4', isAContainer: true }}],
        ]);
        const spy = jest.spyOn(actor, 'getShapeFromIRI');
        spy.mockImplementation((iri: string, _context: any): Promise<[any, string]> => {
          return new Promise(resolve => {
            if (iri === 'bar4') {
              resolve(new Error('foo'));
            } else {
              resolve([{}, iri ]);
            }
          });
        });

        const expectedResult = [
          {
            isAContainer: false,
            iri: 'boo',
            shape: {},
          },
          {
            isAContainer: true,
            iri: 'boo3',
            shape: {},
          },
        ];

        expect(await actor.getShapeIndex(shapeIndexInformation, context)).toStrictEqual(expectedResult);
        expect(spy).toHaveBeenCalledTimes(3);
      });

      it('should return a shape index given valid information', async() => {
        const shapeIndexInformation: Map<string, {
          shape?: string;
          target?: any;
        }> = new Map([
          [ 'foo', { shape: 'bar', target: { iri: 'boo', isAContainer: false }}],
          [ 'foo1', { shape: 'bar1', target: { iri: 'boo1', isAContainer: true }}],
          [ 'foo2', { shape: 'bar2', target: { iri: 'boo2', isAContainer: false }}],
        ]);

        const spy = jest.spyOn(actor, 'getShapeFromIRI');
        spy.mockImplementation((iri: string, _context: any): Promise<[any, string]> => {
          return new Promise(resolve => {
            resolve([{}, iri ]);
          });
        });

        const expectedResult = [
          {
            isAContainer: false,
            iri: 'boo',
            shape: {},
          },
          {
            isAContainer: true,
            iri: 'boo1',
            shape: {},
          },
          {
            isAContainer: false,
            iri: 'boo2',
            shape: {},
          },
        ];

        expect(await actor.getShapeIndex(shapeIndexInformation, context)).toStrictEqual(expectedResult);
        expect(spy).toHaveBeenCalledTimes(3);
      });
    });

    describe('generateShapeIndex', () => {
      const shapeIndexIri = '';
      const context: any = {};

      beforeEach(() => {
        bus = new Bus({ name: 'bus' });
      });

      it('should return an error if the deferencing fail', async() => {
        mediatorDereferenceRdf = <any>{
          mediate: jest.fn(async() => {
            return new Promise((_, reject) => {
              reject(new Error('foo'));
            });
          }),
        };
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue: false,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });

        expect(await actor.generateShapeIndex(shapeIndexIri, context)).toBeInstanceOf(Error);
      });

      it('should return no shape index given an empty quad stream', async() => {
        mediatorDereferenceRdf = <any>{
          mediate: jest.fn(async() => ({
            data: new ArrayIterator([], { autoStart: false }),
          })),
        };
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue: false,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });

        expect(await actor.generateShapeIndex(shapeIndexIri, context)).toStrictEqual([]);
      });

      it('should return an error if the quad stream return an error', async() => {
        mediatorDereferenceRdf = <any>{
          mediate: jest.fn(async() => ({
            data: {
              on(event: string, fn: (error) => void) {
                if (event === 'error') {
                  fn(new Error('foo'));
                }
              },
            },
          })),
        };
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue: false,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });

        expect(await actor.generateShapeIndex(shapeIndexIri, context)).toBeInstanceOf(Error);
      });

      it(`should call the shapeIndex method with the correct argument 
      given a quad stream with one unvalid shape index entry`, async() => {
        const quadString = `
        _:df_3_715 <http://www.w3.org/ns/shapetrees#shape> <http://localhost:3000/pods/00000000000000000065/profile_shape> .
        `;
        const quads: RDF.Quad[] = n3Parser.parse(quadString);

        mediatorDereferenceRdf = <any>{
          mediate: jest.fn(async() => ({
            data: new ArrayIterator(quads, { autoStart: false }),
          })),
        };
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue: false,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });
        const expectedIndex: any = [];
        const spy = jest.spyOn(actor, 'getShapeIndex');
        spy.mockReturnValue(new Promise(resolve => resolve(expectedIndex)));
        const expectedShapeInformation = {
          shape: 'http://localhost:3000/pods/00000000000000000065/profile_shape',
        };

        const resp = await actor.generateShapeIndex(shapeIndexIri, context);

        expect(spy).toHaveBeenCalledTimes(1);
        for (const entry of (<Map<string, any>>spy.mock.calls[0][0]).values()) {
          expect(entry).toStrictEqual(expectedShapeInformation);
        }
        expect(resp).toStrictEqual(expectedIndex);
      });

      it(`should call the shapeIndex method with the correct argument 
      given a quad stream with multiple shape index entries where some are valid and other are not`, async() => {
        const quadString = `
        _:df_3_715 <http://www.w3.org/ns/solid/terms#instanceContainer> <http://localhost:3000/pods/00000000000000000065/profile/> .
        
        _:df_3_1131 <http://www.w3.org/ns/solid/terms#instanceContainer> <http://localhost:3000/pods/00000000000000000065/posts/> .
        _:df_3_1131 <http://www.w3.org/ns/shapetrees#shape> <http://localhost:3000/pods/00000000000000000065/posts_shape> .
        
        _:df_3_4148 <http://www.w3.org/ns/shapetrees#shape> <http://localhost:3000/pods/00000000000000000065/comments_shape> .
        
        _:foo <http://www.w3.org/foo> <http://localhost:3000/bar> .
        _:foo2 <http://www.w3.org/foo2> <http://localhost:3000/bar2> .

        _:df_3_11312 <http://www.w3.org/ns/shapetrees#shape> <http://localhost:3000/pods/00000000000000000065/foo_shape> .
        _:df_3_11312 <http://www.w3.org/ns/solid/terms#instance> <http://localhost:3000/pods/00000000000000000065/foo/> .
        `;
        const quads: RDF.Quad[] = n3Parser.parse(quadString);

        mediatorDereferenceRdf = <any>{
          mediate: jest.fn(async() => ({
            data: new ArrayIterator(quads, { autoStart: false }),
          })),
        };
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue: false,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });
        const expectedIndex: any = [
          { iri: 'foo', isAContainer: true, shape: { name: 'bar', properties: []}},
          { iri: 'foo1', isAContainer: true, shape: { name: 'bar1', properties: []}},
        ];
        const spy = jest.spyOn(actor, 'getShapeIndex');
        spy.mockReturnValue(new Promise(resolve => resolve(expectedIndex)));
        const expectedShapeInformation = [
          {
            target: { iri: 'http://localhost:3000/pods/00000000000000000065/profile/', isAContainer: true },
          },
          {
            shape: 'http://localhost:3000/pods/00000000000000000065/posts_shape',
            target: { iri: 'http://localhost:3000/pods/00000000000000000065/posts/', isAContainer: true },
          },
          {
            shape: 'http://localhost:3000/pods/00000000000000000065/comments_shape',
          },
          {
            shape: 'http://localhost:3000/pods/00000000000000000065/foo_shape',
            target: { iri: 'http://localhost:3000/pods/00000000000000000065/foo/', isAContainer: false },
          },
        ];

        const resp = await actor.generateShapeIndex(shapeIndexIri, context);

        expect(spy).toHaveBeenCalledTimes(1);
        const callArray = [ ...(<Map<string, any>>spy.mock.calls[0][0]).values() ];

        // We just want to compare unordered arrays
        // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
        expect(callArray.sort()).toStrictEqual(expectedShapeInformation.sort());
        expect(resp).toStrictEqual(expectedIndex);
      });

      it(`should call the shapeIndex method with the valid argument given a quad stream 
      with one valid shape index entry`, async() => {
        const quadString = `
        _:df_3_715 <http://www.w3.org/ns/shapetrees#shape> <http://localhost:3000/pods/00000000000000000065/profile_shape> .
        _:df_3_715 <http://www.w3.org/ns/solid/terms#instanceContainer> <http://localhost:3000/pods/00000000000000000065/profile/> .
        `;
        const quads: RDF.Quad[] = n3Parser.parse(quadString);

        mediatorDereferenceRdf = <any>{
          mediate: jest.fn(async() => ({
            data: new ArrayIterator(quads, { autoStart: false }),
          })),
        };
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue: false,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });
        const expectedIndex: any = [
          { iri: 'foo', isAContainer: true, shape: { name: 'bar', properties: []}},
        ];
        const spy = jest.spyOn(actor, 'getShapeIndex');
        spy.mockReturnValue(new Promise(resolve => resolve(expectedIndex)));
        const expectedShapeInformation = {
          shape: 'http://localhost:3000/pods/00000000000000000065/profile_shape',
          target: { iri: 'http://localhost:3000/pods/00000000000000000065/profile/', isAContainer: true },
        };

        const resp = await actor.generateShapeIndex(shapeIndexIri, context);

        expect(spy).toHaveBeenCalledTimes(1);
        for (const [ _, entry ] of <Map<string, any>>spy.mock.calls[0][0]) {
          expect(entry).toStrictEqual(expectedShapeInformation);
        }
        expect(resp).toStrictEqual(expectedIndex);
      });

      it(`should call the shapeIndex method with the valid argument 
      given a quad stream with multiple valid shape index entries`, async() => {
        const quadString = `
        _:df_3_715 <http://www.w3.org/ns/shapetrees#shape> <http://localhost:3000/pods/00000000000000000065/profile_shape> .
        _:df_3_715 <http://www.w3.org/ns/solid/terms#instanceContainer> <http://localhost:3000/pods/00000000000000000065/profile/> .
        _:df_3_1131 <http://www.w3.org/ns/shapetrees#shape> <http://localhost:3000/pods/00000000000000000065/posts_shape> .
        _:df_3_1131 <http://www.w3.org/ns/solid/terms#instanceContainer> <http://localhost:3000/pods/00000000000000000065/posts/> .
        _:df_3_4148 <http://www.w3.org/ns/shapetrees#shape> <http://localhost:3000/pods/00000000000000000065/comments_shape> .
        _:df_3_4148 <http://www.w3.org/ns/solid/terms#instance> <http://localhost:3000/pods/00000000000000000065/comments> .
        
        `;
        const quads: RDF.Quad[] = n3Parser.parse(quadString);

        mediatorDereferenceRdf = <any>{
          mediate: jest.fn(async() => ({
            data: new ArrayIterator(quads, { autoStart: false }),
          })),
        };
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue: false,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });
        const expectedIndex: any = [
          { iri: 'foo', isAContainer: true, shape: { name: 'bar', properties: []}},
          { iri: 'foo1', isAContainer: true, shape: { name: 'bar1', properties: []}},
        ];
        const spy = jest.spyOn(actor, 'getShapeIndex');
        spy.mockReturnValue(new Promise(resolve => resolve(expectedIndex)));
        const expectedShapeInformation = [
          {
            shape: 'http://localhost:3000/pods/00000000000000000065/profile_shape',
            target: { iri: 'http://localhost:3000/pods/00000000000000000065/profile/', isAContainer: true },
          },
          {
            shape: 'http://localhost:3000/pods/00000000000000000065/posts_shape',
            target: { iri: 'http://localhost:3000/pods/00000000000000000065/posts/', isAContainer: true },
          },
          {
            shape: 'http://localhost:3000/pods/00000000000000000065/comments_shape',
            target: { iri: 'http://localhost:3000/pods/00000000000000000065/comments', isAContainer: false },
          },
        ];

        const resp = await actor.generateShapeIndex(shapeIndexIri, context);

        expect(spy).toHaveBeenCalledTimes(1);
        const callArray = [ ...(<Map<string, any>>spy.mock.calls[0][0]).values() ];
        // We just want to compare unordered arrays
        // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
        expect(callArray.sort()).toStrictEqual(expectedShapeInformation.sort());
        expect(resp).toStrictEqual(expectedIndex);
      });
    });

    describe('filterResourcesFromShapeIndex', () => {
      let shapeIndex: any = [];

      beforeEach(() => {
        bus = new Bus({ name: 'bus' });
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });
        shapeIndex = [
          {
            isAContainer: true,
            iri: 'foo',
            shape: {
              name: 'foo',
              predicates: [ 'http://exemple.ca/1', 'http://exemple.ca/2' ],
            },
          },
          {
            isAContainer: true,
            iri: 'foo1',
            shape: {
              name: 'foo1',
              predicates: [ 'http://exemple.ca/3', 'http://exemple.ca/2' ],
            },
          },
          {

            isAContainer: true,
            iri: 'foo2',
            shape: {
              name: 'foo2',
              predicates: [ 'http://exemple.ca/4', 'http://exemple.ca/5' ],
            },
          },
        ];
        jest.restoreAllMocks();
      });

      it('should return an empty filtered resources object given an empty shape index', () => {
        const query = '';
        shapeIndex = [];
        const expectedFilteredResource = {
          accepted: [],
          rejected: [],
        };

        const resp = actor.filterResourcesFromShapeIndex(shapeIndex, query);
        expect(resp).toStrictEqual(expectedFilteredResource);
      });

      it('should return an empty filtered resources object given a query targeting no properties', () => {
        const query = 'SELECT * WHERE { ?x ?o ?z }';

        const expectedFilteredResource = {
          accepted: [],
          rejected: [],
        };

        const resp = actor.filterResourcesFromShapeIndex(shapeIndex, query);
        expect(resp).toStrictEqual(expectedFilteredResource);
      });

      it('should return the correct filtered resources object given a query multiple properties', () => {
        const query = `SELECT * WHERE { 
          ?x ?o ?z .
          ?x <http://exemple.ca/1> ?z .
          ?z <http://exemple.ca/2023> "abc" .
          ?w <http://exemple.ca/4> <http://objet.fr> .
          <http://sujet.cm> <http://predicat.cm> "def" .
          FILTER (year(?x) > 2000)
      }`;

        const expectedFilteredResource = {
          accepted: [
            {
              isAContainer: true,
              iri: 'foo',
              shape: {
                name: 'foo',
                predicates: [ 'http://exemple.ca/1', 'http://exemple.ca/2' ],
              },
            },
            {

              isAContainer: true,
              iri: 'foo2',
              shape: {
                name: 'foo2',
                predicates: [ 'http://exemple.ca/4', 'http://exemple.ca/5' ],
              },
            },
          ],
          rejected: [
            {
              isAContainer: true,
              iri: 'foo1',
              shape: {
                name: 'foo1',
                predicates: [ 'http://exemple.ca/3', 'http://exemple.ca/2' ],
              },
            },
          ],
        };

        const resp = actor.filterResourcesFromShapeIndex(shapeIndex, query);
        // We just want to compare unordered arrays
        // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
        expect(resp.accepted.sort()).toStrictEqual(expectedFilteredResource.accepted.sort());
      });
    });

    describe('discoverShapeIndexLocationFromTriples', () => {
      beforeEach(() => {
        bus = new Bus({ name: 'bus' });
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });
      });

      it('should return an error given that the metadata stream return an error', async() => {
        const metadata: any = {
          on(event: string, fn: any) {
            if (event === 'error') {
              fn(new Error('foo'));
            }
          },
        };
        expect(await actor.discoverShapeIndexLocationFromTriples(metadata)).toBeInstanceOf(Error);
      });

      it('should return an error given that the metadata stream return no quads', async() => {
        const metadata: any = new ArrayIterator([], { autoStart: false });
        expect(await actor.discoverShapeIndexLocationFromTriples(metadata)).toBeInstanceOf(Error);
      });

      it(`should return an error given that the metadata stream 
      return quads not locating the shapetree`, async() => {
        const metadata: any = new ArrayIterator([
          DF.quad(
            DF.blankNode(),
            DF.blankNode(),
            DF.blankNode(),
          ),
          DF.quad(
            DF.blankNode(),
            DF.blankNode(),
            DF.blankNode(),
          ),
        ], { autoStart: false });
        expect(await actor.discoverShapeIndexLocationFromTriples(metadata)).toBeInstanceOf(Error);
      });

      it(`should return the locator given that the metadata stream 
      return quads not locating the shapetree`, async() => {
        const shapetreeLocation = 'foo';
        const metadata: any = new ArrayIterator([
          DF.quad(
            DF.blankNode(),
            DF.blankNode(),
            DF.blankNode(),
          ),
          DF.quad(
            DF.blankNode(),
            ActorExtractLinksShapeIndex.SHAPE_TREE_LOCATOR,
            DF.namedNode(shapetreeLocation),
          ),
          DF.quad(
            DF.blankNode(),
            DF.blankNode(),
            DF.blankNode(),
          ),
        ], { autoStart: false });
        expect(await actor.discoverShapeIndexLocationFromTriples(metadata))
          .toStrictEqual(shapetreeLocation);
      });
    });

    describe('getResourceIriFromContainer', () => {
      const context: any = {};
      const iri = 'foo';
      beforeEach(() => {
        bus = new Bus({ name: 'bus' });
      });

      it('should return an error given the mediator is rejected', async() => {
        mediatorDereferenceRdf = <any>{
          mediate: jest.fn(async() => {
            return new Promise((_, reject) => {
              reject(new Error('foo'));
            });
          }),
        };

        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });

        expect(await actor.getResourceIriFromContainer(iri, context)).toBeInstanceOf(Error);
      });

      it('should return an error given the mediator return an error', async() => {
        mediatorDereferenceRdf = <any>{
          mediate: () => new Promise(resolve => resolve(
            {
              data: {
                on(event: string, fn: any) {
                  if (event === 'error') {
                    fn(new Error('foo'));
                  }
                },
              },
            },
          )),
        };

        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });

        expect(await actor.getResourceIriFromContainer(iri, context)).toBeInstanceOf(Error);
      });

      it('should return an empty array given the mediator return no quads', async() => {
        mediatorDereferenceRdf = <any>{
          mediate: jest.fn(async() => ({
            data: new ArrayIterator([], { autoStart: false }),
          })),
        };

        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });

        expect(await actor.getResourceIriFromContainer(iri, context)).toStrictEqual([]);
      });

      it(`should return an empty array given the mediator 
      return quads not informing that the resource is inside a container`, async() => {
        mediatorDereferenceRdf = <any>{
          mediate: jest.fn(async() => ({
            data: new ArrayIterator([
              DF.quad(
                DF.blankNode(),
                DF.blankNode(),
                DF.blankNode(),
              ),
              DF.quad(
                DF.blankNode(),
                DF.blankNode(),
                DF.blankNode(),
              ) ], { autoStart: false }),
          })),
        };

        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });

        expect(await actor.getResourceIriFromContainer(iri, context)).toStrictEqual([]);
      });

      it(`should return the iri of resource inside a container`, async() => {
        const iris = [ 'foo', 'bar', 'too' ];
        mediatorDereferenceRdf = <any>{
          mediate: jest.fn(async() => ({
            data: new ArrayIterator([
              DF.quad(
                DF.blankNode(),
                DF.blankNode(),
                DF.blankNode(),
              ),
              DF.quad(
                DF.blankNode(),
                ActorExtractLinksShapeIndex.LDP_CONTAINS,
                DF.namedNode(iris[0]),
              ),
              DF.quad(
                DF.blankNode(),
                ActorExtractLinksShapeIndex.LDP_CONTAINS,
                DF.namedNode(iris[1]),
              ),
              DF.quad(
                DF.blankNode(),
                DF.blankNode(),
                DF.blankNode(),
              ),
              DF.quad(
                DF.blankNode(),
                ActorExtractLinksShapeIndex.LDP_CONTAINS,
                DF.namedNode(iris[2]),
              ) ], { autoStart: false }),
          })),
        };

        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });
        const expectedIris = iris.map(value => { return { url: value }; });

        expect(await actor.getResourceIriFromContainer(iri, context))
          .toStrictEqual(expectedIris);
      });
    });

    describe('getIrisFromAcceptedEntries', () => {
      const context: any = {};
      const rejected = [
        {
          iri: 'rfoo',
          isAContainer: true,
        },
        {
          iri: 'rfoo1',
          isAContainer: false,
        },
        {
          iri: 'rfoo2',
          isAContainer: true,
        },
      ];
      beforeEach(() => {
        bus = new Bus({ name: 'bus' });
        jest.resetAllMocks();
      });

      it('should return no iri given the accepted filters are empty', async() => {
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });
        const filteredResources: any = {
          accepted: [],
          rejected,
        };
        expect(await actor.getIrisFromAcceptedEntries(filteredResources, context))
          .toStrictEqual([]);
      });

      it('should return iris given the accepted filters contain only non containers entries', async() => {
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });
        const accepted = [
          {
            iri: 'foo',
            isAContainer: false,
          },
          {
            iri: 'foo1',
            isAContainer: false,
          },
          {
            iri: 'foo2',
            isAContainer: false,
          },
        ];
        const filteredResources: any = {
          accepted,
          rejected,
        };

        const expectedIri = accepted.map(value => { return { url: value.iri }; });

        expect(await actor.getIrisFromAcceptedEntries(filteredResources, context))
          .toStrictEqual(expectedIri);
      });

      it(`should return iris given the accepted filters contain containers entry 
      but the containers are not available`, async() => {
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue: true,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });
        const accepted = [
          {
            iri: 'foo',
            isAContainer: false,
          },
          {
            iri: 'foo1',
            isAContainer: true,
          },
          {
            iri: 'foo2',
            isAContainer: false,
          },
        ];
        const filteredResources: any = {
          accepted,
          rejected,
        };

        const spy = jest.spyOn(actor, 'getResourceIriFromContainer');
        spy.mockReturnValue(new Error('foo'));

        const expectedIri = [{ url: 'foo' }, { url: 'foo2' }];

        expect(await actor.getIrisFromAcceptedEntries(filteredResources, context))
          .toStrictEqual(expectedIri);
        expect(spy).toBeCalledTimes(1);
      });

      it('should return iris given the accepted filters with multiple entries', async() => {
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue: true,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });
        const accepted = [
          {
            iri: 'foo',
            isAContainer: false,
          },
          {
            iri: 'foo1',
            isAContainer: true,
          },
          {
            iri: 'foo1',
            isAContainer: true,
          },
          {
            iri: 'foo2',
            isAContainer: false,
          },
        ];
        const filteredResources: any = {
          accepted,
          rejected,
        };

        const spy = jest.spyOn(actor, 'getResourceIriFromContainer');
        spy.mockReturnValue(new Error('foo'));
        spy.mockResolvedValueOnce([{ url: 'foo1' }, { url: 'foo10' }]);
        const expectedIri = [ 'foo', 'foo2', 'foo1', 'foo10' ].map(value => { return { url: value }; });

        expect(await actor.getIrisFromAcceptedEntries(filteredResources, context))
          .toStrictEqual(expectedIri);
        expect(spy).toBeCalledTimes(2);
      });
      it(`should return iris given the accepted filters with multiple entries
       and the addIriFromContainerInLinkQueue is set to false`, async() => {
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue: false,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });
        const accepted = [
          {
            iri: 'foo',
            isAContainer: false,
          },
          {
            iri: 'foo1',
            isAContainer: true,
          },
          {
            iri: 'foo1',
            isAContainer: true,
          },
          {
            iri: 'foo2',
            isAContainer: false,
          },
        ];
        const filteredResources: any = {
          accepted,
          rejected,
        };

        const spy = jest.spyOn(actor, 'getResourceIriFromContainer');
        spy.mockRejectedValue(new Error('foo'));
        spy.mockResolvedValueOnce([{ url: 'foo1' }, { url: 'foo10' }]);
        const expectedIri = [ 'foo', 'foo2' ].map(value => { return { url: value }; });

        expect(await actor.getIrisFromAcceptedEntries(filteredResources, context))
          .toStrictEqual(expectedIri);
        expect(spy).toBeCalledTimes(0);
      });
    });

    describe('generateFilters', () => {
      const accepted = [
        {
          iri: 'foo',
          isAContainer: true,
        },
        {
          iri: 'foo1',
          isAContainer: false,
        },
        {
          iri: 'foo2',
          isAContainer: true,
        },
      ];
      beforeEach(() => {
        bus = new Bus({ name: 'bus' });
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });
      });

      it('should return no filters given there is no rejected resource', () => {
        const filteredResources = {
          accepted,
          rejected: [],
        };
        expect(actor.generateFilters(filteredResources)).toStrictEqual(new Map());
      });

      it('should return filters given there are only non containers entries', () => {
        const rejected = [
          {
            iri: 'rfoo',
            isAContainer: false,
          },
          {
            iri: 'rfoo1',
            isAContainer: false,
          },
          {
            iri: 'rfoo2',
            isAContainer: false,
          },
        ];
        const filteredResources = {
          accepted,
          rejected,
        };
        const expectedFilters = new Map();
        rejected.forEach(indexEntry => {
          expectedFilters.set(indexEntry.iri, '(iri: string) => iri === indexEntry.iri');
        });
        const resp = actor.generateFilters(filteredResources);

        // I don't know another way to check if the two functions are the same
        for (const [ key, val ] of resp) {
          expect(val.toString().includes(expectedFilters.get(key).toString()));
          expect(val(key)).toBe(true);
          expect(val('foo')).toBe(false);
        }
      });

      it('should return filters given there are only containers entries', () => {
        const rejected = [
          {
            iri: 'http://example.com/rfoo/',
            isAContainer: true,
          },
          {
            iri: 'http://example.com/rfoo1/',
            isAContainer: true,
          },
          {
            iri: 'http://example.com/rfoo2/',
            isAContainer: true,
          },
        ];
        const filteredResources = {
          accepted,
          rejected,
        };
        const expectedFilters = new Map();
        rejected.forEach(indexEntry => {
          expectedFilters.set(indexEntry.iri, true);
        });
        const resp = actor.generateFilters(filteredResources);

        // I don't know another way to check if the two functions are the same
        for (const [ key, val ] of resp) {
          expect(expectedFilters.has(key)).toBeDefined();
          expect(val.toString().includes('return linkqueueURL.length + 1 === shapeIndexURL.length;'));
          expect(val(key)).toBe(true);
          expect(val('val')).toBe(false);
          expect(val(`${key}abc`)).toBe(true);
          expect(val(`${key}abc/abd`)).toBe(false);
        }
      });

      it('should return filters given mutltiple rejected resources', () => {
        const rejected = [
          {
            iri: 'rfoo',
            isAContainer: true,
          },
          {
            iri: 'rfoo1',
            isAContainer: false,
          },
          {
            iri: 'rfoo2',
            isAContainer: true,
          },
        ];
        const filteredResources = {
          accepted,
          rejected,
        };
        const expectedFilters = new Map();
        rejected.forEach(indexEntry => {
          if (indexEntry.isAContainer) {
            expectedFilters.set(indexEntry.iri, 'return linkqueueURL.length + 1 === shapeIndexURL.length;');
          } else {
            expectedFilters.set(indexEntry.iri, '(iri: string) => iri === indexEntry.iri');
          }
        });
        const resp = actor.generateFilters(filteredResources);

        // I don't know another way to check if the two functions are the same
        for (const [ key, val ] of resp) {
          expect(expectedFilters.has(key)).toBeDefined();
          expect(val.toString().includes(expectedFilters.get(key)));
        }
      });
    });

    describe('run', () => {
      beforeEach(() => {
        bus = new Bus({ name: 'bus' });
        jest.resetAllMocks();
      });

      it('should return an empty link array given we cannot discover the shape index location', async() => {
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });
        const spyDiscover = jest.spyOn(actor, 'discoverShapeIndexLocationFromTriples');
        spyDiscover.mockReturnValue(new Error('foo'));
        const action: any = {
          metadata: jest.fn(),
        };

        expect(await actor.run(action)).toStrictEqual({ links: []});
      });

      it('should return an empty link array given that we cannot generate shape index', async() => {
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });
        const spyDiscover = jest.spyOn(actor, 'discoverShapeIndexLocationFromTriples');
        spyDiscover.mockResolvedValueOnce('foo');
        const spyGenerateShapeIndex = jest.spyOn(actor, 'generateShapeIndex');
        spyGenerateShapeIndex.mockResolvedValue(new Error('foo'));
        const action: any = {
          metadata: jest.fn(),
        };

        expect(await actor.run(action)).toStrictEqual({ links: []});
      });

      it('should return an empty link array given that we cannot add the accepted IRI to the link queue', async() => {
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });
        const spyDiscover = jest.spyOn(actor, 'discoverShapeIndexLocationFromTriples');
        spyDiscover.mockResolvedValueOnce('foo');
        const spyGenerateShapeIndex = jest.spyOn(actor, 'generateShapeIndex');
        spyGenerateShapeIndex.mockResolvedValueOnce([]);
        jest.spyOn(actor, 'filterResourcesFromShapeIndex').mockReturnValueOnce({
          accepted: [],
          rejected: [],
        });
        jest.spyOn(actor, 'generateFilters').mockReturnValueOnce(new Map());
        const spyAddIri = jest.spyOn(actor, 'getIrisFromAcceptedEntries');
        spyAddIri.mockReturnValue(new Error('foo'));

        const action: any = {
          metadata: jest.fn(),
          context: {
            get: jest.fn(),
            set: jest.fn(),
          },
        };

        expect(await actor.run(action)).toStrictEqual({ links: []});
        expect(action.context.set).toHaveBeenCalledTimes(1);
      });

      it('should return a link array given all the shape filter process succeeded', async() => {
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue,
          cacheShapeIndexIri,
          restrictedToSolid: true,
        });
        const spyDiscover = jest.spyOn(actor, 'discoverShapeIndexLocationFromTriples');
        spyDiscover.mockResolvedValueOnce('foo');
        const spyGenerateShapeIndex = jest.spyOn(actor, 'generateShapeIndex');
        spyGenerateShapeIndex.mockResolvedValueOnce([]);
        jest.spyOn(actor, 'filterResourcesFromShapeIndex').mockReturnValueOnce({
          accepted: [],
          rejected: [],
        });
        jest.spyOn(actor, 'generateFilters').mockReturnValueOnce(new Map());
        const spyAddIri = jest.spyOn(actor, 'getIrisFromAcceptedEntries');
        spyAddIri.mockResolvedValueOnce([{ url: 'foo' }]);

        const action: any = {
          metadata: jest.fn(),
          context: {
            get: jest.fn(),
            set: jest.fn(),
          },
        };

        expect(await actor.run(action)).toStrictEqual({ links: [{ url: 'foo' }]});
        expect(action.context.set).toHaveBeenCalledTimes(1);
      });

      it('should return an empty link array given the shape index has been handled', async() => {
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          addIriFromContainerInLinkQueue,
          cacheShapeIndexIri: true,
          restrictedToSolid: true,
        });

        const spyDiscover = jest.spyOn(actor, 'discoverShapeIndexLocationFromTriples');
        spyDiscover.mockResolvedValue('foo');
        const spyGenerateShapeIndex = jest.spyOn(actor, 'generateShapeIndex');
        spyGenerateShapeIndex.mockResolvedValueOnce([]);
        jest.spyOn(actor, 'filterResourcesFromShapeIndex').mockReturnValueOnce({
          accepted: [],
          rejected: [],
        });
        jest.spyOn(actor, 'generateFilters').mockReturnValueOnce(new Map());
        const spyAddIri = jest.spyOn(actor, 'getIrisFromAcceptedEntries');
        spyAddIri.mockResolvedValueOnce([]);

        const action: any = {
          metadata: jest.fn(),
          context: {
            get: jest.fn(),
            set: jest.fn(),
          },
        };
        await actor.run(action);
        expect(action.context.set).toHaveBeenCalledTimes(1);

        expect(await actor.run(action)).toStrictEqual({ links: []});
      });
    });
  });
});

function rdfFromJsonLDString(jsonld: string): Promise<RDF.Quad[]> {
  return new Promise((resolve, rejects) => {
    const quads: RDF.Quad[] = [];
    const jsonldParser = new JsonLdParser({
      streamingProfile: false,
      context: SHEX_CONTEXT,
      skipContextValidation: true,
    });
    jsonldParser
      .on('data', async(quad: RDF.Quad) => {
        quads.push(quad);
      })
      .on('error', (error: any) => {
        rejects(error);
      })
      .on('end', async() => {
        resolve(quads);
      });

    jsonldParser.write(jsonld);
    jsonldParser.end();
  });
}
