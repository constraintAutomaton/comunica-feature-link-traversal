import { KeysInitQuery } from '@comunica/context-entries';
import { KeysDeactivateLinkExtractor, KeysFilter } from '@comunica/context-entries-link-traversal';
import { ActionContext, Bus, passTestVoid } from '@comunica/core';
import { EVERY_REACHABILITY_CRITERIA, PRODUCED_BY_ACTOR } from '@comunica/types-link-traversal';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { ContextParser, FetchDocumentLoader } from 'jsonld-context-parser';
import { JsonLdParser } from 'jsonld-streaming-parser';
import * as N3 from 'n3';
import { type IShape, generateQuery, IResult, Shape } from 'query-shape-detection';
import { DataFactory } from 'rdf-data-factory';
import { translate, Factory } from 'sparqlalgebrajs';
import { ActorExtractLinksShapeIndex } from '../lib/ActorExtractLinksShapeIndex';
import { isError, result, error, isResult, IResult as IResultInterface, safePromise, type Result, type SafePromise } from 'result-interface/src/index';

// eslint-disable-next-line import/extensions
import * as SHEX_CONTEXT from './shex-context.json';

const quad = require('rdf-quad');
const stream = require('streamify-array');

const FACTORY = new Factory();
const DF = new DataFactory<RDF.BaseQuad>();
const n3Parser = new N3.Parser();

describe('ActorExtractLinksShapeIndex', () => {
  describe('An ActorExtractLinksShapeIndex instance', () => {
    let actor: ActorExtractLinksShapeIndex;
    let bus: any;
    let mediatorDereferenceRdf: any;
    const cacheShapeIndexIri = false;

    describe('test', () => {
      let input;
      let operation;
      let context;
      beforeEach(() => {
        bus = new Bus({ name: 'bus' });
        mediatorDereferenceRdf = <any>{
          mediate: jest.fn(async() => ({
            data: new ArrayIterator([], { autoStart: false }),
          })),
        };
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          cacheShapeIndexIri: false,
        });
        input = stream([
          quad('ex:s1', 'ex:px', 'ex:o1', 'ex:gx'),
          quad('ex:s2', 'ex:p', '"o"', 'ex:g'),
          quad('ex:s3', 'ex:px', 'ex:o3', 'ex:gx'),
          quad('ex:s4', 'ex:p', 'ex:o4', 'ex:g'),
          quad('ex:s5', 'ex:p', 'ex:o5', 'ex:gx'),
        ]);
        operation = FACTORY.createBgp([
          FACTORY.createPattern(
            DF.variable('s'),
            DF.namedNode('ex:p'),
            DF.variable('o'),
            DF.namedNode('ex:g'),
          ),
        ]);
        context = new ActionContext({ [KeysInitQuery.query.name]: operation });
      });
      it('should test if there is no deactivation map in the context', async() => {
        await expect(actor.test({ url: 'ex:s', metadata: input, requestTime: 0, context: new ActionContext() }))
          .resolves.toStrictEqual(passTestVoid());
      });
    });

    describe('getShapeFromIRI', () => {
      const iri = 'http://exemple.com#foo';
      const context: any = {};
      const entry = 'bar';

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
          cacheShapeIndexIri,
        });

        const resp  = await actor.getShapeFromIRI(iri, entry, context); 
        expect(isError(resp)).resolves.toBe(true);
      });

      it('should return an error if the mediator fail to fetch the quads', async() => {
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
          cacheShapeIndexIri,
        });

        const resp  = await actor.getShapeFromIRI(iri, entry, context); 
        expect(isError(resp)).resolves.toBe(true);
      });

      it('should return an error if the quads do not represent a ShEx shape', async() => {
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
          cacheShapeIndexIri,
        });

        const resp  = actor.getShapeFromIRI(iri, entry, context); 
        await expect(isError(resp)).resolves.toBe(true);
      });

      it('should return an error if the quads represent multiple ShEx shapes', async() => {
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
          cacheShapeIndexIri,
        });

        const resp  = actor.getShapeFromIRI(iri, entry, context); 
        await expect(isError(resp)).resolves.toBe(true);
      });

      it('should return a shape given quads representing a ShEx shapes', async() => {
        const shexj = `{
          "type" : "Schema",
          "@context" : "https://www.w3.org/ns/shex.jsonld",
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
          cacheShapeIndexIri,
        });

        const resp = await actor.getShapeFromIRI(iri, entry, context); 
        expect(isResult(resp)).resolves.toBe(true);
        const {value: [ shape, respEntry ]} = <IResultInterface<[IShape, string]> >resp;
        expect(respEntry).toBe(entry);
        expect(shape.name).toBe(iri);
        expect(shape.closed).toBe(false);
        expect(shape.positivePredicates).toStrictEqual([ 'http://exemple.com#id' ]);
        expect(shape.negativePredicates).toStrictEqual([]);
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
          cacheShapeIndexIri,
        });
        jest.restoreAllMocks();
      });

      it('should return an error if there is no shape information', async() => {
        const shapeIndexInformation: any = {
          declaration: false,
          isComplete: undefined,
          domain: undefined,
          entries: [],
          bindingShapes: new Map(),
          targets: new Map(),
        };
        const spy = jest.spyOn(actor, 'getShapeFromIRI');

        await expect(actor.getShapeIndex(shapeIndexInformation, context))
          .resolves.toThrow('the RDF type of the shape index is not defined');
        expect(spy).not.toHaveBeenCalled();
      });

      it('should return an error if there is no shape index declaration', async() => {
        const shapeIndexInformation: any = {
          declaration: false,
          isComplete: undefined,
          domain: 'bar',
          entries: [ 'foo' ],
          bindingShapes: new Map([[ 'foo', 'shape' ]]),
          targets: new Map([[ 'foo', { isAContainer: true, iri: 'target' }]]),
        };
        const spy = jest.spyOn(actor, 'getShapeFromIRI');

        await expect(actor.getShapeIndex(shapeIndexInformation, context))
          .resolves.toThrow('the RDF type of the shape index is not defined');
        expect(spy).not.toHaveBeenCalled();
      });

      it('should return an error if there is domain', async() => {
        const shapeIndexInformation: any = {
          declaration: true,
          isComplete: undefined,
          domain: undefined,
          entries: [ 'foo' ],
          bindingShapes: new Map([[ 'foo', 'shape' ]]),
          targets: new Map([[ 'foo', { isAContainer: true, iri: 'target' }]]),
        };
        const spy = jest.spyOn(actor, 'getShapeFromIRI');

        await expect(actor.getShapeIndex(shapeIndexInformation, context))
          .resolves.toThrow('the domain of the shape index is not defined');
        expect(spy).not.toHaveBeenCalled();
      });

      it('should return a shape index with no entries if no entry was found in the quad set', async() => {
        const shapeIndexInformation: any = {
          declaration: true,
          isComplete: undefined,
          domain: 'domain',
          entries: [],
          bindingShapes: new Map([[ 'foo', 'shape' ]]),
          targets: new Map([[ 'foo', { isAContainer: true, iri: 'target' }]]),
        };

        const expectedShapeIndex: any = {
          isComplete: false,
          domain: /domain/u,
          entries: new Map(),
        };
        const spy = jest.spyOn(actor, 'getShapeFromIRI');

        await expect(actor.getShapeIndex(shapeIndexInformation, context)).resolves
          .toStrictEqual(expectedShapeIndex);
        expect(spy).not.toHaveBeenCalled();
      });

      it('should return a shape index with one entry', async() => {
        const shapeIndexInformation: any = {
          declaration: true,
          isComplete: true,
          domain: 'domain',
          entries: [ 'foo' ],
          bindingShapes: new Map([[ 'foo', 'shapeIri' ]]),
          targets: new Map([[ 'foo', { isAContainer: true, iri: 'target' }]]),
        };

        const expectedShapeIndex: any = {
          isComplete: true,
          domain: /domain/u,
          entries: new Map([[ 'target', { isAContainer: true, iri: 'target', shape: 'shape' }]]),
        };
        const spy = jest.spyOn(actor, 'getShapeFromIRI')
          .mockResolvedValueOnce(<any>[ 'shape', 'foo' ]);

        await expect(actor.getShapeIndex(shapeIndexInformation, context)).resolves
          .toStrictEqual(expectedShapeIndex);
        expect(spy).toHaveBeenCalledTimes(1);
      });

      it('should return a shape index with multiple entries', async() => {
        const shapeIndexInformation: any = {
          declaration: true,
          isComplete: true,
          domain: 'domain',
          entries: [ 'foo', 'foo1', 'foo2' ],
          bindingShapes: new Map([
            [ 'foo', 'shapeIri' ],
            [ 'foo1', 'shapeIri1' ],
            [ 'foo2', 'shapeIri2' ],
          ]),
          targets: new Map([
            [ 'foo', { isAContainer: true, iri: 'target' }],
            [ 'foo1', { isAContainer: true, iri: 'target1' }],
            [ 'foo2', { isAContainer: false, iri: 'target2' }],
          ]),
        };

        const expectedShapeIndex: any = {
          isComplete: true,
          domain: /domain/u,
          entries: new Map([
            [ 'target', { isAContainer: true, iri: 'target', shape: 'shape' }],
            [ 'target1', { isAContainer: true, iri: 'target1', shape: 'shape1' }],
            [ 'target2', { isAContainer: false, iri: 'target2', shape: 'shape2' }],
          ]),
        };
        const spy = jest.spyOn(actor, 'getShapeFromIRI')
          .mockResolvedValueOnce(<any>[ 'shape', 'foo' ])
          .mockResolvedValueOnce(<any>[ 'shape1', 'foo1' ])
          .mockResolvedValueOnce(<any>[ 'shape2', 'foo2' ]);

        await expect(actor.getShapeIndex(shapeIndexInformation, context)).resolves
          .toStrictEqual(expectedShapeIndex);
        expect(spy).toHaveBeenCalledTimes(3);
      });

      it('should return a shape index with multiple entries and blank entries', async() => {
        const shapeIndexInformation: any = {
          declaration: true,
          isComplete: true,
          domain: 'domain',
          entries: [ 'foo', 'foo1', 'foo2', 'foo4000' ],
          bindingShapes: new Map([
            [ 'foo', 'shapeIri' ],
            [ 'foo1', 'shapeIri1' ],
            [ 'foo2', 'shapeIri2' ],
            [ 'bar', '?' ],
            [ 'bar1', '?o' ],
          ]),
          targets: new Map([
            [ 'foo', { isAContainer: true, iri: 'target' }],
            [ 'foo1', { isAContainer: true, iri: 'target1' }],
            [ 'foo2', { isAContainer: false, iri: 'target2' }],
            [ 'bar', { isAContainer: false, iri: 'target?' }],
            [ '?', { isAContainer: true, iri: 'target??' }],
          ]),
        };

        const expectedShapeIndex: any = {
          isComplete: true,
          domain: /domain/u,
          entries: new Map([
            [ 'target', { isAContainer: true, iri: 'target', shape: 'shape' }],
            [ 'target1', { isAContainer: true, iri: 'target1', shape: 'shape1' }],
            [ 'target2', { isAContainer: false, iri: 'target2', shape: 'shape2' }],
          ]),
        };
        const spy = jest.spyOn(actor, 'getShapeFromIRI')
          .mockResolvedValueOnce(<any>[ 'shape', 'foo' ])
          .mockResolvedValueOnce(<any>[ 'shape1', 'foo1' ])
          .mockResolvedValueOnce(<any>[ 'shape2', 'foo2' ]);

        await expect(actor.getShapeIndex(shapeIndexInformation, context)).resolves
          .toStrictEqual(expectedShapeIndex);
        expect(spy).toHaveBeenCalledTimes(3);
      });
    });

    describe('generateShapeIndex', () => {
      const shapeIndexIri = 'http://localhost:3000/pods/00000000000000000065/shapeIndex';
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
          cacheShapeIndexIri,
        });

        await expect(actor.generateShapeIndex(shapeIndexIri, context)).resolves.toBeInstanceOf(Error);
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
          cacheShapeIndexIri,
        });

        await expect(actor.generateShapeIndex(shapeIndexIri, context))
          .resolves.toThrow('the RDF type of the shape index is not defined');
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
          cacheShapeIndexIri,
        });

        await expect(actor.generateShapeIndex(shapeIndexIri, context)).resolves.toBeInstanceOf(Error);
      });

      it(`should return an error if unrelated triples are dereferenced`, async() => {
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
          cacheShapeIndexIri,
        });

        await expect(actor.generateShapeIndex(shapeIndexIri, context))
          .resolves.toThrow('the RDF type of the shape index is not defined');
      });

      it(`should return a shape index`, async() => {
        const quadString = `
        <http://localhost:3000/pods/00000000000000000065/shapeIndex> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://shapeIndex.com#ShapeIndex> .
        <http://localhost:3000/pods/00000000000000000065/shapeIndex> <https://shapeIndex.com#domain> "http://localhost:3000/pods/00000000000000000065/.*" .
        <http://localhost:3000/pods/00000000000000000065/shapeIndex> <https://shapeIndex.com#entry> _:df_3_71 .
        _:df_3_71 <https://shapeIndex.com#bindByShape> <http://localhost:3000/pods/00000000000000000065/profile_shape#Profile> .
        _:df_3_71 <http://www.w3.org/ns/solid/terms#instanceContainer> <http://localhost:3000/pods/00000000000000000065/profile/> .
        <http://localhost:3000/pods/00000000000000000065/shapeIndex> <https://shapeIndex.com#entry> _:df_3_2060 .
        _:df_3_2060 <https://shapeIndex.com#bindByShape> <http://localhost:3000/pods/00000000000000000065/posts_shape#Post> .
        _:df_3_2060 <http://www.w3.org/ns/solid/terms#instanceContainer> <http://localhost:3000/pods/00000000000000000065/posts/> .
        <http://localhost:3000/pods/00000000000000000065/shapeIndex> <https://shapeIndex.com#entry> _:df_3_4148 .
        _:df_3_4148 <https://shapeIndex.com#bindByShape> <http://localhost:3000/pods/00000000000000000065/comments_shape#Comment> .
        _:df_3_4148 <http://www.w3.org/ns/solid/terms#instance> <http://localhost:3000/pods/00000000000000000065/comments#1> .
        <http://localhost:3000/pods/00000000000000000065/shapeIndex> <https://shapeIndex.com#isComplete> true .
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
          cacheShapeIndexIri,
        });
        jest.spyOn(actor, 'getShapeFromIRI')
          .mockImplementation((iri: string, entry: string, _: any) => {
            if (iri === 'http://localhost:3000/pods/00000000000000000065/profile_shape#Profile') {
              return <any>[ 'shape_profile', entry ];
            }

            if (iri === 'http://localhost:3000/pods/00000000000000000065/posts_shape#Post') {
              return <any>[ 'shape_post', entry ];
            }

            if (iri === 'http://localhost:3000/pods/00000000000000000065/comments_shape#Comment') {
              return <any>[ 'shape_comment', entry ];
            }
          });

        const expectedShapeIndex = {
          isComplete: true,
          domain: /http:\/\/localhost:3000\/pods\/00000000000000000065\/.*/u,
          entries: new Map([
            [
              'http://localhost:3000/pods/00000000000000000065/profile/',
              {
                isAContainer: true,
                iri: 'http://localhost:3000/pods/00000000000000000065/profile/',
                shape: 'shape_profile',
              },
            ],
            [
              'http://localhost:3000/pods/00000000000000000065/posts/',
              {
                isAContainer: true,
                iri: 'http://localhost:3000/pods/00000000000000000065/posts/',
                shape: 'shape_post',
              },
            ],
            [
              'http://localhost:3000/pods/00000000000000000065/comments#1',
              {
                isAContainer: false,
                iri: 'http://localhost:3000/pods/00000000000000000065/comments#1',
                shape: 'shape_comment',
              },
            ],
          ]),
        };

        await expect(actor.generateShapeIndex(shapeIndexIri, context)).resolves.toStrictEqual(expectedShapeIndex);
      });

      it(`should return a shape index with extra information`, async() => {
        const quadString = `
        <http://localhost:3000/pods/00000000000000000065/shapeIndex> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://shapeIndex.com#ShapeIndex> .
        <http://localhost:3000/pods/00000000000000000065/shapeIndex> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <foo> .
        <http://localhost:3000/pods/00000000000000000065/shapeIndex> <https://shapeIndex.com#domain> "http://localhost:3000/pods/00000000000000000065/.*" .
        <http://localhost:3000/pods/00000000000000000065/shapeIndex> <https://shapeIndex.com#entry> _:df_3_71 .
        _:df_3_71 <https://shapeIndex.com#bindByShape> <http://localhost:3000/pods/00000000000000000065/profile_shape#Profile> .
        _:df_3_71 <http://www.w3.org/ns/solid/terms#instanceContainer> <http://localhost:3000/pods/00000000000000000065/profile/> .
        <http://localhost:3000/pods/00000000000000000065/shapeIndex> <https://shapeIndex.com#entry> _:df_3_2060 .
        _:df_3_2060 <https://shapeIndex.com#bindByShape> <http://localhost:3000/pods/00000000000000000065/posts_shape#Post> .
        _:df_3_2060 <http://www.w3.org/ns/solid/terms#instanceContainer> <http://localhost:3000/pods/00000000000000000065/posts/> .
        <http://localhost:3000/pods/00000000000000000065/shapeIndex> <https://shapeIndex.com#entry> _:df_3_4148 .
        _:df_3_4148 <https://shapeIndex.com#bindByShape> <http://localhost:3000/pods/00000000000000000065/comments_shape#Comment> .
        _:df_3_4148 <http://www.w3.org/ns/solid/terms#instance> <http://localhost:3000/pods/00000000000000000065/comments#1> .
        <http://localhost:3000/pods/00000000000000000065/shapeIndex> <https://shapeIndex.com#isComplete> true .
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
          cacheShapeIndexIri,
        });
        jest.spyOn(actor, 'getShapeFromIRI')
          .mockImplementation((iri: string, entry: string, _: any) => {
            if (iri === 'http://localhost:3000/pods/00000000000000000065/profile_shape#Profile') {
              return <any>[ 'shape_profile', entry ];
            }

            if (iri === 'http://localhost:3000/pods/00000000000000000065/posts_shape#Post') {
              return <any>[ 'shape_post', entry ];
            }

            if (iri === 'http://localhost:3000/pods/00000000000000000065/comments_shape#Comment') {
              return <any>[ 'shape_comment', entry ];
            }
          });

        const expectedShapeIndex = {
          isComplete: true,
          domain: /http:\/\/localhost:3000\/pods\/00000000000000000065\/.*/u,
          entries: new Map([
            [
              'http://localhost:3000/pods/00000000000000000065/profile/',
              {
                isAContainer: true,
                iri: 'http://localhost:3000/pods/00000000000000000065/profile/',
                shape: 'shape_profile',
              },
            ],
            [
              'http://localhost:3000/pods/00000000000000000065/posts/',
              {
                isAContainer: true,
                iri: 'http://localhost:3000/pods/00000000000000000065/posts/',
                shape: 'shape_post',
              },
            ],
            [
              'http://localhost:3000/pods/00000000000000000065/comments#1',
              {
                isAContainer: false,
                iri: 'http://localhost:3000/pods/00000000000000000065/comments#1',
                shape: 'shape_comment',
              },
            ],
          ]),
        };

        await expect(actor.generateShapeIndex(shapeIndexIri, context)).resolves.toStrictEqual(expectedShapeIndex);
      });
    });

    describe('filterResourcesFromShapeIndex', () => {
      let shapeIndex: any = {};
      const context: any = {};
      const domain = /http:\/\/localhost:3000\/pods\/00000000000000000065\/.*/u;

      beforeEach(() => {
        bus = new Bus({ name: 'bus' });
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          cacheShapeIndexIri,
        });

        jest.spyOn(actor, 'getShapeFromIRI').mockResolvedValue(
          [ new Shape({
            closed: true,
            name: 'linked',
            positivePredicates: [ 'http://exemple.ca/linked1', 'http://exemple.ca/linked2' ],
            negativePredicates: [],
          }), 'linked' ],
        );

        const entries = new Map([
          [
            'foo',
            {
              isAContainer: true,
              iri: 'foo',
              shape: new Shape({
                closed: true,
                name: 'foo',
                positivePredicates: [ 'http://exemple.ca/1', 'http://exemple.ca/2' ],
                negativePredicates: [],
              }),
            },
          ],
          [
            'foo1',
            {
              isAContainer: true,
              iri: 'foo1',
              shape: new Shape({
                closed: true,
                name: 'foo1',
                positivePredicates: [ 'http://exemple.ca/3', 'http://exemple.ca/2' ],
                negativePredicates: [],
              }),
            },
          ],
          [
            'foo2',
            {

              isAContainer: true,
              iri: 'foo2',
              shape: new Shape({
                closed: true,
                name: 'foo2',
                positivePredicates: [ 'http://exemple.ca/4', 'http://exemple.ca/5' ],
                negativePredicates: [],
              }),
            },
          ],
        ]);

        shapeIndex = {
          entries,
          domain,
          isComplete: false,
        };
        jest.restoreAllMocks();
      });

      it('should return an empty filtered resources object given an empty shape index', async() => {
        const query = translate(`SELECT * WHERE { 
          ?x ?o ?z .
          ?x <http://exemple.ca/1> ?z .
          ?z <http://exemple.ca/2023> "abc" .
          ?w <http://exemple.ca/4> <http://objet.fr> .
          <http://sujet.cm> <http://predicat.cm> "def" .
          FILTER (year(?x) > 2000)
      }`);
        (<any>actor).query = generateQuery(query);
        shapeIndex = {
          entries: new Map(),
          domain: /a/u,
          isComplete: false,
        };
        const expectedFilteredResource = {
          accepted: [],
          rejected: [],
        };

        const resp = await actor.filterResourcesFromShapeIndex(shapeIndex, context);
        expect(resp).toStrictEqual(expectedFilteredResource);
      });

      it('should return an empty filtered resources object given a query targeting no properties', async() => {
        const query = translate('SELECT * WHERE { ?x ?o ?z }');
        (<any>actor).query = generateQuery(query);

        const expectedFilteredResource = {
          accepted: [
            {
              isAContainer: true,
              iri: 'foo',
            },
            {
              isAContainer: true,
              iri: 'foo1',
            },
            {

              isAContainer: true,
              iri: 'foo2',

            },
          ],
          rejected: [],
        };

        const resp = await actor.filterResourcesFromShapeIndex(shapeIndex, context);
        expect(resp).toStrictEqual(expectedFilteredResource);
      });

      it('should return the correct filtered resources object given a query multiple properties', async() => {
        const query = translate(`SELECT * WHERE { 
          ?x ?o ?z .
          ?x <http://exemple.ca/1> ?z .
          ?z <http://exemple.ca/2023> "abc" .
          ?w <http://exemple.ca/4> <http://objet.fr> .
          <http://sujet.cm> <http://predicat.cm> "def" .
          FILTER (year(?x) > 2000)
      }`);
        (<any>actor).query = generateQuery(query);

        const expectedFilteredResource = {
          accepted: [
            {
              isAContainer: true,
              iri: 'foo',
            },
            {

              isAContainer: true,
              iri: 'foo2',

            },
          ],
          rejected: [
            {
              isAContainer: true,
              iri: 'foo1',
            },
          ],
        };

        const resp = await actor.filterResourcesFromShapeIndex(shapeIndex, context);
        // We just want to compare unordered arrays
        // eslint-disable-next-line ts/require-array-sort-compare
        expect(resp.accepted.sort()).toStrictEqual(expectedFilteredResource.accepted.sort());
        // We just want to compare unordered arrays
        // eslint-disable-next-line ts/require-array-sort-compare
        expect(resp.rejected.sort()).toStrictEqual(expectedFilteredResource.rejected.sort());
      });

      it('should ignore star pattern with names', async() => {
        const query = translate(`SELECT * WHERE { 
          ?x ?o ?z .
          <http://exemple.ca/Named> <http://exemple.ca/1> ?z .
          ?z <http://exemple.ca/2023> "abc" .
          ?w <http://exemple.ca/4> <http://objet.fr> .
          <http://sujet.cm> <http://predicat.cm> "def" .
          FILTER (year(?x) > 2000)
      }`);
        (<any>actor).query = generateQuery(query);

        const expectedFilteredResource = {
          accepted: [
            {

              isAContainer: true,
              iri: 'foo2',

            },
          ],
          rejected: [
            {
              isAContainer: true,
              iri: 'foo',
            },
            {
              isAContainer: true,
              iri: 'foo1',
            },
          ],
        };

        const resp = await actor.filterResourcesFromShapeIndex(shapeIndex, context);
        // We just want to compare unordered arrays
        // eslint-disable-next-line ts/require-array-sort-compare
        expect(resp.accepted.sort()).toStrictEqual(expectedFilteredResource.accepted.sort());
        // We just want to compare unordered arrays
        // eslint-disable-next-line ts/require-array-sort-compare
        expect(resp.rejected.sort()).toStrictEqual(expectedFilteredResource.rejected.sort());
      });

      it('should return an empty filter ressource result given an undefined query', async() => {
        const expectedFilteredResource = {
          accepted: [],
          rejected: [],
        };

        const resp = await actor.filterResourcesFromShapeIndex(shapeIndex, context);
        expect(resp).toStrictEqual(expectedFilteredResource);
      });

      describe(' A priori knowledge of the search domain', () => {
        it('should generate a filter over the domain given a complete shape index', async() => {
          const entries = new Map([
            [
              'foo',
              {
                isAContainer: true,
                iri: 'foo',
                shape: new Shape({
                  closed: true,
                  name: 'foo',
                  positivePredicates: [ 'http://exemple.ca/1', 'http://exemple.ca/2' ],
                  negativePredicates: [],
                }),
              },
            ],
            [
              'foo1',
              {
                isAContainer: true,
                iri: 'foo1',
                shape: new Shape({
                  closed: true,
                  name: 'foo1',
                  positivePredicates: [ 'http://exemple.ca/3', 'http://exemple.ca/2' ],
                  negativePredicates: [],
                }),
              },
            ],
            [
              'foo2',
              {

                isAContainer: true,
                iri: 'foo2',
                shape: new Shape({
                  closed: true,
                  name: 'foo2',
                  positivePredicates: [ 'http://exemple.ca/4', 'http://exemple.ca/5' ],
                  negativePredicates: [],
                }),
              },
            ],
          ]);

          const shapeIndex = {
            entries,
            domain,
            isComplete: true,
          };

          const query = translate('SELECT * WHERE { ?x ?o ?z }');
          (<any>actor).query = generateQuery(query);

          const expectedFilteredResource = {
            accepted: [
              {
                isAContainer: true,
                iri: 'foo',
              },
              {
                isAContainer: true,
                iri: 'foo1',
              },
              {

                isAContainer: true,
                iri: 'foo2',

              },
            ],
            rejected: [],
          };

          const resp = await actor.filterResourcesFromShapeIndex(shapeIndex, context);
          expect(resp).toStrictEqual(expectedFilteredResource);
          expect((<any>actor).filters.size).toBe(1);
          expect((<any>actor).filters.has(`${domain.source}_${ActorExtractLinksShapeIndex.ADAPTATIVE_REACHABILITY_LABEL}`)).toBe(true);
          const filter = (<any>actor).filters.get(`${domain.source}_${ActorExtractLinksShapeIndex.ADAPTATIVE_REACHABILITY_LABEL}`);

          const linkOutsideDomain = { url: 'foo' };
          expect(filter(linkOutsideDomain)).toBe(false);

          const linkInDomain = { url: 'http://localhost:3000/pods/00000000000000000065/asdasd/dasdad.json' };
          expect(filter(linkInDomain)).toBe(true);

          const linkInDomainProducedByShapeIndex = {
            url: 'http://localhost:3000/pods/00000000000000000065/asdasd/dasdad.json',
            metadata: {
              producedByActor: {
                name: actor.name,
              },
            },
          };
          expect(filter(linkInDomainProducedByShapeIndex)).toBe(false);
        });

        it('should generate a filter given incomplete shape index when the query is fully contained', async() => {
          const entries = new Map([
            [
              'foo',
              {
                isAContainer: true,
                iri: 'foo',
                shape: new Shape({
                  closed: true,
                  name: 'foo',
                  positivePredicates: [ 'http://exemple.ca/1', 'http://exemple.ca/2' ],
                  negativePredicates: [],
                }),
              },
            ],
            [
              'foo1',
              {
                isAContainer: true,
                iri: 'foo1',
                shape: new Shape({
                  closed: true,
                  name: 'foo1',
                  positivePredicates: [ 'http://exemple.ca/3', 'http://exemple.ca/7' ],
                  negativePredicates: [],
                }),
              },
            ],
            [
              'foo2',
              {

                isAContainer: true,
                iri: 'foo2',
                shape: new Shape({
                  closed: true,
                  name: 'foo2',
                  positivePredicates: [ 'http://exemple.ca/4', 'http://exemple.ca/5' ],
                  negativePredicates: [],
                }),
              },
            ],
          ]);

          const shapeIndex = {
            entries,
            domain,
            isComplete: false,
          };

          const query = translate(`SELECT * WHERE { 
            ?x <http://exemple.ca/7> ?z .
            ?w <http://exemple.ca/4> <http://objet.fr> .
            FILTER (year(?x) > 2000)
        }`);
          (<any>actor).query = generateQuery(query);

          const expectedFilteredResource = {
            accepted: [
              {

                isAContainer: true,
                iri: 'foo1',

              },
              {
                isAContainer: true,
                iri: 'foo2',
              },
            ],
            rejected: [
              {
                isAContainer: true,
                iri: 'foo',
              },
            ],
          };

          const resp = await actor.filterResourcesFromShapeIndex(shapeIndex, context);
          // We just want to compare unordered arrays
          // eslint-disable-next-line ts/require-array-sort-compare
          expect(resp.accepted.sort()).toStrictEqual(expectedFilteredResource.accepted.sort());
          // We just want to compare unordered arrays
          // eslint-disable-next-line ts/require-array-sort-compare
          expect(resp.rejected.sort()).toStrictEqual(expectedFilteredResource.rejected.sort());

          expect((<any>actor).filters.size).toBe(1);
          expect((<any>actor).filters.has(`${domain.source}_${ActorExtractLinksShapeIndex.ADAPTATIVE_REACHABILITY_LABEL}`)).toBe(true);
          const filter = (<any>actor).filters.get(`${domain.source}_${ActorExtractLinksShapeIndex.ADAPTATIVE_REACHABILITY_LABEL}`);

          const linkOutsideDomain = { url: 'foo' };
          expect(filter(linkOutsideDomain)).toBe(false);

          const linkInDomain = { url: 'http://localhost:3000/pods/00000000000000000065/asdasd/dasdad.json' };
          expect(filter(linkInDomain)).toBe(true);

          const linkInDomainProducedByShapeIndex = {
            url: 'http://localhost:3000/pods/00000000000000000065/asdasd/dasdad.json',
            metadata: {
              producedByActor: {
                name: actor.name,
              },
            },
          };
          expect(filter(linkInDomainProducedByShapeIndex)).toBe(false);
        });
      });
    });

    describe('discoverShapeIndexLocationFromTriples', () => {
      beforeEach(() => {
        bus = new Bus({ name: 'bus' });
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          cacheShapeIndexIri,
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
        await expect(actor.discoverShapeIndexLocationFromTriples(metadata)).resolves.toBeInstanceOf(Error);
      });

      it('should return an error given that the metadata stream return no quads', async() => {
        const metadata: any = new ArrayIterator([], { autoStart: false });
        await expect(actor.discoverShapeIndexLocationFromTriples(metadata)).resolves.toBeInstanceOf(Error);
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
        await expect(actor.discoverShapeIndexLocationFromTriples(metadata)).resolves.toBeInstanceOf(Error);
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
            ActorExtractLinksShapeIndex.SHAPE_INDEX_LOCATOR_NODE,
            DF.namedNode(shapetreeLocation),
          ),
          DF.quad(
            DF.blankNode(),
            DF.blankNode(),
            DF.blankNode(),
          ),
        ], { autoStart: false });
        await expect(actor.discoverShapeIndexLocationFromTriples(metadata)).resolves
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
          cacheShapeIndexIri,
        });

        await expect(actor.getResourceIriFromContainer(iri, context)).resolves.toBeInstanceOf(Error);
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
          cacheShapeIndexIri,
        });

        await expect(actor.getResourceIriFromContainer(iri, context)).resolves.toBeInstanceOf(Error);
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
          cacheShapeIndexIri,
        });

        await expect(actor.getResourceIriFromContainer(iri, context)).resolves.toStrictEqual([]);
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
              ),
            ], { autoStart: false }),
          })),
        };

        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          cacheShapeIndexIri,
        });

        await expect(actor.getResourceIriFromContainer(iri, context)).resolves.toStrictEqual([]);
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
                ActorExtractLinksShapeIndex.LDP_CONTAINS_NODE,
                DF.namedNode(iris[0]),
              ),
              DF.quad(
                DF.blankNode(),
                ActorExtractLinksShapeIndex.LDP_CONTAINS_NODE,
                DF.namedNode(iris[1]),
              ),
              DF.quad(
                DF.blankNode(),
                DF.blankNode(),
                DF.blankNode(),
              ),
              DF.quad(
                DF.blankNode(),
                ActorExtractLinksShapeIndex.LDP_CONTAINS_NODE,
                DF.namedNode(iris[2]),
              ),
            ], { autoStart: false }),
          })),
        };

        const linkPriority = 1;
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          cacheShapeIndexIri,
          linkPriority,
        });
        const expectedIris = iris.map((value) => {
          return { url: value, metadata: { [PRODUCED_BY_ACTOR]: { name: actor.name }, priority: linkPriority }};
        });

        await expect(actor.getResourceIriFromContainer(iri, context)).resolves
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
          cacheShapeIndexIri,
        });
        const filteredResources: any = {
          accepted: [],
          rejected,
        };
        await expect(actor.getIrisFromAcceptedEntries(filteredResources, context)).resolves
          .toStrictEqual([]);
      });

      it('should return iris given the accepted filters contain only non containers entries', async() => {
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          cacheShapeIndexIri,
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

        const expectedIri = accepted.map((value) => {
          return { url: value.iri, metadata: { [PRODUCED_BY_ACTOR]: { name: actor.name }, priority: undefined }};
        });

        await expect(actor.getIrisFromAcceptedEntries(filteredResources, context)).resolves
          .toStrictEqual(expectedIri);
      });

      it(`should return iris given the accepted filters contain containers entry 
      but the containers are not available`, async() => {
        const linkPriority = 33;
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          cacheShapeIndexIri,
          linkPriority,
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
        spy.mockResolvedValue(new Error('foo'));

        const expectedIri = [
          { url: 'foo', metadata: { [PRODUCED_BY_ACTOR]: { name: actor.name }, priority: linkPriority }},
          { url: 'foo2', metadata: { [PRODUCED_BY_ACTOR]: { name: actor.name }, priority: linkPriority }},
        ];

        await expect(actor.getIrisFromAcceptedEntries(filteredResources, context)).resolves
          .toStrictEqual(expectedIri);
        expect(spy).toHaveBeenCalledTimes(1);
      });

      it('should return iris given the accepted filters with multiple entries', async() => {
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          cacheShapeIndexIri,
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
        spy.mockResolvedValue(new Error('foo'));
        spy.mockResolvedValueOnce([
          { url: 'foo1', metadata: { [PRODUCED_BY_ACTOR]: { name: actor.name }, priority: undefined }},
          { url: 'foo10', metadata: { [PRODUCED_BY_ACTOR]: { name: actor.name }, priority: undefined }},
        ]);
        const expectedIri = [ 'foo', 'foo2', 'foo1', 'foo10' ].map((value) => {
          return { url: value, metadata: { [PRODUCED_BY_ACTOR]: { name: actor.name }, priority: undefined }};
        });

        await expect(actor.getIrisFromAcceptedEntries(filteredResources, context)).resolves
          .toStrictEqual(expectedIri);
        expect(spy).toHaveBeenCalledTimes(2);
      });
    });

    describe('addRejectedEntryFilters', () => {
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
          cacheShapeIndexIri,
        });
      });

      it('should return no filters given there is no rejected resource', () => {
        const filteredResources = {
          accepted,
          rejected: [],
        };
        actor.addRejectedEntryFilters(filteredResources);
        expect(actor.getFilters().size).toBe(0);
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
        for (const indexEntry of rejected) {
          expectedFilters.set(indexEntry.iri, '(iri: string) => iri === indexEntry.iri');
        }
        actor.addRejectedEntryFilters(filteredResources);

        // I don't know another way to check if the two functions are the same
        for (const [ key, val ] of actor.getFilters()) {
          expect(val({ url: key })).toBe(true);
          expect(val({ url: 'foo' })).toBe(false);
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
        for (const indexEntry of rejected) {
          expectedFilters.set(indexEntry.iri, true);
        }
        actor.addRejectedEntryFilters(filteredResources);

        // I don't know another way to check if the two functions are the same
        for (const [ key, val ] of actor.getFilters()) {
          expect(expectedFilters.has(key)).toBeDefined();
          expect(val({ url: key })).toBe(true);
          expect(val({ url: 'val' })).toBe(false);
          expect(val({ url: `${key}abc` })).toBe(true);
          expect(val({ url: `${key}abc/abd` })).toBe(false);
        }
      });

      it('should return filters given mutltiple rejected resources', () => {
        const rejected = [
          {
            iri: 'http://example.com/rfoo',
            isAContainer: true,
          },
          {
            iri: 'http://example.com/rfoo1',
            isAContainer: false,
          },
          {
            iri: 'http://example.com/rfoo2',
            isAContainer: true,
          },
        ];
        const filteredResources = {
          accepted,
          rejected,
        };
        const expectedFilters = new Map();
        for (const indexEntry of rejected) {
          if (indexEntry.isAContainer) {
            expectedFilters.set(indexEntry.iri, 'container');
          } else {
            expectedFilters.set(indexEntry.iri, 'file');
          }
        }
        actor.addRejectedEntryFilters(filteredResources);

        // I don't know another way to check if the two functions are the same
        for (const [ key, val ] of actor.getFilters()) {
          const index = expectedFilters.get(key);
          expect(index).toBeDefined();

          /* eslint-disable jest/no-conditional-expect */
          if (index === 'container') {
            expect(val({ url: 'val' })).toBe(false);
            expect(val({ url: `${key}abc` })).toBe(true);
            expect(val({ url: `${key}abc/abd` })).toBe(false);
          } else {
            expect(val({ url: key })).toBe(true);
            expect(val({ url: 'foo' })).toBe(false);
          }
          /* eslint-enable jest/no-conditional-expect */
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
          cacheShapeIndexIri,
        });
        const spyDiscover = jest.spyOn(actor, 'discoverShapeIndexLocationFromTriples');
        spyDiscover.mockResolvedValue(new Error('foo'));

        const getContext = jest.fn((key: any) => {
          if (key === KeysInitQuery.query) {
            return translate('SELECT * WHERE { ?x ?o ?z }');
          }
          if (KeysFilter.filters) {
            return undefined;
          }
        });

        const action: any = {
          metadata: jest.fn(),
          context: {
            getSafe: getContext,
            get: getContext,
            set: jest.fn().mockReturnThis(),
          },
        };

        await expect(actor.run(action)).resolves.toStrictEqual({ links: []});
      });

      it('should return an empty link array given that we cannot generate shape index', async() => {
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          cacheShapeIndexIri,
        });
        const spyDiscover = jest.spyOn(actor, 'discoverShapeIndexLocationFromTriples');
        spyDiscover.mockResolvedValueOnce('foo');
        const spyGenerateShapeIndex = jest.spyOn(actor, 'generateShapeIndex');
        spyGenerateShapeIndex.mockResolvedValue(new Error('foo'));

        const getContext = jest.fn((key: any) => {
          if (key === KeysInitQuery.query) {
            return translate('SELECT * WHERE { ?x ?o ?z }');
          }
          if (KeysFilter.filters) {
            return undefined;
          }
        });
        const action: any = {
          metadata: jest.fn(),
          context: {
            getSafe: getContext,
            get: getContext,
            set: jest.fn().mockReturnThis(),
          },
        };

        await expect(actor.run(action)).resolves.toStrictEqual({ links: []});
      });

      it('should return an empty link array given that we cannot add the accepted IRI to the link queue', async() => {
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          cacheShapeIndexIri,
        });
        const spyDiscover = jest.spyOn(actor, 'discoverShapeIndexLocationFromTriples');
        spyDiscover.mockResolvedValueOnce('foo');
        const spyGenerateShapeIndex = jest.spyOn(actor, 'generateShapeIndex');
        spyGenerateShapeIndex.mockImplementation(() => {
          return new Promise((resolve) => {
            resolve(<any>'');
          });
        });

        jest.spyOn(actor, 'filterResourcesFromShapeIndex').mockReturnValueOnce({
          accepted: [],
          rejected: [],
        });
        jest.spyOn(actor, 'addRejectedEntryFilters');
        const spygetResourceIriFromContainer = jest.spyOn(actor, 'getResourceIriFromContainer');
        spygetResourceIriFromContainer.mockResolvedValue(new Error('foo'));

        const getContext = jest.fn((key: any) => {
          if (key === KeysInitQuery.query) {
            return translate('SELECT * WHERE { ?x ?o ?z }');
          }
          if (KeysFilter.filters) {
            return new Map([[ 'a', () => true ]]);
          }
        });
        const action: any = {
          metadata: jest.fn(),
          context: {
            getSafe: getContext,
            get: getContext,
            set: jest.fn().mockReturnThis(),
          },
        };

        await expect(actor.run(action)).resolves.toStrictEqual({ links: []});
        expect(actor.getFilters().has('a')).toBe(true);
      });

      it('should return a link array given all the shape filter process succeeded', async() => {
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          cacheShapeIndexIri,
        });
        const spyDiscover = jest.spyOn(actor, 'discoverShapeIndexLocationFromTriples');
        spyDiscover.mockResolvedValueOnce('foo');
        const spyGenerateShapeIndex = jest.spyOn(actor, 'generateShapeIndex');
        spyGenerateShapeIndex.mockResolvedValueOnce({ isComplete: false, domain: /.*/u, entries: new Map() });
        jest.spyOn(actor, 'filterResourcesFromShapeIndex').mockReturnValueOnce({
          accepted: [],
          rejected: [],
        });
        jest.spyOn(actor, 'addRejectedEntryFilters');
        const spyAddIri = jest.spyOn(actor, 'getIrisFromAcceptedEntries');
        spyAddIri.mockResolvedValueOnce([{ url: 'foo' }]);

        const getContext = jest.fn((key: any) => {
          if (key === KeysInitQuery.query) {
            return translate('SELECT * WHERE { ?x ?o ?z }');
          }
          if (KeysFilter.filters) {
            return undefined;
          }
        });

        const action: any = {
          metadata: jest.fn(),
          context: {
            getSafe: getContext,
            get: getContext,
            set: jest.fn().mockReturnThis(),
          },
        };

        await expect(actor.run(action)).resolves.toStrictEqual({ links: [{ url: 'foo' }]});
      });

      it('should handle the change of query', async() => {
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          cacheShapeIndexIri,
        });
        const spyDiscover = jest.spyOn(actor, 'discoverShapeIndexLocationFromTriples');
        spyDiscover.mockResolvedValue('foo');
        const spyGenerateShapeIndex = jest.spyOn(actor, 'generateShapeIndex');
        spyGenerateShapeIndex.mockResolvedValue({ isComplete: false, domain: /.*/u, entries: new Map() });
        jest.spyOn(actor, 'filterResourcesFromShapeIndex').mockReturnValue({
          accepted: [],
          rejected: [],
        });
        jest.spyOn(actor, 'addRejectedEntryFilters');
        const spyAddIri = jest.spyOn(actor, 'getIrisFromAcceptedEntries');
        spyAddIri.mockResolvedValue([{ url: 'foo' }]);

        let i = 0;
        const firstQuery = translate(`SELECT * WHERE { ?x ?o ?z }`);
        const secondQuery = translate(`
          SELECT * WHERE { 
            ?x ?o ?z .
            ?x <http://exemple.ca/1> ?z .
            ?z <http://exemple.ca/2023> "abc" .
            ?w <http://exemple.ca/4> <http://objet.fr> .
            <http://sujet.cm> <http://predicat.cm> "def" .
            FILTER (year(?x) > 2000)
        }`);

        const getContext = jest.fn((key: any) => {
          if (key === KeysInitQuery.query) {
            i += 1;
            if (i === 1) {
              return firstQuery;
            }
            return secondQuery;
          }
          if (KeysFilter.filters) {
            return undefined;
          }
        });

        const action: any = {
          metadata: jest.fn(),
          context: {
            getSafe: getContext,
            get: getContext,
            set: jest.fn().mockReturnThis(),
          },
        };

        await expect(actor.run(action)).resolves.toStrictEqual({ links: [{ url: 'foo' }]});
        expect((<any>actor).query).toStrictEqual(generateQuery(firstQuery));

        spyAddIri.mockResolvedValue([{ url: 'bar' }]);
        await expect(actor.run(action)).resolves.toStrictEqual({ links: [{ url: 'bar' }]});
        expect((<any>actor).query).toStrictEqual(generateQuery(secondQuery));
      });

      it('should return an empty link array given the shape index has already been handled', async() => {
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          cacheShapeIndexIri: true,
        });

        const spyDiscover = jest.spyOn(actor, 'discoverShapeIndexLocationFromTriples');
        spyDiscover.mockResolvedValue('foo');
        jest.spyOn(actor, 'addRejectedEntryFilters');
        jest.spyOn(actor, 'generateShapeIndex').mockResolvedValue({
          isComplete: false,
          domain: /https:\/\/example.qc.ca\/.*/u,
          entries: new Map(),
        });

        const spyAddIri = jest.spyOn(actor, 'getIrisFromAcceptedEntries');
        spyAddIri.mockResolvedValue([{ url: 'foo' }]);

        const getContext = jest.fn((key: any) => {
          if (key === KeysInitQuery.query) {
            return translate('SELECT * WHERE { ?x ?o ?z }');
          }
          if (KeysFilter.filters) {
            return actor.getFilters();
          }
        });
        const action: any = {
          metadata: jest.fn(),
          context: {
            getSafe: getContext,
            get: getContext,
            set: jest.fn().mockReturnThis(),
          },
        };
        await expect(actor.run(action)).resolves.toStrictEqual({ links: [{ url: 'foo' }]});
        await expect(actor.run(action)).resolves.toStrictEqual({ links: []});
      });
    });

    describe('getFilters', () => {
      beforeEach(() => {
        bus = new Bus({ name: 'bus' });
        actor = new ActorExtractLinksShapeIndex({
          name: 'actor',
          bus,
          mediatorDereferenceRdf,
          cacheShapeIndexIri,
        });
      });

      it('should get a deep copy of the filter', () => {
        const filters: any = new Map([[ 'a', () => true ]]);
        (<any>actor).filters = filters;
        const resp: any = actor.getFilters();

        expect(resp).toStrictEqual(filters);
        filters.set('W', () => false);
        expect(resp).not.toStrictEqual(filters);
      });
    });
  });
});

async function rdfFromJsonLDString(jsonld: string): Promise<RDF.Quad[]> {
  return new Promise((resolve, rejects) => {
    const quads: RDF.Quad[] = [];
    const contextParser = new ContextParser({
      documentLoader: new FetchDocumentLoader(),
      skipValidation: true,
      expandContentTypeToBase: true,
      remoteContextsDepthLimit: 1,
    });

    contextParser.parse([ SHEX_CONTEXT ]).then((context) => {
      const jsonldParser = new JsonLdParser({
        streamingProfile: false,
        context,
        skipContextValidation: true,
      });
      jsonldParser
        .on('data', (quad: RDF.Quad) => {
          quads.push(quad);
        })
        .on('error', (error: any) => {
          rejects(error);
        })
        .on('end', () => {
          resolve(quads);
        });

      jsonldParser.write(jsonld);
      jsonldParser.end();
    }).catch((err: any) => rejects(err));
  });
}
