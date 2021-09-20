# react-source-doc (17.0.2) 
用typescript重写react源码，逐行写上阅读理解，支持直接调试。

`文件结构和源码命名及执行逻辑一致` (git commit SHA: ef582fbea)

### 翻译进度

| 模块  | 进度 |
| ---- | ---- |
| 任务调度（scheduler）| [已完成](./packages/scheduler/README.md) |
| 协调（react-reconciler）| [已完成](./packages/react-reconciler/README.md) |
| ReactDOM（react-dom） | 进行中 |


### 如何阅读

1. clone代码

2. `yarn install`

3. 进入`packages/react-dom/__tests__/render-test.ts`，打断点
