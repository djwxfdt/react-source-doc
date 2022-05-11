import { forEach } from './ReactChildren';
import { createElementWithValidation } from './ReactElementValidator';
import {
  createElement as createElementProd,
  isValidElement,
} from './ReactElement';
import {Component} from './ReactBaseClasses'

import {createContext} from './ReactContext';


const createElement = __DEV__ ? createElementWithValidation : createElementProd;

const Children = {
  forEach
};

export {
  Children,
  createElement,
  Component,
  createContext
};

export {useState, useEffect, useLayoutEffect, useContext} from './ReactHooks'