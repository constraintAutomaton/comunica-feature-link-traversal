import type { ILink } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import { LinkQueueFilterLinks } from '../lib/LinkQueueFilterLinks';

describe('LinkQueueFilterLinks', () => {
  describe('constructor', () => {
    it('should return an error given that the wrapped link queue have a non null size', () => {
      const linkqueue: any = {
        isEmpty: () => false,
      };
      const filterMap: any = new Map();
      expect(() => new LinkQueueFilterLinks(linkqueue, filterMap))
        .toThrow('the wrapped link queue should be empty upon construction of the wrapper');
    });

    it('construct the linkqueue and the filter map should be a reference', () => {
      const linkqueue: any = {
        isEmpty: () => true,
      };
      const filterMap: Map<string, any> = new Map();
      const wrapper = new LinkQueueFilterLinks(linkqueue, filterMap);
      expect(wrapper.filterMap).toStrictEqual(filterMap);
      filterMap.set('foo', 'bar');
      expect(wrapper.filterMap).toStrictEqual(filterMap);
    });
  });

  describe('push', () => {
    let linkQueue: LinkQueueFilterLinks;
    let wrappedLinkQueue: any;
    let filterMap: Map<string, any> = new Map();

    beforeEach(() => {
      wrappedLinkQueue = {
        push: jest.fn().mockReturnValue(true),
        isEmpty: jest.fn().mockReturnValueOnce(true),
      };
      filterMap = new Map();

      linkQueue = new LinkQueueFilterLinks(wrappedLinkQueue, filterMap);
    });

    it('not push a link if there is a filter for the link', () => {
      const link: any = { url: 'foo' };
      const parent: any = { url: 'parent' };
      filterMap.set('foo', () => false);
      filterMap.set('foo', () => true);
      filterMap.set('bar', () => false);

      expect(linkQueue.push(link, parent)).toBe(false);

      expect(linkQueue.isEmpty()).toBe(true);
    });

    it('should push the link if there is no filter', () => {
      (<jest.Mock> wrappedLinkQueue.isEmpty).mockReturnValue(false);
      const link: any = { url: 'foo' };
      const parent: any = { url: 'parent' };
      expect(linkQueue.push(link, parent)).toBe(true);

      expect(linkQueue.filterMap).toStrictEqual(new Map());
      expect(linkQueue.getSize()).toBe(1);
    });

    it('should push the link if all the filter accept the link', () => {
      const link: any = { url: 'foo' };
      const parent: any = { url: 'parent' };
      filterMap.set('foo', () => false);
      filterMap.set('foo', () => false);
      filterMap.set('bar', () => false);

      expect(linkQueue.push(link, parent)).toBe(true);

      expect(linkQueue.getSize()).toBe(1);
    });

    it(`should remove from the queue a link that have been accepted 
    given a filter refusing the link is added and should not be able to push again the link`, () => {
      const link: any = { url: 'foo' };
      const parent: any = { url: 'parent' };
      filterMap.set('foo', () => false);
      filterMap.set('foo', () => false);
      filterMap.set('bar', () => false);

      expect(linkQueue.push(link, parent)).toBe(true);

      expect(linkQueue.getSize()).toBe(1);

      filterMap.set('bar', () => true);
      expect(linkQueue.getSize()).toBe(0);

      expect(linkQueue.push(link, parent)).toBe(false);
      expect(linkQueue.getSize()).toBe(0);
    });

    it('should be able to push multiple links', () => {
      const links: any[] = [{ url: 'foo' }, { url: 'foo1' }, { url: 'foo2' }];
      const parent: any = { url: 'parent' };
      filterMap.set('foo', () => false);

      for (const link of links) {
        expect(linkQueue.push(link, parent)).toBe(true);
      }
      expect(linkQueue.getSize()).toBe(links.length);
    });

    it('should be able to reject multiple links', () => {
      const links: any[] = [{ url: 'foo' }, { url: 'foo1' }, { url: 'foo2' }];
      const parent: any = { url: 'parent' };
      filterMap.set('foo', () => true);

      for (const link of links) {
        expect(linkQueue.push(link, parent)).toBe(false);
      }
      expect(linkQueue.isEmpty()).toBe(true);
    });

    it('should be able to accept and reject multiple links', () => {
      const links: any[] = [{ url: 'foo' }, { url: 'foo1' }, { url: 'foo2' }];
      const parent: any = { url: 'parent' };
      filterMap.set('foo', (iri) => {
        return iri.url === 'foo1';
      });

      for (const link of links) {
        expect(linkQueue.push(link, parent)).toBe(link.url !== 'foo1');
      }
      expect(linkQueue.getSize()).toBe(2);
    });

    it('should not push given the wrapped queue refuse the link', () => {
      (<jest.Mock>wrappedLinkQueue.push).mockReturnValue(false);
      const link: any = { url: 'foo' };
      const parent: any = { url: 'parent' };
      expect(linkQueue.push(link, parent)).toBe(false);

      expect(linkQueue.filterMap).toStrictEqual(new Map());
      expect(linkQueue.isEmpty()).toBe(true);
    });
  });

  describe('pop', () => {
    let linkQueue: LinkQueueFilterLinks;
    let wrappedLinkQueue: any;
    let filterMap: Map<string, any> = new Map();
    const aLink: any = { url: 'habibi' };
    const parent: any = { url: 'papa' };
    beforeEach(() => {
      wrappedLinkQueue = {
        pop: jest.fn(),
        push: jest.fn().mockReturnValueOnce(true),
        isEmpty: jest.fn()
          .mockReturnValueOnce(true)
          .mockReturnValue(false),
      };
      filterMap = new Map();

      linkQueue = new LinkQueueFilterLinks(wrappedLinkQueue, filterMap);
    });

    it('should returns undefined given that the wrapped link queue returns undefined', () => {
      wrappedLinkQueue.pop.mockReturnValueOnce(undefined);

      expect(linkQueue.pop()).toBeUndefined();
      expect(wrappedLinkQueue.pop).toHaveBeenCalledWith();
    });

    it(`should return undefined given the linked pop by the wrapped link queue is not undefined 
    and doesn't respect the filters and the next link is undefined`, () => {
      filterMap.set('foo', () => true);
      (<jest.Mock>wrappedLinkQueue.pop).mockReturnValueOnce(aLink);

      (<jest.Mock>wrappedLinkQueue.pop).mockReturnValueOnce(undefined);

      const resp = linkQueue.pop();

      expect(wrappedLinkQueue.pop).toHaveBeenCalledTimes(2);
      expect(resp).toBeUndefined();
    });

    it(`should return a link given the linked pop by the wrapped link queue is not undefined 
    and doesn't respect the filters and the next link respect the link`, () => {
      const anotherLink = { url: 'foo' };
      filterMap.set('foo', iri => iri.url === aLink.url);

      expect(linkQueue.push(anotherLink, parent)).toBe(true);

      (<jest.Mock>wrappedLinkQueue.pop).mockReturnValueOnce(aLink);
      (<jest.Mock>wrappedLinkQueue.pop).mockReturnValueOnce(anotherLink);

      const resp = linkQueue.pop();

      expect(wrappedLinkQueue.pop).toHaveBeenCalledTimes(2);
      expect(resp).toStrictEqual(anotherLink);
      expect(linkQueue.isEmpty()).toBe(true);
    });

    it(`should return undefined given the linked pop by the wrapped link queue is not undefined
    and the the wrapped link queue become empty after some internal pop operation
    `, () => {
      filterMap.set('foo', () => true);
      (<jest.Mock>wrappedLinkQueue.pop).mockReturnValueOnce(aLink);
      (<jest.Mock>wrappedLinkQueue.pop).mockReturnValueOnce(aLink);

      (<jest.Mock>wrappedLinkQueue.pop).mockReturnValueOnce(undefined);

      (<jest.Mock>wrappedLinkQueue.isEmpty).mockReturnValueOnce(false);
      (<jest.Mock>wrappedLinkQueue.isEmpty).mockReturnValueOnce(false);
      (<jest.Mock>wrappedLinkQueue.isEmpty).mockReturnValueOnce(true);

      const resp = linkQueue.pop();

      expect(wrappedLinkQueue.pop).toHaveBeenCalledTimes(3);
      expect(resp).toBeUndefined();
    });

    it('should be able to pop multiple documents', () => {
      const links = [
        {
          url: 'foo',
        },
        {
          url: 'foo1',
        },
        {
          url: 'foo2',
        },
        {
          url: 'foo3',
        },
      ];
      (<jest.Mock>wrappedLinkQueue.isEmpty).mockReturnValue(false);

      (<jest.Mock>wrappedLinkQueue.push).mockReturnValue(true);
      for (const link of links) {
        expect(linkQueue.push(link, parent)).toBe(true);
        (<jest.Mock>wrappedLinkQueue.pop).mockReturnValueOnce(link);
      }
      filterMap.set('0', () => false);
      filterMap.set('1', () => false);
      filterMap.set('2', (iri: ILink) => iri.url === 'foo');

      expect(linkQueue.getSize()).toBe(3);

      expect(linkQueue.pop()).toStrictEqual(links[1]);
      expect(linkQueue.getSize()).toBe(2);

      expect(linkQueue.pop()).toStrictEqual(links[2]);
      expect(linkQueue.getSize()).toBe(1);

      expect(linkQueue.pop()).toStrictEqual(links[3]);
      expect(linkQueue.getSize()).toBe(0);

      expect(linkQueue.pop()).toBeUndefined();
      expect(linkQueue.getSize()).toBe(0);
    });
  });

  describe('isEmpty', () => {
    let linkQueue: LinkQueueFilterLinks;
    let wrappedLinkQueue: any;
    let filterMap: Map<string, any> = new Map();
    const parent: any = { url: 'papa' };

    beforeEach(() => {
      wrappedLinkQueue = {
        pop: jest.fn(),
        push: jest.fn().mockReturnValue(true),
        isEmpty: jest.fn()
          .mockReturnValueOnce(true),
      };
      filterMap = new Map();

      linkQueue = new LinkQueueFilterLinks(wrappedLinkQueue, filterMap);
    });

    it('should return true if the wrapped link queue is empty', () => {
      (<jest.Mock>wrappedLinkQueue.isEmpty).mockReturnValueOnce(true);
      expect(linkQueue.isEmpty()).toBe(true);
    });

    it('should return true if the internal link queue is empty', () => {
      (<jest.Mock>wrappedLinkQueue.isEmpty).mockReturnValueOnce(false);
      const n = 10;
      for (let i = 0; i < n; i++) {
        const link: any = { url: i.toString() };
        expect(linkQueue.push(link, parent)).toBe(true);
        (<jest.Mock>wrappedLinkQueue.pop).mockReturnValueOnce(link);
      }

      for (let i = 0; i < n; i++) {
        linkQueue.pop();
      }
      expect(linkQueue.isEmpty()).toBe(true);
    });

    it('should return true if the link queue is not empty but a filter prune all the link', () => {
      (<jest.Mock>wrappedLinkQueue.isEmpty).mockReturnValueOnce(false);
      const n = 10;
      for (let i = 0; i < n; i++) {
        const link: any = { url: i.toString() };
        expect(linkQueue.push(link, parent)).toBe(true);
      }

      filterMap.set('0', () => true);
      expect(linkQueue.isEmpty()).toBe(true);
    });

    it('should return false if the link wrapped link queue is not empty and the filter don\'t prune the links', () => {
      (<jest.Mock>wrappedLinkQueue.isEmpty).mockReturnValueOnce(false);
      const n = 10;
      for (let i = 0; i < n; i++) {
        const link: any = { url: i.toString() };
        expect(linkQueue.push(link, parent)).toBe(true);
      }

      expect(linkQueue.isEmpty()).toBe(false);
    });
  });

  describe('getSize', () => {
    let linkQueue: LinkQueueFilterLinks;
    let wrappedLinkQueue: any;
    let filterMap: Map<string, any> = new Map();
    const parent: any = { url: 'papa' };

    beforeEach(() => {
      wrappedLinkQueue = {
        pop: jest.fn(),
        push: jest.fn().mockReturnValue(true),
        isEmpty: jest.fn()
          .mockReturnValueOnce(true),
        getSize: jest.fn(),
      };
      filterMap = new Map();

      linkQueue = new LinkQueueFilterLinks(wrappedLinkQueue, filterMap);
    });

    it('should returns 0 if the wrapped queue is empty', () => {
      const n = 10;
      for (let i = 0; i < n; i++) {
        const link: any = { url: i.toString() };
        linkQueue.push(link, parent);
      }
      (<jest.Mock>wrappedLinkQueue.isEmpty).mockReturnValueOnce(true);
      expect(linkQueue.getSize()).toBe(0);
    });

    it('should returns 0 if the internal link set is empty', () => {
      (<jest.Mock>wrappedLinkQueue.isEmpty).mockReturnValueOnce(false);
      expect(linkQueue.getSize()).toBe(0);
    });

    it('should returns 0 if the filters prune all the link', () => {
      const n = 10;
      for (let i = 0; i < n; i++) {
        const link: any = { url: i.toString() };
        linkQueue.push(link, parent);
      }
      filterMap.set('0', () => true);
      expect(linkQueue.getSize()).toBe(0);
    });

    it('should returns the right count if the filters doesn\'t prune anything', () => {
      const n = 10;
      for (let i = 0; i < n; i++) {
        const link: any = { url: i.toString() };
        linkQueue.push(link, parent);
      }
      filterMap.set('0', () => false);
      expect(linkQueue.getSize()).toBe(n);
    });

    it('should returns the right count if there are no filters', () => {
      const n = 10;
      for (let i = 0; i < n; i++) {
        const link: any = { url: i.toString() };
        linkQueue.push(link, parent);
      }
      expect(linkQueue.getSize()).toBe(n);
    });

    it('should returns the right count if there are some filters pruning the data', () => {
      const n = 10;
      for (let i = 0; i < n; i++) {
        const link: any = { url: i.toString() };
        linkQueue.push(link, parent);
      }

      filterMap.set('0', () => false);
      filterMap.set('1', iri => iri.url === '5');
      filterMap.set('2', iri => iri.url === '2');

      expect(linkQueue.getSize()).toBe(8);
    });

    it('should returns the count from the wrapped link queue given the flag calculateSize is disactivated', () => {
      (<jest.Mock>wrappedLinkQueue.isEmpty).mockReturnValueOnce(true);
      linkQueue = new LinkQueueFilterLinks(wrappedLinkQueue, filterMap, false);
      (<jest.Mock>wrappedLinkQueue.isEmpty).mockReturnValueOnce(false);
      (<jest.Mock>wrappedLinkQueue.getSize).mockReturnValueOnce(123);
      const n = 10;
      for (let i = 0; i < n; i++) {
        const link: any = { url: i.toString() };
        linkQueue.push(link, parent);
      }

      filterMap.set('0', () => false);
      filterMap.set('1', iri => iri === '5');
      filterMap.set('2', iri => iri === '2');

      expect(linkQueue.getSize()).toBe(123);
    });
  });

  describe('peek', () => {
    let linkQueue: LinkQueueFilterLinks;
    let wrappedLinkQueue: any;
    let filterMap: Map<string, any> = new Map();
    const aLink: any = { url: 'habibi' };
    const parent: any = { url: 'papa' };
    beforeEach(() => {
      wrappedLinkQueue = {
        peek: jest.fn(),
        push: jest.fn().mockReturnValueOnce(true),
        isEmpty: jest.fn()
          .mockReturnValueOnce(true)
          .mockReturnValue(false),
      };
      filterMap = new Map();

      linkQueue = new LinkQueueFilterLinks(wrappedLinkQueue, filterMap);
    });

    it('should return undefined given the peek link from the wrapped link queue is undefined', () => {
      (<jest.Mock> wrappedLinkQueue.peek).mockReturnValueOnce(undefined);
      expect(linkQueue.peek()).toBeUndefined();
    });

    it('should return undefined if one of the filter don\'t prune the next link', () => {
      (<jest.Mock> wrappedLinkQueue.peek).mockReturnValueOnce(aLink);
      filterMap.set('0', () => false);
      filterMap.set('1', () => false);
      filterMap.set('2', () => false);
      filterMap.set('3', () => true);

      expect(linkQueue.peek()).toBeUndefined();
    });

    it('should return the next link given there is no filter', () => {
      (<jest.Mock> wrappedLinkQueue.peek).mockReturnValueOnce(aLink);
      expect(linkQueue.peek()).toStrictEqual(aLink);
    });

    it('should return the next link given the filter doesn\'t prune the link', () => {
      (<jest.Mock> wrappedLinkQueue.peek).mockReturnValueOnce(aLink);
      filterMap.set('0', () => false);
      filterMap.set('1', () => false);
      filterMap.set('2', () => false);
      filterMap.set('3', () => false);
      expect(linkQueue.peek()).toStrictEqual(aLink);
    });
  });
});
