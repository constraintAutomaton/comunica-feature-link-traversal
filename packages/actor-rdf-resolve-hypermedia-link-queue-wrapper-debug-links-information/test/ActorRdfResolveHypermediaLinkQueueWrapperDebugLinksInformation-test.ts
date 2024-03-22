import { Bus, ActionContext } from '@comunica/core';
import { ActorRdfResolveHypermediaLinksQueueWrapperDebugLinksInformation,
  KEY_CONTEXT_WRAPPED } from '../lib/ActorRdfResolveHypermediaLinkQueueWrapperDebugLinksInformation';
import { LinkQueueSaveOnDiskInfo } from '../lib/LinkQueueSaveOnDiskInfo';

describe('ActorRdfResolveHypermediaLinksQueueRdfResolveHypermediaLinkQueueWrapperDebugLinksInformation', () => {
  let bus: any;
  const filePath = 'bar.json';

  describe('ActorRdfResolveHypermediaLinkQueueWrapperDebugLinksInformation instance', () => {
    let actor: any;

    describe('test', () => {
      const mediatorRdfResolveHypermediaLinksQueue: any = {};
      beforeEach(() => {
        bus = new Bus({ name: 'bus' });
        actor = new ActorRdfResolveHypermediaLinksQueueWrapperDebugLinksInformation({
          name: 'actor',
          bus,
          filePath,
          mediatorRdfResolveHypermediaLinksQueue,
        });
      });

      it('should test', () => {
        return expect(actor.test({ firstUrl: 'first', context: new ActionContext() })).resolves.toBeTruthy();
      });

      it('should not test when called recursively', () => {
        return expect(actor.test({
          firstUrl: 'first',
          context: new ActionContext({
            [KEY_CONTEXT_WRAPPED.name]: true,
          }),
        })).rejects.toThrowError('Unable to wrap link queues multiple times');
      });
    });

    describe('run', () => {
      let action: any;
      const linkQueue: any = {
        isEmpty: () => true,
      };

      beforeEach(() => {
        action = {
          context: {
            set: jest.fn(),
            get: jest.fn().mockReturnValue('foo'),
          },
        };
      });

      it('should rejects given the mediator promise is rejected', async() => {
        const mediator: any = {
          mediate: jest.fn().mockRejectedValueOnce(new Error('foo')),
        };

        actor = new ActorRdfResolveHypermediaLinksQueueWrapperDebugLinksInformation({
          name: 'actor',
          bus,
          filePath,
          mediatorRdfResolveHypermediaLinksQueue: mediator,
        });

        await expect(actor.run(action)).rejects.toBeInstanceOf(Error);
      });

      it('should returns the link queue and add the context wrapped flag in the context', async() => {
        const mediator: any = {
          mediate: jest.fn().mockResolvedValueOnce({ linkQueue }),
        };

        actor = new ActorRdfResolveHypermediaLinksQueueWrapperDebugLinksInformation({
          name: 'actor',
          bus,
          filePath,
          mediatorRdfResolveHypermediaLinksQueue: mediator,
        });
        // The hash of foo the mock query
        const expectedFilePath = 'bar_acbd18db4cc2f85cedef654fccc4a4d8.json';

        const expectedLinkQueueWrapper = new LinkQueueSaveOnDiskInfo(linkQueue, expectedFilePath);

        expect(await actor.run(action)).toStrictEqual({ linkQueue: expectedLinkQueueWrapper });
        expect(action.context.set).toHaveBeenCalledTimes(1);
        expect(action.context.set).toHaveBeenLastCalledWith(KEY_CONTEXT_WRAPPED, true);
      });
    });
  });
});
