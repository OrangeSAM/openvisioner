# 智能客服内部研发交换配置操作流程

正式服等待接入方研发给到对应公钥和接口参数，文档内容样式如下：

> 接入方给到分盘参数样式
> 
> ![](https://internal-api-drive-stream-sg.larksuite.com/space/api/box/stream/download/authcode/?code=MjJkNWQwYTY4MGE2NTFlYTdkZTNlZmNlZDM4MjdiY2FfMGE4ZmM2YjBiMTJkNWU0YjVkMTI2NGZiZDhiZDViOTNfSUQ6NzY0NjMyNzc5MzA1OTU5ODA0N18xNzgzODM3MDQ2OjE3ODM4NDA2NDZfVjM)

拿到这个参数，需要去智能客服后台-分盘接口配置，点击新增，填写参数信息

![](https://internal-api-drive-stream-sg.larksuite.com/space/api/box/stream/download/authcode/?code=OGEwOWMxYjE1MTljYThmZDczNTU4ZDAyYTg4YTM3ZjJfZDU4OTJkNDhiOTI2Y2IwMDhjNmM5ZmQ5MjE5YzQxOWZfSUQ6NzY0NjMyNzc5MjQ0MzE1MDA0N18xNzgzODM3MDQ2OjE3ODM4NDA2NDZfVjM)

分盘：接入方文档里给到的分盘名
第三方公钥：接入方文档里给到**公钥**字段
查询API接口：填写接入方文档里给到的**查询订单地址**
批量查单API接口：填写接入方文档里给到的 **查询最近3天内用户支付失败的10笔订单地址**
分盘法币充值订单校验规则：**AA**：^\d{13}[1-9]\d{3}\d{7,8}\$ **CC**：^\d{6}YC[A-F0-9]{6}\d{10}\$
分盘法币提现订单校验规则：**AA**：^TX\d{13}[1-9]\d{3}\d{7,8}\$ **CC**：^\d{6}YW[A-F0-9]{6}\d{10}\$
H5客服地址：每个盘都一样，填写[https://chat.t1chat.com](https://chat.t1chat.com)
时区：选择分盘所在地时区。目前大部分盘都在印度，选择印度标准时间即可。（若有不同时区记得询问，比如EPI 巴基斯坦时区，全球站可能有不同时区）
访问令牌有效期，刷新令牌有效期：都设置为1800

调整好后，点击确定，即新增分盘配置成功。

配置成功后，点击刚才新增的分盘-编辑：

配置好查询支付通道接口，来源接入方文档里给到的 **支付通道地址**
~~点击复制公钥，将复制好的公钥，填写到智能客服方需返回给接入方参数配置里对应的公钥位置。~~
~~然后点击确定。~~

![](https://internal-api-drive-stream-sg.larksuite.com/space/api/box/stream/download/authcode/?code=YjcwZjc4MDU3MTE1ZTYzYmU5NmVhMjhiZjlmMTA0ZThfOTdiN2NhZjhjOWU5OGNkYjkzMzc2ZGI3MmU5NDZiNDNfSUQ6NzY0NjMyNzc5MzYzMDAzOTc3Ml8xNzgzODM3MDQ2OjE3ODM4NDA2NDZfVjM)

以上操作都成功后，来到支付通道命令配置页，选择刚才配置的分盘，查询后，点击同步支付通道按钮，这个时候就会把对方支持的支付通道都同步过来。

![](https://internal-api-drive-stream-sg.larksuite.com/space/api/box/stream/download/authcode/?code=NWE5OGFkMmU0YTk5YmJlNWYwOGQ5ZGVjNDBmZjgzOTZfMjhkZjg3M2QzOTE3MGQ5YjdmNzE3ZjAwYjgxYzZjNTFfSUQ6NzY0NjMyNzc5MzYzMDA1NjE1Nl8xNzgzODM3MDQ2OjE3ODM4NDA2NDZfVjM)

同步完成后，点击查询开分盘的支付通道，如果有值，则同步完毕，如果无值，将对应的支付通道地址copy至浏览器，打开看下，如果显示如下为空，则为正常。否则将错误报至研发排查。

![](https://internal-api-drive-stream-sg.larksuite.com/space/api/box/stream/download/authcode/?code=YWQ0NWQ3NWQ1MzU4NzVkZTYxNTgzMjEyNmY2ZGI0Y2ZfNTkzOWU4ODJmYWQ3YTVhYjhmNTA4ZTZlZjNlYjBhMjFfSUQ6NzY0NjMyNzc5Mzg5MDE4NDkyNV8xNzgzODM3MDQ2OjE3ODM4NDA2NDZfVjM)

接下来来到智能客服分盘接口配置页面，点击操作中下载配置按钮，将对应的分盘ID、appid参数文档，下载返回给接入方即可。

后台其他操作：创建智能客服对应分盘账号返回给AA、CC侧谁在群里说需要接入新盘就发给谁

【系统管理】 - 【角色管理】 - 新增角色

![](https://internal-api-drive-stream-sg.larksuite.com/space/api/box/stream/download/authcode/?code=OWM2OWMwMmZiZGI2Mzk5MGMzN2UwOGI5NmQ1YTA1NWVfZDdiMmYyMGY0NjY0NDBkOTRiMjU1MmY1NTUzMDc2ZjBfSUQ6NzY0NjMyNzc5NDg5Mzk5OTg0Ml8xNzgzODM3MDQ2OjE3ODM4NDA2NDZfVjM)

【系统管理】 - 【角色管理】 - 菜单权限

![](https://internal-api-drive-stream-sg.larksuite.com/space/api/box/stream/download/authcode/?code=ODM5MGE0MjZjM2RjNWEwZjgzZDNjODFkNDlhNWFjMzhfMmZiNzUwMjc0OTMzZjg3YTU3MTIxNTY5ZTZkNzU5YTNfSUQ6NzY0NjMyNzc5NDk5NzM4Mjg3OF8xNzgzODM3MDQ2OjE3ODM4NDA2NDZfVjM)

【系统管理】 - 【角色管理】 - 数据权限

![](https://internal-api-drive-stream-sg.larksuite.com/space/api/box/stream/download/authcode/?code=ZDNmOTU5OGJiNDU4ZGQyNzc4M2EzZjY0MTgzOTRmYjlfZGJlMDAzMGQ1ZDQwNTVjMDBiYzgzYzZhYmQ4YmI4OTlfSUQ6NzY0NjMyNzc5MzA1OTYxNDQzMV8xNzgzODM3MDQ2OjE3ODM4NDA2NDZfVjM)

【系统管理】 - 【角色管理】 - 数据权限 

![](https://internal-api-drive-stream-sg.larksuite.com/space/api/box/stream/download/authcode/?code=ZDlhZTYyY2M2MzkwMTZhYjc3NTliNmY0MjI0OGM3NjhfOWQ4ZmY5MDNjNmE5M2U1ODVmOTNhNzdiYWU5ZTA2NThfSUQ6NzY0NjMyNzc5MzExNTc5NTE2N18xNzgzODM3MDQ2OjE3ODM4NDA2NDZfVjM)

发给对应分盘的产品

分盘名：xxx

账号：xxxKF

密码：xxxxx

谷歌验证码：xxxxx

行为树配置

![](https://internal-api-drive-stream-sg.larksuite.com/space/api/box/stream/download/authcode/?code=MDhkMDVkNDA0MzUwNGNlMWNjNmFiYzI0OTdjOWE1ZGZfMWIzZTY1NzEyNTU0ZDViMDQyODdiYTM2NDg3NzA4Y2ZfSUQ6NzY0NjMyNzc5MzYzMDA3MjU0MF8xNzgzODM3MDQ2OjE3ODM4NDA2NDZfVjM)

![](https://internal-api-drive-stream-sg.larksuite.com/space/api/box/stream/download/authcode/?code=NzUzMTNjNjlhMzUwYjAwOGM5ZWZjMGVkZTk1M2VkNzNfMGQ4NmVkNDgxMGRhMzg4YjI0NDI2MzlmOGVlNDJiMzJfSUQ6NzY0NjMyNzc5NDk5NzM2NjQ5NF8xNzgzODM3MDQ2OjE3ODM4NDA2NDZfVjM)
