import { useState } from '../../react'
import { createElement } from '../../react/src/ReactElement'
import {render} from '../index'

test('test render simple', () => {
  const element = createElement('div')
  const root = render(element, document.createElement('div')) as any

  console.log(root)
})


const Child = () => {
  const [state, setState] = useState(0)
  console.log(state)
  setTimeout(() => {
    setState(1)
  }, 100)
  return createElement('div')
}

test('test setState', () => {
  const root = render(createElement(Child), document.createElement('div')) as any

  console.log(root)
})