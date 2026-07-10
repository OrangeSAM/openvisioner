---
title: 人工坐席IM技术选型
source_url: https://openvision.sg.larksuite.com/wiki/L9ESwkcEhiJHzSkXeLPlDs5ZgEh
---

<title>人工坐席IM</title>

# 一、技术选型

- 基本思路是基于现有IM框架进行二次开发，调研了市面上现有的IM框架，最终选择openIM框架，特点如下：

<sheet sheet-id="ACd93O" token="Iis7stFUDhglgKtKYaGlUkV8gqd"></sheet>

- 其他框架的局限性

<table><colgroup><col/><col/></colgroup><tbody><tr><td>框架</td><td>局限性</td></tr><tr><td>Mattermost / Rocket.Chat</td><td><ul><li>Mattermost 和 Rocket.Chat 更偏向"成品协作工具"而非 IM 基础设施，二次开发改造成本高</li><li>Mattermost 虽然是 Go 后端，但重在前端 React 应用层，IM 底层定制不灵活</li></ul></td></tr><tr><td>gochat</td><td><ul><li>功能较基础，社区规模小，缺少持续维护保障，不适合企业级客服系统</li></ul></td></tr><tr><td>Lumen IM</td><td><ul><li>轻量但功能覆盖有限，适合内部小工具，不适合承载智能客服的高并发场景</li></ul></td></tr></tbody></table>

- 聊天记录存储选型对比

<sheet sheet-id="X8Cuhx" token="Iis7stFUDhglgKtKYaGlUkV8gqd"></sheet>

我们的场景有以下特点：

1. 消息格式多变：需要支持文字、图片、语音、视频等多种类型，格式未来还可能不断增加。
2. 流量可能爆发式增长：用户量可能在短期内急剧上升，数据库需要能轻松水平扩展。

显然MongoDB更加适合我们的场景，后续老的Java智能客服服务在迁移过程中也会使用MongoDB代替PostgreSQL来存储消息记录。

# 二、open-im-server架构

## 2.1整体架构图

![](https://internal-api-drive-stream-sg.larksuite.com/space/api/box/stream/download/authcode/?code=Mjc5ZWMyN2ExNGJkZDUzYjJhMzVkNjVjYzI4MzlhZDRfNjI1NDVkOGIzZGQwNGY2NmExZjJhOGU5YjE0OGQzOTRfSUQ6NzY0NzA1ODIyMzc0MDE3ODE0Ml8xNzgzNjcxMDMxOjE3ODM2NzQ2MzFfVjM)

## 2.2核心组件

### 网关层

#### MsgGateway（消息网关） — `cmd/openim-msggateway/`

- 端口: 10001（WebSocket）
- 职责:

  - 维护与客户端的 WebSocket 长连接，最大支持 10 万并发连接
  - Token 认证：连接时调用 Auth RPC 解析 Token，验证用户身份
  - 多端登录策略：支持 4 种策略（不踢人、PC优先、同端互踢、同类终端互踢）
  - 消息收发：接收客户端消息 → gRPC 转发到 Msg/Push RPC 服务
  - 在线状态管理：通过 Redis 维护用户在线状态，集群节点间同步

#### API Gateway（API 网关） — `cmd/openim-api/`

- 端口: 10002（HTTP）
- 职责: 提供 RESTful API 接口，供客户端和管理后台调用
- 内部通过 gRPC 调用各 RPC 服务，封装为 HTTP 响应

### 消息处理层

#### MsgTransfer（消息转移） — `cmd/openim-msgtransfer/`

- 职责: 消费 Kafka 消息，执行两大核心任务：

  1. 持久化到 MongoDB：`OnlineHistoryMongoConsumerHandler` 将消息批量写入 MongoDB
  2. 缓存到 Redis：将消息写入 Redis 供快速读取
- Kafka Topics: `toMongo`、`toRedis`

#### Push（推送服务） — `cmd/openim-push/`

- 职责: 消费 Kafka 的 `toPush` Topic，执行消息推送
- 在线推送：通过 gRPC 调用 MsgGateway，将消息推送到在线用户的 WebSocket 连接
- 离线推送：调用第三方推送平台（FCM/APNs/GeTui/JPush），发送推送通知
- 推送策略：支持免打扰过滤、@消息特殊处理、群组消息成员过滤
- Kafka Topics: `toPush`、`toOfflinePush`

### RPC 服务层

<sheet sheet-id="xoShzt" token="Iis7stFUDhglgKtKYaGlUkV8gqd"></sheet>

所有 RPC 服务间通过 gRPC + Protocol Buffers 通信，通过 ETCD 进行服务发现。

## 2.3消息全链路流程图

![](https://internal-api-drive-stream-sg.larksuite.com/space/api/box/stream/download/authcode/?code=ZDk1ZTY0YjhmNjQ4MTBkYjkwZGZlODFhNWIzOWZlYWNfZmM5ZGQ3OThmZTc0ZDgxZmQxMGY0MjJkOGYxMDNhY2ZfSUQ6NzY0NzA2MTIyMTA4MzQxODMzM18xNzgzNjcxMDMxOjE3ODM2NzQ2MzFfVjM)

关键步骤:

1. 用户A通过 WebSocket 发送消息到 MsgGateway
2. MsgGateway 调用 Msg RPC 进行消息校验、分配全局唯一序列号
3. Msg RPC 将消息同时写入 Kafka 的两个 Topic
4. toMongo 通道 → MsgTransfer 消费，批量持久化到 MongoDB
5. toPush 通道 → Push 服务消费

   - 查询 Redis 在线状态
   - 在线：通过 MsgGateway 直接推送到用户B的 WebSocket
   - 离线：调用第三方推送平台发送通知

## 2.4数据存储架构

<sheet sheet-id="urJuy9" token="Iis7stFUDhglgKtKYaGlUkV8gqd"></sheet>

## 2.5项目目录结构

<sheet sheet-id="dhcPvT" token="Iis7stFUDhglgKtKYaGlUkV8gqd"></sheet>

## 2.6技术栈总结

<sheet sheet-id="MxORjz" token="Iis7stFUDhglgKtKYaGlUkV8gqd"></sheet>

这个架构的核心设计理念是 消息的异步解耦：消息通过 Kafka 分离了"写入存储"和"推送分发"两个流程，保证了高吞吐和低延迟。

# 三、方案设计

### 3.1系统架构图

<blockquote><readonly-block type="isv"></readonly-block></blockquote>

前端新开发1个用户使用的H5页面和客服管理平台，后台新开发一个ICS(Intelligent Customer Service) Server, OpenIMServer不做改造，只是调用它，利用了他提供的聊天功能以及相关事件回调。为了保留用户的历史聊天记录，我们的思路是为每个用户创建一个专属的群（用户自己+2个固定的管理员），用户可以看到自己的聊天记录，每次会话都把客服进群，结束之后把客服踢出去。用户进入“智能客服中心H5”之后的时序图如下：

<readonly-block type="isv"></readonly-block>

### 3.2排队机制实现

| 功能点 | 实现机制 | 说明 |
|-|-|-|
| 用户等待队列 | 使用redis的zset, member为userID,score为进入排队的时间戳 | 每次使用ZPOPMIN取出最早等待用户 |
| 在线的客服列表 | 使用redis的set, member为客服的userID | 使用OpenIMServer提供的webhook监听客服上线和离线事件进行更新 |
| 单个在线客服的信息 | 使用redis的hash, 字段有:  <br/>1.状态（在线，忙碌）  <br/>2.当前接待用户数  <br/>3.今日接线数  <br/>4.今日累计就绪时间  <br/>5.今日最后一次上线时间，用于计算今日累计就绪时间 | 使用OpenIMServer提供的webhook监听用户和客服的上线和离线事件进行更新  <br/>当客服离线或者主动点击“忙碌”时触发“今日累计就绪时间”的更新  <br/> |
| 在线客服的“进行中”队列 | 直接拉取当前客服所在群列表 | 使用OpenIMServer提供的“获取已加入群组”接口，把没有用户的群过滤掉 |
| 转接 | 把指定的客服拉进群，把自己踢出去 | 使用OpenIMServer提供的“邀请进群”和“移除群成员”接口 |
| 客服当前对话的客户画像 | 直接拉取老的java智能客服服务来获取数据 | 需要老java智能客服服务提供一个接口 |

流程图如下：

<readonly-block type="isv"></readonly-block>

异常处理：

1.若用户在等待期间主动离开，则从等待队列移除。

2.客服异常断线：状态自动变更为离线，其进行中的会话保持不变，待客服重新上线后可继续；并写入延迟队列，一定时间内未重新上线，把用户移入等待队列。

### 3.3客服管理平台实现

#### 客服录入模块

客服信息字段如下：

<callout emoji="🏝️">
// 客服角色
enum AgentRole {
  UNKNOWN_ROLE = 0;
  VIP_AGENT = 1;       // VIP客服
  NORMAL_AGENT = 2;    // 普通客服
  SUPERVISOR = 3;      // 客服主管
}
// 客服状态
enum AgentStatus {
  UNKNOWN_STATUS = 0;
  ONLINE = 1;   // 在线
  BUSY = 2;     // 忙碌
  OFFLINE = 3;  // 离线
}
// 客服完整信息
message AgentInfo {
  int64 id = 1;                    // 工号（自动生成）
  string name = 2;                 // 姓名
  string email = 3;                // 邮箱
  string phone = 4;                // 手机号
  string password = 5;             // 初始密码（查询时可能脱敏，此处按需求保留）
  AgentRole role = 6;              // 角色
  int32 max_concurrency = 7;      // 最大并发数
  AgentStatus status = 8;         // 当前状态
  int32 current_serving_count = 9;  // 当前接待用户数
  int32 today_served_count = 10;    // 今日接线
  float ready_duration_hours = 11;  // 就绪时长
}
</callout>

录入客服到ICS Server的存储之后，需要调用OpenIMServer的接口把客服信息导入IM系统中。

登录逻辑为：客服登录客服管理平台之后，前端再使用OpenIM Client SDK登录到OpenIMServer建立WebSocket长连接。前端的请求通过java服务进行转发到ICS Server，会带上登录态token，ICS Server请求java服务校验token。

#### 智能排班模块

表结构如下：

<sheet sheet-id="ySe2Nc" token="Iis7stFUDhglgKtKYaGlUkV8gqd"></sheet>

唯一约束：`UNIQUE(week_start_date, agent_id, day_of_week)`，防止同一人同一天出现重复排班。

然后实现日常的增删改查接口。

#### 用户信息列表

直接使用OpenIMServer提供的“获取已注册用户列表”接口，分页拉取并展示，需要过滤客服，OpenIMServer底层存储是MogoDB。

#### 数据统计模块

由于是管理端， QPS不高，可以直接从redis和mysql中拉取“总进线数”和“实时坐席监控墙”，接线量排行榜使用redis的zset来实现。

平均首次响应时间 = “客服第一次回复信息的时间” - “用户触发对接人工客服的时间”

漏接的定义: 用户在等待队列中排队，还没对接到客服用户就下线了

### 3.4工作量预估

1.“智能客服中心H5”链接上的token, java智能客服服务需要提供1个校验接口给到ics server进行验证   2D

2. 客服信息变更（比如从非客服变为客服）之后，java智能客服服务写kafka旁路通知ICS Server服务  1D

3.java智能客服老系统提供拉取用户分盘信息和工单信息的接口   2D

4.ICS Server排队机制实现   6D

5.ICS Server客服录入模块 3D

6.ICS Server智能排班模块 3D

7.ICS Server用户信息列表 3D

8.ICS Server数据统计模块 3D

9.ICS Server GoZero框架熟悉和搭建 2D

10.联调 3D

总共28D
