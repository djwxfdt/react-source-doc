import { ELEMENT_NODE, DOCUMENT_NODE, DOCUMENT_FRAGMENT_NODE, COMMENT_NODE } from "../shared/HTMLNodeType"

export function isValidContainerLegacy(node: any): boolean {
  return !!(
    node &&
    (node.nodeType === ELEMENT_NODE ||
      node.nodeType === DOCUMENT_NODE ||
      node.nodeType === DOCUMENT_FRAGMENT_NODE ||
      (node.nodeType === COMMENT_NODE &&
        (node as any).nodeValue === ' react-mount-point-unstable '))
  );
}