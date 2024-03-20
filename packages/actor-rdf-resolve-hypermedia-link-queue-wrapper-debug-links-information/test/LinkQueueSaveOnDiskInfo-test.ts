import { writeFileSync } from 'fs';
import { LinkQueueSaveOnDiskInfo } from '../lib/LinkQueueSaveOnDiskInfo';

jest.mock('fs');

describe('LinkQueueFilterLinks', () => {
  const filePath = '';
  describe('constructor', () => {
    it('should construct', () => {
      const linkqueue: any = {
        isEmpty: () => true,
      };

      const expectedHistory = {
        iris_popped: [],
        iris_pushed: [],
        filters: [],
        started_empty: true,
      };

      const wrapper = new LinkQueueSaveOnDiskInfo(linkqueue, filePath);

      expect(wrapper.filePath).toBe(filePath);
      expect(wrapper.filterMap).toBeUndefined();
      expect(wrapper.getHistory()).toStrictEqual(expectedHistory);
    });

    it('should construct with a link with filters', () => {
      const filterMap = new Map([[ 'foo', 'bar' ]]);
      const linkqueue: any = {
        filterMap,
        isEmpty: () => true,
      };
      const expectedHistory = {
        iris_popped: [],
        iris_pushed: [],
        filters: [ 'foo' ],
        started_empty: true,
      };

      const wrapper = new LinkQueueSaveOnDiskInfo(linkqueue, filePath);

      expect(wrapper.filePath).toBe(filePath);
      expect(wrapper.filterMap).toStrictEqual(filterMap);
      expect(wrapper.getHistory()).toStrictEqual(expectedHistory);
    });

    it('should construct with a non empty link with filters', () => {
      const filterMap = new Map([[ 'foo', 'bar' ]]);
      const linkqueue: any = {
        filterMap,
        isEmpty: () => false,
      };
      const expectedHistory = {
        iris_popped: [],
        iris_pushed: [],
        filters: [ 'foo' ],
        started_empty: false,
      };

      const wrapper = new LinkQueueSaveOnDiskInfo(linkqueue, filePath);

      expect(wrapper.filePath).toBe(filePath);
      expect(wrapper.filterMap).toStrictEqual(filterMap);
      expect(wrapper.getHistory()).toStrictEqual(expectedHistory);
    });
  });

  describe('push', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('should push the history to a file if a new link is successfuly pushed', () => {
      const iri = {
        url: 'foo',
      };
      const linkQueue: any = {
        push: (_link: any, _parent: any) => true,
        isEmpty: () => true,
      };

      const expectedHistory = {
        iris_popped: [],
        iris_pushed: [ iri.url ],
        filters: [],
        started_empty: true,
      };

      const wrapper = new LinkQueueSaveOnDiskInfo(linkQueue, filePath);
      const resp = wrapper.push(iri, iri);

      expect(resp).toBe(true);
      expect(<jest.Mock>writeFileSync).toHaveBeenCalledTimes(1);
      expect(wrapper.getHistory()).toStrictEqual(expectedHistory);
      expect(<jest.Mock>writeFileSync).toHaveBeenCalledWith(filePath, JSON.stringify(expectedHistory));
    });

    it('should not push to the history to a file if a new link not successfuly pushed', () => {
      const iri = {
        url: 'foo',
      };
      const linkQueue: any = {
        push: (_link: any, _parent: any) => false,
        isEmpty: () => true,
      };

      const expectedHistory = {
        iris_popped: [],
        iris_pushed: [],
        filters: [],
        started_empty: true,
      };

      const wrapper = new LinkQueueSaveOnDiskInfo(linkQueue, filePath);
      const resp = wrapper.push(iri, iri);

      expect(resp).toBe(false);
      expect(<jest.Mock>writeFileSync).not.toHaveBeenCalled();
      expect(wrapper.getHistory()).toStrictEqual(expectedHistory);
    });

    it('should push the history adequatly with multiple push events', () => {
      let i = 0;
      const n = 10;
      const linkQueue: any = {
        push: (_link: any, _parent: any) => i % 2 === 0,
        isEmpty: () => false,
      };
      const wrapper = new LinkQueueSaveOnDiskInfo(linkQueue, filePath);
      const iris_pushed: string[] = [];
      for (; i < n; i++) {
        const iri = {
          url: String(i),
        };
        if (i % 2 === 0) {
          iris_pushed.push(String(i));
        }
        const expectedHistory = {
          iris_popped: [],
          iris_pushed,
          filters: [],
          started_empty: false,
        };

        const resp = wrapper.push(iri, iri);

        expect(resp).toBe(i % 2 === 0);
        expect(<jest.Mock>writeFileSync).toHaveBeenCalledTimes(Math.floor(i / 2) + 1);
        expect(wrapper.getHistory()).toStrictEqual(expectedHistory);
        expect(<jest.Mock>writeFileSync).toHaveBeenCalledWith(filePath, JSON.stringify(expectedHistory));
      }
    });
  });

  describe('pop', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('should push the history if a new link is pop', () => {
      const iri = {
        url: 'foo',
      };
      const linkQueue: any = {
        pop: (_link: any, _parent: any) => iri,
        isEmpty: () => true,
      };

      const expectedHistory = {
        iris_popped: [ iri.url ],
        iris_pushed: [],
        filters: [],
        started_empty: true,
      };

      const wrapper = new LinkQueueSaveOnDiskInfo(linkQueue, filePath);
      const resp = wrapper.pop();

      expect(resp).toStrictEqual(iri);
      expect(<jest.Mock>writeFileSync).toHaveBeenCalledTimes(1);
      expect(wrapper.getHistory()).toStrictEqual(expectedHistory);
      expect(<jest.Mock>writeFileSync).toHaveBeenCalledWith(filePath, JSON.stringify(expectedHistory));
    });

    it('should not push the history to a file if pop return undefined', () => {
      const linkQueue: any = {
        pop() // eslint-disable-next-line @typescript-eslint/no-empty-function
        { },
        isEmpty: () => false,
      };

      const expectedHistory = {
        iris_popped: [],
        iris_pushed: [],
        filters: [],
        started_empty: false,
      };

      const wrapper = new LinkQueueSaveOnDiskInfo(linkQueue, filePath);
      const resp = wrapper.pop();

      expect(resp).toBeUndefined();
      expect(<jest.Mock>writeFileSync).not.toHaveBeenCalled();
      expect(wrapper.getHistory()).toStrictEqual(expectedHistory);
    });

    it('should push the history adequatly with multiple pop events', () => {
      let i = 0;
      const n = 10;
      const linkQueue: any = {
        pop: () => i % 2 === 0 ? { url: String(i) } : undefined,
        isEmpty: () => false,
      };
      const wrapper = new LinkQueueSaveOnDiskInfo(linkQueue, filePath);
      const iris_popped: string[] = [];
      for (; i < n; i++) {
        const iri = {
          url: String(i),
        };
        if (i % 2 === 0) {
          iris_popped.push(String(i));
        }
        const expectedHistory = {
          iris_popped,
          iris_pushed: [],
          filters: [],
          started_empty: false,
        };

        const resp = wrapper.pop();

        expect(resp).toStrictEqual(i % 2 === 0 ? { url: String(i) } : undefined);
        expect(<jest.Mock>writeFileSync).toHaveBeenCalledTimes(Math.floor(i / 2) + 1);
        expect(wrapper.getHistory()).toStrictEqual(expectedHistory);
        expect(<jest.Mock>writeFileSync).toHaveBeenCalledWith(filePath, JSON.stringify(expectedHistory));
      }
    });
  });
});
