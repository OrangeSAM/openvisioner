# V1.3.1 人工坐席IM 2 & VIP首页可配置

# **一、项目背景**

1、当前的V1.3.0的VIP用户的客服中心上线，VIP专属客服专属客服以及后续的绑定机制缺失；普通用户客服中心需要优化，完善异常兜底机制反馈；智能客服和人工客服目前因为技术原因割裂严重，需要打通流程，以及新增用户列表和调整实时聊天页面。

2、本文档主要覆盖 VIP 客服绑定、智能客服与人工客服打通、普通客服中心页面优化、异常兜底机制四部分内容：

1. 新增后台用户列表，调整实时聊天页用户侧边栏
2. VIP进线逻辑梳理&绑定操作
3. 新增普通用户客服中心页面 ，以及异常兜底机制
4. 智能客服和人工客服群聊机制流程图&会话聊天记录规则

参考背景文档：

《智能客服数据复盘及迭代方向》

《全球站智能客服需求池2026》

《客服首页设计》

# 二、智能客服和人工客服群聊机制（业务流程图）&会话聊天记录流程图

流程边界说明：本流程只针对于智能客服和人工客服打通的流程说明，但是不会对以往单个智能客服处理流程和人工客服处理流程做修改

![](https://internal-api-drive-stream-sg.larksuite.com/space/api/box/stream/download/authcode/?code=MjQ5MzQ5MDM3Mjc0NmRhMjI5OGQxMjBiY2U5NzlkMjZfNmRiNmMwNjZiMzgxMjc0NmU2MWEwOGZjNDc5ZmFkYzJfSUQ6NzY1NzkwMTAzODY4MjU0MTc5MV8xNzgzODM3MDQ0OjE3ODM4NDA2NDRfVjM)

![](https://internal-api-drive-stream-sg.larksuite.com/space/api/box/stream/download/authcode/?code=ZTMzNmNlMzg2OTcyMTZlODY4M2UzMjcwNmUyZjkzYjRfN2NjZGJmOGNiZGFlZmJiZmQ2NzE1MjliOWY2OTdkOWVfSUQ6NzY1ODI0NjQyNjI5MzAzMDYzMF8xNzgzODM3MDQ0OjE3ODM4NDA2NDRfVjM)

![](https://internal-api-drive-stream-sg.larksuite.com/space/api/box/stream/download/authcode/?code=ZWVhOGEzMzgzMDY1NjEwYTVhZjU4MDMwYjlkNTdlMmZfYTg1YzEwNmFlNTZlMTJjOWIyM2NiMTkxZWI5NWZjZWRfSUQ6NzY2MDQyNzgyNTYyMjY5OTc1M18xNzgzODM3MDQ0OjE3ODM4NDA2NDRfVjM)

# 三、需求列表清单以及原型交互 

编号 | 功能点 | 解决方案 | 补充说明
1 | 人工坐席
1）用户列表
2）VIP进线逻辑匹配&VIP绑定
3）智能客服&人工坐席打通
4）会话聊天记录 | 用户列表
功能清单：《用户列表需求功能 - V 0.2》
评审demo：[视频]
VIP进线逻辑匹配&VIP绑定：
1）VIP用户首次进线分配的VIP客服，系统自动绑定
2）VIP已有绑定客服优先分配给已绑定的客服
相关功能：坐席分配、
智能客服&人工坐席打通
1）相关功能页：C端 -聊天页面 
后台 -实时聊天
2）群聊机器人拉人工客服触发规则：

- 行为树配置-人工客服标签
- 个性化配置-人工客服跳出轮次配置
- 侮辱词命中5次
- 发送10-12数字，触发手机号相关问题
- 客服从后台发送人工客服插件
- 工单详情
参考：群聊机制流程（业务流程图）
会话聊天记录
相关功能：C端 聊天页面/后台 实时聊天
参考：客服会话聊天记录泳道流程图
会话记录
需求功能清单：《会话记录需求功能清单-V0.2》
评审demo：[视频] | 参考资料：

MiChatDesk-用户列表；会话记录
2 | C端普通用户客服中心
需求功能清单：《普通用户客服中心页- V 0.2》
评审demo：[视频]

参考资料：
V 1.3.0 VIP客服中心页面
3 | 客服中心页面异常情况兜底机制 | 1）当页面异常提示弹窗，要求用户填写文案，返回给人工客服后续跟进 | 

四、风险 
1.智能客服和人工客服打通，技术支持？ 
2.普通用户和VIP用户的客服中心可配置支持？

3.异常兜底机制要求填写文案，返回人工客服跟进实现问题？
