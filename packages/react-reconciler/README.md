# react-reconciler


核心，React Fiber的相关内容都在这里

`tips: 请注意React源码中有很多old和new的文件，这里我们只采用目前生效的代码`

这里的核心方法是createContainer和updateContainer

createContainer相对比较简单
updateContainer 过于复杂，估计有上万行代码，十分头痛

## updateContainer

1. requestEventTime (获取当前时间，如果当前并不处于react执行过程中，则用上一次更新的时间)

2. requestUpdateLane (取得当前次更新的优先级)

3. getContextForSubtree (获取当前结构的上下文)

4. createUpdate （它基于时间戳和甬道创建一个update对象）

5. enqueueUpdate （将update对象存入fiber的sharedQueue.pending。并形成环式结构）

6. scheduleUpdateOnFiber （重点，在后面）

## scheduleUpdateOnFiber （fiber调度，核心）

### reconcileChildrenArray （传说中的diff算法）

会执行三次循环
