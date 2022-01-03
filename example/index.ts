import * as React from '../packages/react'

import * as ReactDOM from '../packages/react-dom'

const Child = () => {
  const [state, setState] = React.useState(0)
  console.log(state)
  setTimeout(() => {
    setState(1)
  }, 100)
  return React.createElement('div')
}

ReactDOM.render(React.createElement(Child), document.getElementById('app')!)