import * as React from '../packages/react'

import * as ReactDOM from '../packages/react-dom'


const Context = React.createContext<number | null>(null)

const Parent = () => {
  const [state, setState] = React.useState(0)

  React.useEffect(() => {
    setTimeout(() => {
      debugger
      setState(1)
    }, 1000)
  }, [])

  return React.createElement(Context.Provider, { value: state }, React.createElement(Child, {}))
}

const Child = () => {
  
  const context = React.useContext(Context)

  console.log(context)

  return React.createElement('div', {}, ['1'])
}

ReactDOM.render(React.createElement(Parent), document.getElementById('app')!)