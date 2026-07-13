# pending客诉问题分析

#### 一、需求背景

对现有用户聊天语料进行分析后，发现语料准确 及匹配率不算太高，现计划针对以下Badcase案例进行优化：

《智能客服数据复盘及迭代方向》

《全球站智能客服需求池2026》

#### 二、需求列表清单及原型交互

| **编号** | **功能点** | 解决方案 | 补充说明 |
|-|-|-|-|
| 5 | 工单处理流程插件化 | 将现有的工单流程标签做成可以在外部聊天记录页打开的H5链接。人工客服可以在 
需插件化的流程包含：充值提单：update_order_detail 提现提单：update_order_detail_withdraw未完成的工单：unfinished_work_orders游戏结算延迟创单：Settlement_issues游戏结算延迟工单进度：Settlement_issues_record修改银行卡工单：Bank_info_issues 修改银行卡工单进度：Bank_info_issues_record补充资料：order_supplement_info工单进度入口：order_issues_info 
需支持的三方应用场景包含：TG、Whatsapp 机器人 
配置流程及方式，参见右侧原型说明：后台可以配置TG、Whatsapp的机器人token，配置好后可以将机器人拉至对应群组、频道里，服务用户，收集必要信息后，分发路由至后台工单。 | |
