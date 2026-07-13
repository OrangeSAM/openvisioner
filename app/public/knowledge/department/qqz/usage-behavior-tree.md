# 行为树使用约定说明

# 采用大语言模型实现高度智能化的客服系统。

**知识库内容需要丰富且更新频繁。**

![](https://internal-api-drive-stream-sg.larksuite.com/space/api/box/stream/download/authcode/?code=MmE3ZWVhODhhYmQyNjVkNGRiNDYyZGFkZTE4NWM4YTZfZDYwMzE0YzU5ZWEwYTg0MWFlODM5M2Q5MzJlNjZiNGNfSUQ6NzY0NjMyNzc0MDAzNjg0NTI4Ml8xNzgzODM3MDQ1OjE3ODM4NDA2NDVfVjM)

本文主要约定行为树的使用规范

概述说明

1、**针对每个分盘、每个语言都有各自的行为树**

2、行为树的一级标签是分盘命名

二级标签是分类

三级标签是问题

四级标签是答案 四级上通过配置标签值去触发固定逻辑动作：比如走人工客服、走工单流程

Tips: 三级和四级都会加载到知识库当中，其中四级会 通过paraphrase-multilingual-MiniLM-L12-v2进行向量转换，存储在AI回答后进行搜索匹配

**关注点一**： 通过tag判断去做特定逻辑, 当前仅有而且需要配置 update_order_detail 、need_human_service；

tag包含： update_order_detail 将会走充值上传订单截图的逻辑

tag包含： update_order_detail_withdraw 将会走提现工单服务

tag包含： need_human_service 将会走人工客服逻辑

~~tag包含： next_action 暂不支持~~

~~tag包含：noDelete 将不允许删除~~

tag包含：default_question 配置常用问题

tag包含： unfinished_work_orders 展示未完成工单

tag包含：deposit_order 展示充值失败订单

tag包含：withdraw_order 展示提现未成功订单

tag包含：end 行为分支结束

tag包含：Settlement_issues 将会走游戏结算延迟工单的逻辑

tag包含：Bank_info_issues 将会走修改银行卡工单的逻辑

tag包含：Bank_info_issues 将会走修改银行卡工单的逻辑

unfinished_work_orders与【deposit_order、withdraw_order】互斥;【deposit_order、withdraw_order】标签不互斥

**关注点二**：每个树必须配置一个客服节点,必须配置

标签=customer_service

URL=具体人工客服地址

Memo=发送信息时的补充描述（中文或者英文或者其他语言的行为树配置）

例如英文：Intelligent customer service is abnormal, please wait while we transfer you to a human customer service representative.

**关注点三**： 需要注意，在客服语料当中存在，“感谢您的的反馈，我们将尽快修复。我们将赠送您一笔彩金，感谢您的理解与支持;” AI有可能以此回复； 

这种问题有可能后期会触发赠送逻辑，所以在行为树的三四层级配置上需要严格检查语料
