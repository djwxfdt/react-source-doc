 import type {Fiber} from './ReactInternalTypes';
 import type {CapturedValue} from './ReactCapturedValue';
 
 // This module is forked in different environments.
 // By default, return `true` to log errors to the console.
 // Forks can return `false` if this isn't desirable.
 
 export function showErrorDialog(
   boundary: Fiber,
   errorInfo: CapturedValue<mixed>,
 ): boolean {
   return true;
 }
 