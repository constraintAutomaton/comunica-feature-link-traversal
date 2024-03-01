import { KeyFilter } from '@comunica/context-entries-link-traversal';
import { Bus } from '@comunica/core';
import { ActorContextPreprocessKeyFilter } from '../lib/ActorContextPreprocessKeyFilter';

describe('ActorContextPreprocessKeyFilter', () => {
  let bus: any;
  describe('An ActorContextPreprocessKeyFilter instance', () => {
    let actor: ActorContextPreprocessKeyFilter;

    describe('test', () => {
      beforeEach(() => {
        bus = new Bus({ name: 'bus' });
        actor = new ActorContextPreprocessKeyFilter({ name: 'actor', bus });
      });

      it('should test', async() => {
        const action: any = {};
        expect(await actor.test(action)).toBe(true);
      });
    });

    describe('run', () => {
      let action: any;

      beforeEach(() => {
        bus = new Bus({ name: 'bus' });
        actor = new ActorContextPreprocessKeyFilter({ name: 'actor', bus });
        action = {
          context: {
            get: jest.fn(),
            set: jest.fn(),
          },
        };
      });

      it('should return the context if the filter key is already defined', async() => {
        (<jest.Mock> action.context.get).mockReturnValue(false);
        const resp = await actor.run(action);

        expect(action.context.get).toHaveBeenCalledTimes(1);
        expect(action.context.set).toHaveBeenCalledTimes(0);
        expect(resp).toStrictEqual(action);
      });

      it('should return a context with the filter if it is not defined', async() => {
        // eslint-disable-next-line unicorn/no-useless-undefined
        (<jest.Mock> action.context.get).mockReturnValue(undefined);
        const resp = await actor.run(action);

        expect(action.context.get).toHaveBeenCalledTimes(1);
        expect(action.context.set).toHaveBeenCalledTimes(1);
        expect(action.context.set).toHaveBeenLastCalledWith(KeyFilter.filters, new Map());
        expect(resp).toStrictEqual(action);
      });
    });
  });
});
