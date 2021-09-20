import { forEach } from './ReactChildren';
import { createElementWithValidation } from './ReactElementValidator';
import {
  createElement as createElementProd,
  isValidElement,
} from './ReactElement';
import {Component} from './ReactBaseClasses'

const createElement = __DEV__ ? createElementWithValidation : createElementProd;

const Children = {
  forEach
};

export {
  Children,
  createElement,
  Component
};