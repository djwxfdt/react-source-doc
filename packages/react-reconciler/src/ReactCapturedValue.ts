
 import type {Fiber} from './ReactInternalTypes';

 import {getStackByFiberInDevAndProd} from './ReactFiberComponentStack';
 
 export type CapturedValue<T> = {
   value: T,
   source: Fiber | null,
   stack: string | null,
 };
 
 export function createCapturedValue<T>(
   value: T,
   source: Fiber,
 ): CapturedValue<T> {
   // If the value is an error, call this function immediately after it is thrown
   // so the stack is accurate.
   return {
     value,
     source,
     stack: getStackByFiberInDevAndProd(source),
   };
 }
 