import type { Readable } from 'node:stream';
import { ActorExtractLinks } from '@comunica/bus-extract-links';
import { KeysDeactivateLinkExtractor } from '@comunica/context-entries-link-traversal';
import { ActionContext, Bus } from '@comunica/core';
import { EVERY_REACHABILITY_CRITERIA, PRODUCED_BY_ACTOR } from '@comunica/types-link-traversal';
import { ActorExtractLinksAll } from '../lib/ActorExtractLinksAll';

const quad = require('rdf-quad');
const stream = require('streamify-array');

describe('ActorExtractLinksAll', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorExtractLinksAll module', () => {
    it('should be a function', () => {
      expect(ActorExtractLinksAll).toBeInstanceOf(Function);
    });

    it('should be a ActorExtractLinksAll constructor', () => {
      expect(new (<any>ActorExtractLinksAll)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorExtractLinksAll);
      expect(new (<any>ActorExtractLinksAll)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorExtractLinks);
    });

    it('should not be able to create new ActorExtractLinksAll objects without \'new\'', () => {
      expect(() => {
        (<any>ActorExtractLinksAll)();
      }).toThrow(`Class constructor ActorExtractLinksAll cannot be invoked without 'new'`);
    });
  });

  describe('An ActorExtractLinksAll instance', () => {
    let actor: ActorExtractLinksAll;
    let input: Readable;

    beforeEach(() => {
      actor = new ActorExtractLinksAll({ name: 'actor', bus });
      input = stream([
        quad('ex:s1', 'ex:px', 'ex:o1', 'ex:gx'),
        quad('ex:s2', 'ex:p', '"o"', 'ex:g'),
        quad('ex:s3', 'ex:px', 'ex:o3', 'ex:gx'),
        quad('ex:s4', 'ex:p', 'ex:o4', 'ex:g'),
        quad('ex:s5', 'ex:p', 'ex:o5', 'ex:gx'),
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
              [ actor.name, { actorParam: new Map(), urls: new Set([ 'ex:s' ]), urlPatterns: [ new RegExp(`${'ex:s/.*'}`, 'u') ]}],
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
                { actorParam: new Map(), urls: new Set([ 'ex:s' ]), urlPatterns: [ new RegExp(`${'ex:s/.*'}`, 'u') ]},
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

    it('should run on a stream and return all urls', async() => {
      await expect(actor.run({ url: '', metadata: input, requestTime: 0, context: new ActionContext() })).resolves
        .toEqual({
          links: [
            { url: 'ex:s1' },
            { url: 'ex:px' },
            { url: 'ex:o1' },
            { url: 'ex:gx' },
            { url: 'ex:s2' },
            { url: 'ex:p' },
            { url: 'ex:g' },
            { url: 'ex:s3' },
            { url: 'ex:px' },
            { url: 'ex:o3' },
            { url: 'ex:gx' },
            { url: 'ex:s4' },
            { url: 'ex:p' },
            { url: 'ex:o4' },
            { url: 'ex:g' },
            { url: 'ex:s5' },
            { url: 'ex:p' },
            { url: 'ex:o5' },
            { url: 'ex:gx' },
          ].map((link) => {
            return { ...link, metadata: { [PRODUCED_BY_ACTOR]: { name: actor.name }}};
          }),
        });
    });
  });
});
