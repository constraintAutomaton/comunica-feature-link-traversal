import { Bus, ActionContext } from '@comunica/core';
import { ActorRdfResolveHypermediaLinksQueueWrapperFilterLinks, KEY_CONTEXT_WRAPPED }
  from '../lib/ActorRdfResolveHypermediaLinksQueueWrapperFilterLinks';
import { LinkQueueFilterLinks } from '../lib/LinkQueueFilterLinks';

describe('ActorRdfResolveHypermediaLinksQueueWrapperFilterLinks', () => {
  let bus: any;

  describe('An ActorRdfResolveHypermediaLinksQueueWrapperFilterLinks instance', () => {
    let actor: ActorRdfResolveHypermediaLinksQueueWrapperFilterLinks;

    describe('test', () => {
      const mediatorRdfResolveHypermediaLinksQueue: any = {};
      beforeEach(() => {
        bus = new Bus({ name: 'bus' });
        actor = new ActorRdfResolveHypermediaLinksQueueWrapperFilterLinks({
          name: 'actor',
          bus,
          mediatorRdfResolveHypermediaLinksQueue,
        });
      });
      it('should test', async() => {
        await expect(actor.test({ firstUrl: 'first', context: new ActionContext() })).resolves.toBe(true);
      });

      it('should not test when called recursively', async() => {
        await expect(actor.test({
          firstUrl: 'first',
          context: new ActionContext({
            [KEY_CONTEXT_WRAPPED.name]: true,
          }),
        })).rejects.toThrow('Unable to wrap link queues multiple times');
      });
    });

    describe('run', () => {
      let action: any;
      const linkQueue: any = {
        isEmpty: jest.fn().mockReturnValue(true),
      };

      beforeEach(() => {
        action = {
          context: {
            set: jest.fn(),
            get: jest.fn(),
          },
        };
      });

      it('should rejects given the mediator promise is rejected', async() => {
        const mediator: any = {
          mediate: jest.fn().mockRejectedValueOnce(new Error('foo')),
        };

        actor = new ActorRdfResolveHypermediaLinksQueueWrapperFilterLinks({
          name: 'actor',
          bus,
          mediatorRdfResolveHypermediaLinksQueue: mediator,
        });

        await expect(actor.run(action)).rejects.toBeInstanceOf(Error);
      });

      it('should rejects given there is no filter map', async() => {
        const mediator: any = {
          mediate: jest.fn().mockResolvedValueOnce(linkQueue),
        };

        actor = new ActorRdfResolveHypermediaLinksQueueWrapperFilterLinks({
          name: 'actor',
          bus,
          mediatorRdfResolveHypermediaLinksQueue: mediator,
        });

        (<jest.Mock>action.context.get).mockReturnValueOnce(undefined);

        await expect(actor.run(action)).rejects.toBeInstanceOf(Error);
      });

      it('should returns the link queue and add the context wrapped flag in the context', async() => {
        const mediator: any = {
          mediate: jest.fn().mockResolvedValueOnce({ linkQueue }),
        };

        actor = new ActorRdfResolveHypermediaLinksQueueWrapperFilterLinks({
          name: 'actor',
          bus,
          mediatorRdfResolveHypermediaLinksQueue: mediator,
        });

        (<jest.Mock>action.context.get).mockReturnValue(new Map());

        const expectedLinkQueueWrapper = new LinkQueueFilterLinks(linkQueue, new Map(), undefined);

        await expect(actor.run(action)).resolves.toStrictEqual({ linkQueue: expectedLinkQueueWrapper });
        expect(action.context.set).toHaveBeenCalledTimes(1);
        expect(action.context.set).toHaveBeenLastCalledWith(KEY_CONTEXT_WRAPPED, true);
      });
    });
  });
});
