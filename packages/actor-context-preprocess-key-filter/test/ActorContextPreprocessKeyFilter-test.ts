import { KeysFilter } from '@comunica/context-entries-link-traversal';
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
        await expect(actor.test(action)).resolves.toBe(true);
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
        (<jest.Mock> action.context.get).mockReturnValue(undefined);
        (<jest.Mock> action.context.set).mockReturnValue('foo');
        action.foo = 'bar';
        const resp = await actor.run(action);

        expect(action.context.get).toHaveBeenCalledTimes(1);
        expect(action.context.set).toHaveBeenCalledTimes(1);
        expect(action.context.set).toHaveBeenLastCalledWith(KeysFilter.filters, new Map());
        expect(resp).toStrictEqual({ context: 'foo', foo: 'bar' });
      });
    });
  });
});
