function formatProdErrorMessage(code: any) {
  let url = 'https://reactjs.org/docs/error-decoder.html?invariant=' + code;
  for (let i = 1; i < arguments.length; i++) {
    url += '&args[]=' + encodeURIComponent(arguments[i]);
  }
  return (
    `Minified React error #${code}; visit ${url} for the full message or ` +
    'use the non-minified dev environment for full errors and additional ' +
    'helpful warnings.'
  );
}

export default formatProdErrorMessage;
