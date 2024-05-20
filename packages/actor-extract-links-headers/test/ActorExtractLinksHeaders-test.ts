import type { Readable } from 'node:stream';
import { KeysDeactivateLinkExtractor } from '@comunica/context-entries-link-traversal';
import { ActionContext, Bus } from '@comunica/core';
import { EVERY_REACHABILITY_CRITERIA } from '@comunica/types-link-traversal';
import { ActorExtractLinksHeaders } from '../lib/ActorExtractLinksHeaders';

const quad = require('rdf-quad');
const stream = require('streamify-array');

describe('ActorExtractLinksHeaders', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorExtractLinksHeaders instance with check subject', () => {
    let actor: ActorExtractLinksHeaders;
    let inputMetadata: Readable;
    let input: Headers;

    beforeEach(() => {
      actor = new ActorExtractLinksHeaders({
        name: 'actor',
        bus,
        headersRegexes: [
          'rel="describedby"',
        ],
      });
      inputMetadata = stream([]);
      input = new Headers();
      input.append('Content-Type', 'text-turtle');
      input.append('Location', '/storage/resource');
      input.append('Content-Length', '1024');
      input.append('Link', '</storage/resource.meta>;rel="describedby"');
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
            [
              [
                actor.name,
                { actorParam: new Map([]), urls: new Set([ 'ex:s' ]), urlPatterns: [ /ex:s\/.*/u ]},
              ],
            ],
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

    it('should run on headers and return all describedby values', async() => {
      await expect(actor.run({ url: 'http://pod.example.com/storage/resource', metadata: inputMetadata, headers: input, requestTime: 0, context: new ActionContext() })).resolves
        .toEqual({
          links: [
            { url: 'http://pod.example.com/storage/resource.meta' },
          ],
        });
    });
  });
});
