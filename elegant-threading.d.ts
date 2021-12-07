/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'elegant-threading' {
  function thread<RETURN, ARGS>(
    f: (...args: ARGS) => RETURN,
    helpers?: ((...args: any[]) => any)[]
  ): (...args: ARGS) => Promise<RETURN>;
  export default thread;
}
