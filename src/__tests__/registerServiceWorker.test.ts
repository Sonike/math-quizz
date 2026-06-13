import { registerServiceWorker } from '../sw/register';

describe('registerServiceWorker', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error test cleanup of an optionally-defined property
    delete navigator.serviceWorker;
  });

  it('does nothing when service workers are unsupported', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener');
    registerServiceWorker();
    expect(addEventListener).not.toHaveBeenCalledWith('load', expect.any(Function));
  });

  it('registers the worker on window load when supported', () => {
    const register = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register },
      configurable: true,
    });
    const loadHandlers: Array<() => void> = [];
    vi.spyOn(window, 'addEventListener').mockImplementation((type, cb) => {
      if (type === 'load') loadHandlers.push(cb as () => void);
    });

    registerServiceWorker();
    expect(loadHandlers).toHaveLength(1);

    loadHandlers[0]();
    expect(register).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}sw.js`);
  });
});
