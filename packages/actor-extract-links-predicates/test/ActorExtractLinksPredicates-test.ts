import type { Readable } from 'node:stream';
import { KeysDeactivateLinkExtractor } from '@comunica/context-entries-link-traversal';
import { ActionContext, Bus } from '@comunica/core';
import { EVERY_REACHABILITY_CRITERIA, PRODUCED_BY_ACTOR } from '@comunica/types-link-traversal';
import { ActorExtractLinksPredicates } from '../lib/ActorExtractLinksPredicates';

const quad = require('rdf-quad');
const stream = require('streamify-array');

describe('ActorExtractLinksTraversePredicates', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorExtractLinksTraversePredicates instance with check subject', () => {
    let actor: ActorExtractLinksPredicates;
    let input: Readable;
    let predicateRegexes: string[];

    beforeEach(() => {
      predicateRegexes = [
        'http://www.w3.org/ns/ldp#contains',
      ];
      actor = new ActorExtractLinksPredicates({
        name: 'actor',
        bus,
        checkSubject: true,
        predicateRegexes,
      });
      input = stream([
        quad('ex:s', 'http://www.w3.org/ns/ldp#contains', 'ex:r1', 'ex:gx'),
        quad('ex:s#abc', 'http://www.w3.org/ns/ldp#contains', 'ex:r2'),
        quad('ex:s', 'ex:px', 'ex:r3'),
        quad('ex:s2', 'http://www.w3.org/ns/ldp#contains', 'ex:r3'),
      ]);
    });
    describe('test', () => {
      it('should test if there is no deactivation map in the context', async() => {
        await expect(actor.test({ url: 'ex:s', metadata: input, requestTime: 0, context: new ActionContext() }))
          .resolves.toBe(true);
      });

      it('should test if the predicate actor is not in the deactivation map', async() => {
        const context = new ActionContext()
          .set(KeysDeactivateLinkExtractor.deactivate, new Map(
            [[ 'foo', { actorParam: new Map(), urls: new Set([ '' ]), urlPatterns: [ /.*/u ]}]],
          ));
        await expect(actor.test({ url: 'ex:s', metadata: input, requestTime: 0, context }))
          .resolves.toBe(true);
      });

      it('should not test if the right url is targeted', async() => {
        const context = new ActionContext()
          .set(KeysDeactivateLinkExtractor.deactivate, new Map(
            [[ actor.name, { actorParam: new Map([]), urls: new Set([ 'ex:s' ]), urlPatterns: [ /.*/u ]}]],
          ));
        await expect(actor.test({ url: 'ex:s', metadata: input, requestTime: 0, context }))
          .rejects.toThrow('the extractor has been deactivated');
      });

      it('should not test if the right url is targeted given all the reachability criteria are targeted', async() => {
        const context = new ActionContext()
          .set(KeysDeactivateLinkExtractor.deactivate, new Map(
            [
              [
                EVERY_REACHABILITY_CRITERIA,
                { actorParam: new Map([]), urls: new Set([ 'ex:s' ]), urlPatterns: [ /.*/u ]},
              ],
            ],
          ));
        await expect(actor.test({ url: 'ex:s', metadata: input, requestTime: 0, context }))
          .rejects.toThrow('the extractor has been deactivated');
      });

      it('should not test if the right url regex is targeted', async() => {
        const context = new ActionContext()
          .set(KeysDeactivateLinkExtractor.deactivate, new Map(
            [
              [ actor.name, { actorParam: new Map([[ 'predicates', new Set(predicateRegexes) ]]), urls: new Set([ 'ex:s' ]), urlPatterns: [ new RegExp(`${'ex:s/.*'}`, 'u') ]}],
            ],
          ));
        await expect(actor.test({ url: 'ex:s/foo/bar', metadata: input, requestTime: 0, context }))
          .rejects.toThrow('the extractor has been deactivated');
      });

      it(`should not test if the right url regex is targeted 
      given all the reachability criteria are targeted`, async() => {
        const context = new ActionContext()
          .set(KeysDeactivateLinkExtractor.deactivate, new Map(
            [
              [
                EVERY_REACHABILITY_CRITERIA,
                { actorParam: new Map([[ 'predicates', new Set(predicateRegexes) ]]), urls: new Set([ 'ex:s' ]), urlPatterns: [ new RegExp(`${'ex:s/.*'}`, 'u') ]},
              ],
            ],
          ));
        await expect(actor.test({ url: 'ex:s/foo/bar', metadata: input, requestTime: 0, context }))
          .rejects.toThrow('the extractor has been deactivated');
      });

      it('should test if the right actor is targeted by with the wrong url', async() => {
        const context = new ActionContext()
          .set(KeysDeactivateLinkExtractor.deactivate, new Map(
            [[ actor.name, { actorParam: new Map([]), urls: new Set([ 'ex:s' ]), urlPatterns: [ /ex:s\/.*/u ]}]],
          ));
        await expect(actor.test({ url: 'ex:sb', metadata: input, requestTime: 0, context }))
          .resolves.toBe(true);
      });

      it(`should test if the right actor is targeted by with the wrong url 
      given all the reachability criteria are targeted`, async() => {
        const context = new ActionContext()
          .set(KeysDeactivateLinkExtractor.deactivate, new Map(
            [
              [
                EVERY_REACHABILITY_CRITERIA,
                { actorParam: new Map([]), urls: new Set([ 'ex:s' ]), urlPatterns: [ /ex:s\/.*/u ]},
              ],
            ],
          ));
        await expect(actor.test({ url: 'ex:sb', metadata: input, requestTime: 0, context }))
          .resolves.toBe(true);
      });
    });

    it('should run on a stream and return all ldp:contains values', async() => {
      await expect(actor.run({ url: 'ex:s', metadata: input, requestTime: 0, context: new ActionContext() })).resolves
        .toEqual({
          links: [
            { url: 'ex:r1' },
            { url: 'ex:r2' },
          ].map((link) => {
            return {
              ...link,
              metadata: {
                [PRODUCED_BY_ACTOR]: {
                  name: actor.name,
                  predicates: predicateRegexes,
                  matchingPredicate: 'http://www.w3.org/ns/ldp#contains',
                  checkSubject: true,
                },
              },
            };
          }),
        });
    });
  });

  describe('An ActorExtractLinksTraversePredicates instance without check subject', () => {
    let actor: ActorExtractLinksPredicates;
    let input: Readable;
    let predicateRegexes: string[];

    beforeEach(() => {
      predicateRegexes = [
        'http://www.w3.org/ns/ldp#contains',
      ];
      actor = new ActorExtractLinksPredicates({
        name: 'actor',
        bus,
        checkSubject: false,
        predicateRegexes,
      });
      input = stream([
        quad('ex:s', 'http://www.w3.org/ns/ldp#contains', 'ex:r1', 'ex:gx'),
        quad('ex:s', 'http://www.w3.org/ns/ldp#contains', 'ex:r2'),
        quad('ex:s', 'ex:px', 'ex:r3'),
        quad('ex:s2', 'http://www.w3.org/ns/ldp#contains', 'ex:r3'),
      ]);
    });

    it('should run on a stream and return all ldp:contains values', async() => {
      await expect(actor.run({ url: 'ex:s', metadata: input, requestTime: 0, context: new ActionContext() })).resolves
        .toEqual({
          links: [
            { url: 'ex:r1' },
            { url: 'ex:r2' },
            { url: 'ex:r3' },
          ].map((link) => {
            return {
              ...link,
              metadata: {
                [PRODUCED_BY_ACTOR]: {
                  name: actor.name,
                  predicates: predicateRegexes,
                  matchingPredicate: 'http://www.w3.org/ns/ldp#contains',
                  checkSubject: false,
                },
              },
            };
          }),
        });
    });
  });
});
