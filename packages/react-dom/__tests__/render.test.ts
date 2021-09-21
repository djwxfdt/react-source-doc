import { createElement } from '../../react/src/ReactElement'
import {render} from '../index'

test('test render simple', () => {
  const element = createElement('div')
  const root = render(element, document.createElement('div')) as any

  console.log(root)
})