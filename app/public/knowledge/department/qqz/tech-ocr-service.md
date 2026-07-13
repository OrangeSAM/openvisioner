# come-icustomer-ocr 项目说明与运维手册

## **项目基本信息**

- 项目名称：`come-icustomer-ocr`
- 仓库地址：`https://gitgf82inycvabsil120gf8i.dp-git-hf8j34b8sioj0du3uhcndiskvr2.com/come/come-icustomer-ocr.git`
- 主服务入口：`embedding_search_api_product.py`
- 服务端口：`7777`
- 技术栈：FastAPI、PaddleOCR、SentenceTransformer、PostgreSQL、Docker
- 主要能力：

- 图片 OCR 识别和支付凭证信息提取
- 印度身份证、银行卡信息解析
- 视频支付凭证检测
- 文本向量生成
- 基于向量相似度匹配客服问题节点

## **代码结构**

```Plain Text
come-icustomer-ocr/
├── embedding_search_api_product.py # 当前主入口，启动 FastAPI 服务
├── api_common.py # 全局状态、DB 连接池、模型/OCR 初始化、公共查询函数
├── api_ocr.py # OCR、身份证、银行卡解析接口
├── ocr_utils.py # 支付截图 OCR 结果解析：UTR、金额、时间、收款方等
├── api_embedding.py # 向量生成、相似问题匹配、平台/语言列表接口
├── api_model_manager.py # 模型版本、上传、重载接口
├── api_video_detection.py # 视频支付凭证检测接口
├── video_payment_detector.py # 视频抽帧和支付凭证规则检测逻辑
├── indian_id_parser.py # 印度身份证解析
├── indian_bank_parser.py # 印度银行卡解析
├── ModelUtils.py # Pydantic 请求/响应模型
├── config_loader.py # 根据 APP_ENV 加载不同环境配置
├── config/
│ ├── db_config.local.yaml # 本地环境配置
│ ├── db_config.dev.yaml # 开发环境配置
│ ├── db_config.test.yaml # 测试环境配置
│ └── db_config.prod.yaml # 生产环境配置
├── Dockerfile-cpu # 测试环境 CPU 镜像
├── Dockerfile-gpu # 生产环境 GPU 镜像
├── requirements-cpu.txt # CPU 容器依赖
├── requirements-cpu(本地启动用).txt # 本地 CPU 依赖
├── requirements-gpu.txt # GPU 容器依赖
└── static/ # 前端静态页面
```

补充说明：

- `embedding_search_api_product_prod.py`、`embedding_search_api_product.py.bak`、`PaddleOcrFastApi.py` 属于历史/备份入口，目前主入口以 `embedding_search_api_product.py` 为准。
- `README.md` 当前还是 GitLab 模板内容，不具备项目说明作用。
- `config/*.yaml` 里包含数据库连接信息，交接时需要单独确认账号、密码、网络白名单，不建议继续明文提交到仓库。

## **启动链路**

服务启动入口是 `embedding_search_api_product.py`。

启动时按以下顺序初始化：

1. `app_state.load_config()`：读取配置，默认使用 `APP_ENV` 对应的 `config/db_config.{env}.yaml`，未设置时使用 `local`。
2. `app_state.init_db_pool()`：初始化 PostgreSQL 连接池。
3. `app_state.init_models()`：加载 `SentenceTransformer` 模型，路径来自配置里的 `model.model_path`。
4. `app_state.init_ocr()`：初始化 `PaddleOCR(lang='en')`。
5. `app_state.init_customer_service()`：初始化客服文本预处理服务。
6. 注册 OCR、向量匹配、模型管理、视频检测路由。

Linux 容器中默认启动 4 个 worker；Windows 本地启动默认 1 个 worker。

## **环境配置**

配置加载规则：

```Plain Text
APP_ENV=local -> config/db_config.local.yaml
APP_ENV=dev -> config/db_config.dev.yaml
APP_ENV=test -> config/db_config.test.yaml
APP_ENV=prod -> config/db_config.prod.yaml
```

配置文件结构：

```YAML
database:
dbname: intelligent_customer
user: <数据库用户>
password: <数据库密码>
host: <数据库地址>
port: 5432
model: null

model:
model_path: 
```

注意事项：

- 本地配置里的模型路径通常是 Windows 路径，例如 `D:\data\fine-tuned-model`。
- 测试/生产容器内模型路径通常是 `/data/fine-tuned-model`，需要通过镜像内置或 Docker volume 挂载提供。
- 启动前必须确认模型目录存在，且里面是 `SentenceTransformer` 可加载的完整模型文件。
- 当前 `.gitignore` 未忽略 `config/*.yaml` 和 `pycache/`，建议项目组后续补充忽略规则并清理敏感配置。

## **本地环境运行方式**

适用场景：开发人员自己电脑调试，通常使用 CPU。

建议环境：

- Python 3.10 或 3.11
- PostgreSQL 可访问
- 本地存在向量模型目录
- Windows PowerShell 或 Linux/macOS Shell 均可

步骤：

```PowerShell
git clone https://gitgf82inycvabsil120gf8i.dp-git-hf8j34b8sioj0du3uhcndiskvr2.com/come/come-icustomer-ocr.git
cd come-icustomer-ocr

python -m venv .venv
.\.venv\Scripts\Activate.ps1

pip install -r "requirements-cpu(本地启动用).txt"

$env:APP_ENV="local"
python embedding_search_api_product.py
```

启动成功后访问：

- Web 页面：`http://127.0.0.1:7777/`
- OpenAPI 文档：`http://127.0.0.1:7777/docs`

本地常见检查项：

- `config/db_config.local.yaml` 的数据库地址、账号、密码是否可用。
- `model.model_path` 是否指向本机存在的模型目录。
- PaddleOCR 首次启动可能会下载/初始化模型，耗时较长。
- Windows 本地只启动 1 个 worker，方便调试。

## **测试环境运行方式：CPU 容器**

适用场景：测试环境部署，使用 CPU 版本 PaddlePaddle。

相关文件：

- `Dockerfile-cpu`
- `requirements-cpu.txt`
- 默认命令：`python3 embedding_search_api_product.py`
- 暴露端口：`7777`

构建镜像：

```Bash
docker build -f Dockerfile-cpu -t come-icustomer-ocr:cpu .
```

运行容器示例：

```Bash
docker run -d \
--name come-icustomer-ocr-test \
-p 7777:7777 \
-e APP_ENV=test \
-v /data/fine-tuned-model:/data/fine-tuned-model \
come-icustomer-ocr:cpu
```

测试环境注意事项：

- 容器内数据库 host 当前配置通常使用 `postgres`，需要确认容器网络或服务发现能解析该名称。
- 如果数据库不在同一个 Docker 网络，需要改为测试库实际地址。
- 模型目录建议挂载到 `/data/fine-tuned-model`。
- CPU 环境 OCR 和向量模型推理速度会慢于 GPU 环境，压测时需要单独评估。

## **生产环境运行方式：GPU 容器**

适用场景：生产环境部署，使用 GPU 版本 PaddlePaddle。

相关文件：

- `Dockerfile-gpu`
- `requirements-gpu.txt`
- 基础镜像：`paddlepaddle/paddle:3.3.1-gpu-cuda12.9-cudnn9.9`
- 默认命令：`python3 embedding_search_api_product.py`
- 暴露端口：`7777`

生产宿主机要求：

- NVIDIA GPU
- 已安装匹配的 NVIDIA Driver
- Docker 已安装 NVIDIA Container Toolkit
- 能执行 `docker run --gpus all ...`

构建镜像：

```Bash
docker build -f Dockerfile-gpu -t come-icustomer-ocr:gpu .
```

运行容器示例：

```Bash
docker run -d \
--name come-icustomer-ocr-prod \
--gpus all \
-p 7777:7777 \
-e APP_ENV=prod \
-v /data/fine-tuned-model:/data/fine-tuned-model \
come-icustomer-ocr:gpu
```

生产环境注意事项：

- 启动前确认 `config/db_config.prod.yaml` 使用生产数据库地址。
- 不要把生产数据库密码写进公开仓库，建议改为环境变量或密钥管理系统注入。
- 确认宿主机 CUDA Driver 与基础镜像 CUDA 版本兼容。
- 服务启动后建议先访问 `/docs` 或健康接口类请求确认 FastAPI 已加载完成。
- 如果容器启动后立即退出，优先查看 `docker logs come-icustomer-ocr-prod`，常见原因是数据库不可达或模型目录不存在。

## **主要接口清单**

### **页面和文档**

- `GET /`：静态前端页面。
- `GET /docs`：FastAPI 自动生成的接口文档。

### **OCR 相关**

- `POST /ocr-process`

- 入参：图片文件 `file`
- 功能：OCR 图片并提取支付凭证信息，例如 UTR、交易时间、金额、收款方、是否有效。
- `POST /ocr-raw`

- 入参：图片文件 `file`
- 功能：返回 OCR 原始文本列表和拼接后的全文，适合排查识别问题。
- `POST /parse-indian-id`

- 入参：图片文件 `file`
- 功能：解析印度身份证信息。
- `POST /parse-indian-bank-info`

- 入参：图片文件 `file`
- 功能：解析印度银行卡信息。

### **视频检测**

- `POST /detect-payment-from-video`

- 入参：视频文件 `file`
- 限制：支持 `.mp4`、`.avi`、`.mov`、`.mkv`、`.flv`、`.wmv`、`.webm`，大小不超过 50MB。
- 功能：抽帧 OCR，检测是否包含支付凭证、UTR、金额、交易号等。
- `POST /detect-payment-from-video-simple`

- 入参：视频文件 `file`
- 功能：宽松版本，只要匹配到支付相关关键词即可判定。

### **向量匹配**

- `POST /find_similar_question`

- 入参示例：

```JSON
{
"category_topic": "",
"user_input": "how to recharge",
"platform": "ComeIndia",
"language": "en"
}
```

- 功能：对用户输入生成向量，在当前平台和语言的已激活问题树中查找相似问题，返回最多 3 条相似度大于 `0.7` 的结果。
- `POST /api/get_topic_embedding_by_str`

- 入参示例：

```JSON
{
"text": "how to recharge",
"platform": "ComeIndia"
}
```

- 功能：返回文本 embedding。
- `GET /platforms`

- 功能：从 `system_oauth2_client` 表获取平台列表。
- `GET /languages`

- 功能：返回固定语言列表：`en`、`hi`、`zh-cn`。

## **数据库依赖**

服务依赖 PostgreSQL，主要涉及表：

- `icustomer_nodes_version`

- 用于查询指定 `platform`、`language` 下状态为激活的版本。
- 关键字段：`platform`、`language`、`version`、`status`
- `icustomer_nodes`

- 用于递归查询客服问题树和向量。
- 关键字段：`id`、`topic`、`topic_embedding`、`version`、`parent_id`、`platform`、`language`
- `system_oauth2_client`

- 用于获取平台列表。
- 关键字段：`name`、`status`、`deleted`、`client_id`

向量匹配逻辑：

1. 根据 `platform`、`language` 查询激活版本。
2. 从 `icustomer_nodes` 递归取出分类、问题、答案树。
3. 对用户输入生成 embedding。
4. 与问题节点的 `topic_embedding` 做余弦相似度。
5. 返回相似度大于 `0.7` 的前 3 个问题。

## **模型依赖**

本项目有两类模型依赖：

- PaddleOCR 模型：由 `PaddleOCR(lang='en')` 初始化，用于图片/视频 OCR。
- SentenceTransformer 模型：由 `model.model_path` 指向，用于文本向量生成和问题匹配。

模型目录要求：

- 必须是 `SentenceTransformer(model_path)` 可直接加载的目录。
- 容器环境建议统一挂载为 `/data/fine-tuned-model`。

## **OCR 解析维护说明**

支付凭证解析集中在 `ocr_utils.py`。

当前主要提取字段：

- `utr`
- `order_time`
- `money`
- `pay_money`
- `paid_to`
- `is_valid`

维护建议：

- 新增支付 App 或新截图格式时，优先通过 `/ocr-raw` 拿到原始 OCR 文本。
- 将原始文本整理成列表，直接调用 `process_ocr_result(recognized_texts)` 做本地复现。
- 日期、金额、UTR 都是基于规则和正则提取，新增兼容时尽量补充样例。
- 最近已兼容 `3July 2026 at 8:05 AM`、`3Ju1y 2026 at 8:05 AM` 等 OCR 月份粘连/噪音格式。

## **常用运维命令**

查看容器日志：

```Bash
docker logs -f come-icustomer-ocr-test
docker logs -f come-icustomer-ocr-prod
```

进入容器：

```Bash
docker exec -it come-icustomer-ocr-test bash
```

检查服务是否监听：

```Bash
curl http://127.0.0.1:7777/docs
```

查看模型版本：

```Bash
curl http://127.0.0.1:7777/model-version
```

重新加载模型：

```Bash
curl -X POST http://127.0.0.1:7777/reload-model
```

## **常见问题排查**

### **服务启动失败**

优先检查：

- `APP_ENV` 是否设置正确。
- 对应的 `config/db_config.{env}.yaml` 是否存在。
- 数据库网络是否可达。
- 数据库账号密码是否正确。
- `model.model_path` 是否存在。
- 容器内路径和宿主机挂载路径是否一致。

### **OCR 首次启动慢**

PaddleOCR 首次初始化可能比较慢，CPU 环境尤其明显。观察日志确认是否卡在模型初始化。

### **向量匹配返回 blank**

常见原因：

- `icustomer_nodes_version` 没有对应平台和语言的激活版本。
- `icustomer_nodes` 没有对应版本的问题节点。
- `topic_embedding` 为空或格式无法解析。
- 相似度低于阈值 `0.7`。

### **GPU 容器无法使用 GPU**

检查：

```Bash
nvidia-smi
docker run --rm --gpus all nvidia/cuda:12.0.0-base-ubuntu22.04 nvidia-smi
```

如果第二条失败，通常是 NVIDIA Container Toolkit 或 Docker GPU 配置问题。

## **交接风险和改进建议**

- 业务问题排查：如果支付截图中日期、UTR、金额、收款方等字段无法识别，先调用 `POST /ocr-raw` 获取原始 OCR 文本，确认 OCR 实际识别成了什么字符串，再维护 `ocr_utils.py`。
- 日期无法识别时，重点检查 `ocr_utils.py` 中的 `time_patterns`、`time_formats`、`preprocess_time_string()`、`normalize_order_time_string()`。如果是新日期格式，需要增加对应正则；如果是 OCR 噪音导致月份、日期、AM/PM 粘连或字符误识别，需要补充日期格式化和月份归一化逻辑。
- UTR 无法识别时，重点检查 `ocr_utils.py` 中的 `utr_patterns`。如果新截图把 `UTR`、`UPI Ref No`、`UPI Transaction ID` 等标签识别成了新的变体，需要增加对应正则，并注意只提取 12 位 UTR，避免误把金额、手机号、交易号当成 UTR。
- 金额无法识别时，重点检查金额提取逻辑中的纯数字行、货币符号、`Paid to`、`Debited from`、`UTR` 前后位置判断。新增规则时要避免把时间、银行卡尾号、交易流水号误判为金额。
- 每次新增正则后，建议把 `/ocr-raw` 返回的文本整理成一个 `recognized_texts` 列表，在本地直接调用 `process_ocr_result(recognized_texts)` 验证返回字段，至少确认 `order_time`、`utr`、`pay_money` 不受旧样例影响。
- 配置文件存在明文数据库密码，建议改为环境变量或密钥管理。
- `.gitignore` 建议补充：

```Plain Text
__pycache__/
*.pyc
config/db_config.*.yaml
!config/db_config.example.yaml
```

- 建议新增 `config/db_config.example.yaml`，只保留字段示例，不包含真实密码。
- 建议补充自动化测试，尤其是 `ocr_utils.py` 的支付截图解析样例。
- 建议补充健康检查接口，例如 `GET /health`，用于容器编排系统探活。
- 建议统一历史入口文件，避免后续维护人员误用 `embedding_search_api_product_prod.py` 或 `.bak` 文件。
- 建议在生产容器中显式挂载模型目录和配置文件，避免镜像内混入敏感配置。
