
/**
 * Create a function which has 'unsafe' privileges (required by windows8 apps)
 */
 const createMicrosoftUnsafeLocalFunction = function(func: any) {
  if (typeof MSApp !== 'undefined' && MSApp.execUnsafeLocalFunction) {
    return function(arg0: any, arg1: any, arg2: any, arg3: any) {
      MSApp.execUnsafeLocalFunction(function() {
        return func(arg0, arg1, arg2, arg3);
      });
    };
  } else {
    return func;
  }
};

export default createMicrosoftUnsafeLocalFunction;