---
title: 智能客服用户认证与微服务调用流程
source_url: https://openvision.sg.larksuite.com/wiki/XoPbwXcjHi6XB4kS9hIleUd4gyg
---

<title>智能客服用户认证与微服务调用流程</title>

# **认证与微服务调用流程**

## **架构概览**

本项目为微服务架构，通过 `icustomer-gateway`（端口 48079）统一入口，使用 Nacos 做服务发现与配置中心。

三种 URL 前缀：

<sheet sheet-id="Hp8Z35" token="CJBasXckZhREfHtlFLOl4PPOgYe"></sheet>

---

## **一、认证流程**

### **1.1 登录 (`POST /admin-api/system/auth/login`)**

```Plain Text
客户端
  │  POST /admin-api/system/auth/login
  │  { username, password, captcha, googleCode, ... }
  v
AuthController.login()
  └─> AdminAuthServiceImpl.login()
        ├── 1. 校验行为验证码 (aj-captcha, 可开关)
        ├── 2. 校验用户名密码 → 查 system_users 表
        ├── 3. 校验 Google Authenticator TOTP
        ├── 4. 记录登录日志 (system_login_log)
        ├── 5. 更新用户最后登录 IP/时间
        └── 6. OAuth2TokenService.createAccessToken()
              ├── 查 OAuth2Client ("default")
              ├── 生成 RefreshToken → 存 system_oauth2_refresh_token
              ├── 生成 AccessToken → 存 system_oauth2_access_token + Redis
              └── 返回 { userId, accessToken, refreshToken, expiresTime }
```

**Token 存储：**

<sheet sheet-id="blMAut" token="CJBasXckZhREfHtlFLOl4PPOgYe"></sheet>

**Token 有效期：** 由 `system_oauth2_client` 表中 `access_token_validity_seconds` / `refresh_token_validity_seconds` 配置。

---

### **1.2 请求认证 (`GET /rpc-api/system/oauth2/token/check`)**

每次请求到达时，由网关的 `TokenAuthenticationFilter` (`GlobalFilter`) 拦截并校验 Token：

```Plain Text
                             ┌──────────────────────────┐
                             │     客户端 / 浏览器        │
                             │   Authorization: Bearer   │
                             └───────────┬──────────────┘
                                         │
                                         │
                             ┌───────────┴───────────┐
                             │  Gateway Server       │
                             │  TokenAuthentication  │
                             │  Filter (GlobalFilter)│
                             │  WebClient 调用        │
                             │  http://system-server │
                             │  /rpc-api/system/     │
                             │  oauth2/token/check   │
                             └───────────┬───────────┘
                                         │
                                         v
                             ┌──────────────────┐
                             │ OAuth2TokenApiImpl│
                             │ @RestController   │
                             │ /rpc-api/system/  │
                             │ oauth2/token/check│
                             └────────┬─────────┘
                                      │
                                      v
                             ┌──────────────────┐
                             │ OAuth2TokenServiceImpl     │
                             │   .checkAccessToken()      │
                             │     ├─ 1. Redis 查询       │
                             │     │   key: oauth2_access_token:<token>
                             │     ├─ 2. MySQL 查询       │
                             │     │   system_oauth2_access_token 表
                             │     ├─ 3. [兜底] 按 RefreshToken 查询
                             │     │   用于 WebSocket/JimuReport 场景
                             │     ├─ 4. 校验过期 → 401   │
                             │     └─ 5. 回写 Redis 缓存   │
                             └──────────────────┘
```

**网关特殊处理：**

- 网关使用 Guava Cache（5 秒 TTL）缓存 Token 校验结果，避免每次请求都调用 System 服务
- 网关 **不拦截未认证请求**，而是将用户信息以 `login-user` 请求头（JSON 格式）转发给下游服务
- 网关会**移除**客户端传入的 `login-user` 头（防伪造）

---

### **1.3 刷新 Token (`POST /admin-api/system/auth/refresh-token`)**

```Plain Text
AuthController.refreshToken(refreshToken)
  └─> AdminAuthServiceImpl.refreshToken()
        ├── 1. 查 system_oauth2_refresh_token 表
        ├── 2. 校验 clientId 是否为 "default"
        ├── 3. 删除该 refreshToken 关联的所有旧 AccessToken（MySQL + Redis）
        ├── 4. 校验 RefreshToken 是否过期 → 过期则删除并返回 401
        ├── 5. 校验用户是否被禁用
        └── 6. 生成新的 AccessToken（新 UUID + 新过期时间）
              RefreshToken 本身不变，仅 AccessToken 被替换
```

注意：RefreshToken **不轮换**，过期后用户需要重新登录。

---

### **1.4 退出登录 (`POST /admin-api/system/auth/logout`)**

```Plain Text
AuthController.logout(request)
  └─> AdminAuthServiceImpl.logout()
        ├── 1. 从 Authorization 头或 token 参数提取 AccessToken
        ├── 2. OAuth2TokenService.removeAccessToken()
        │     ├─ 查 AccessToken
        │     ├─ 删除 MySQL 中的 access_token 行
        │     ├─ 删除 Redis 中的 access_token 缓存
        │     └─ 删除关联的 RefreshToken
        └── 3. 记录登出日志
```

---

### **1.5 获取权限信息 (`GET /admin-api/system/auth/get-permission-info`)**

登录后的前端初始化请求，返回用户拥有的角色、菜单、权限范围：

```Plain Text
AuthController.getPermissionInfo()
  └─> [需认证 - 无 @PermitAll]
        ├── 1. 从 SecurityContext 获取当前用户 ID
        ├── 2. 查 system_users 基本信息
        ├── 3. 查 system_user_role 获取角色 ID 列表
        ├── 4. 查 system_role，过滤禁用角色
        ├── 5. 计算 menuScope：
        │     有任一角色的 menu_scope = ALL → scope = "all"
        │     否则 → scope = "spread_hidden"（仅展示分盘相关）
        ├── 6. 查 system_role_menu 获取菜单 ID
        ├── 7. 查 system_menu 获取菜单详情，过滤禁用/隐藏菜单
        └── 8. 返回 AuthPermissionInfoRespVO
             { user, roles[], menus[], scope }
```

---

### **1.6 安全配置**

**中央配置：** `IcustomerWebSecurityConfigurerAdapter`

```Plain Text
SecurityFilterChain 规则（按顺序）:
  1. CORS 开启, CSRF 关闭
  2. Session 策略: STATELESS（无状态）
  3. 放行:
     ├─ 静态资源 (*.html, *.css, *.js)
     ├─ @PermitAll 注解的端点（运行时动态扫描）
     ├─ icustomer.security.permit-all-urls 配置的 URL
     ├─ Swagger: /v3/api-docs/**, /webjars/**, /swagger-ui*
     ├─ Druid: /druid/**
     ├─ Actuator: /actuator, /actuator/**
     └─ RPC: /rpc-api/**
  4. 其余全部需认证: anyRequest().authenticated()
```

**模块级扩展：** 每个模块通过 `AuthorizeRequestsCustomizer` Bean 添加额外放行规则。

- `system` 模块：放行 `/rpc-api/system/**`
- `infra` 模块：放行 `/rpc-api/infra/**`、Spring Boot Admin、文件下载

---

## **二、微服务调用流程**

### **2.1 Feign RPC 调用链**

```Plain Text
服务 A (调用方)                         服务 B (提供方)
──────────────                        ──────────────
@FeignClient(name = "infra-server")   @RestController
interface ApiAccessLogApi {           class ApiAccessLogApiImpl
  @PostMapping("/rpc-api/infra/         implements ApiAccessLogApi {
    api-access-log/create")              @PostMapping("/rpc-api/infra/
  createApiAccessLog(...)                  api-access-log/create")
}                                       public void create(...) { }
                                        }

调用流程:
  ┌─ [服务 A] ──────────────────────────────────┐
  │  service.method()                            │
  │    └─ Feign 动态代理                         │
  │         ├─ 解析服务名 "infra-server"          │
  │         │  → Nacos 服务发现                   │
  │         │  → LoadBalancer 选择实例            │
  │         ├─ LoginUserRequestInterceptor        │
  │         │  → 将当前登录用户信息（login-user    │
  │         │     header）传播到下游服务           │
  │         └─ HTTP 请求                          │
  └──────────────────────────────────────────────┘
                        │
                        v
  ┌─ [服务 B] ──────────────────────────────────┐
  │  TokenAuthenticationFilter                   │
  │    → 从 login-user header 还原 LoginUser     │
  │    → 设置到 SecurityContext                  │
  │                                               │
  │  ApiAccessLogApiImpl.create()                 │
  │    → 处理业务逻辑                             │
  └──────────────────────────────────────────────┘
```

### **2.2 RPC API 接口清单**

#### **system-api （服务名** **`system-server`）**

<sheet sheet-id="h5rM3J" token="CJBasXckZhREfHtlFLOl4PPOgYe"></sheet>

#### **infra-api （服务名** **`infra-server`）**

<sheet sheet-id="Fz5zZO" token="CJBasXckZhREfHtlFLOl4PPOgYe"></sheet>

### **2.3 网关路由（微服务模式）**

```Plain Text
网关端口: 48079

路由规则:
  /admin-api/system/**    → grayLb://system-server
  /app-api/system/**      → grayLb://system-server
  /admin-api/h5/**        → grayLb://system-server
  /admin-api/infra/**     → grayLb://infra-server
  /app-api/infra/**       → grayLb://infra-server
  /admin/**               → grayLb://infra-server  (Spring Boot Admin)
  /infra/ws/**            → grayLb://infra-server  (WebSocket)
```

`grayLb://` 为灰度负载均衡方案，支持基于版本/标签的灰度路由。

### **2.4 关键 Header 传播**

<sheet sheet-id="PpkMYj" token="CJBasXckZhREfHtlFLOl4PPOgYe"></sheet>

`LoginUserRequestInterceptor`（Feign 请求拦截器）确保 `login-user` header 在服务间调用时自动传播。

### **2.5 服务间调用时序示例**

以用户请求「查看工单列表」为例，展示完整的认证 + 调用链路：

```Plain Text
浏览器                       网关                        System-Server                    Infra-Server
  │                          │                          │                              │
  │ GET /admin-api/system/   │                          │                              │
  │ work-order/page          │                          │                              │
  │ Authorization: Bearer x  │                          │                              │
  │─────────────────────────>│                          │                              │
  │                          │                          │                              │
  │                     ┌────┴────┐                     │                              │
  │                     │① Token  │                     │                              │
  │                     │校验     │                     │                              │
  │                     │ WebClient                     │                              │
  │                     │ > /rpc-api/system/            │                              │
  │                     │   oauth2/token/check          │                              │
  │                     │──────────────────────────────>│                              │
  │                     │                          ┌───┴───┐                         │
  │                     │                          │② Redis│                         │
  │                     │                          │查缓存  │                         │
  │                     │                          │ MySQL │                         │
  │                     │                          │ 兜底  │                         │
  │                     │                          └───┬───┘                         │
  │                     │ <── return LoginUser ────────│                             │
  │                     │                              │                             │
  │                     │ ③ 设置 login-user header      │                             │
  │                     │ ④ 路由到 system-server ──────>│                             │
  │                     │                              │                             │
  │                     │                          ┌───┴───┐                        │
  │                     │                          │⑤ 权限  │                        │
  │                     │                          │校验    │                        │
  │                     │                          │ > 查    │                       │
  │                     │                          │   role  │                       │
  │                     │                          │ > 查    │                       │
  │                     │                          │   menu  │                       │
  │                     │                          └───┬───┘                        │
  │                     │                              │                             │
  │                     │                          ┌───┴───┐                        │
  │                     │                          │⑥ 业务  │                        │
  │                     │                          │ > 查   │                        │
  │                     │                          │   work_│                        │
  │                     │                          │   order│                        │
  │                     │                          └───┬───┘                        │
  │                     │                          ┌───┴───┐                        │
  │                     │                          │⑦ 异步  │                        │
  │                     │                          │记录访问 │                        │
  │                     │                          │日志    │                        │
  │                     │                          │ Feign  │                        │
  │                     │                          │────────│───────────────────────>│
  │                     │                          │        │⑧ 写入 api_access_log   │
  │                     │                          │<───────│────────────────────────│
  │                     │ <── 返回工单分页数据 ──────│        │                        │
  │ <────────────────────│                          │                              │
  │                     │                          │                              │
```

---

## **三、数据存储**

### **3.1 Token 相关表**

<sheet sheet-id="jn0fJw" token="CJBasXckZhREfHtlFLOl4PPOgYe"></sheet>

### **3.2 用户 & 权限相关表**

<sheet sheet-id="fhoCqJ" token="CJBasXckZhREfHtlFLOl4PPOgYe"></sheet>

### **3.3 Redis 缓存**

<sheet sheet-id="dp9Nye" token="CJBasXckZhREfHtlFLOl4PPOgYe"></sheet>

---

## **四、开发指南**

### **4.1 新增一个 RPC 接口**

```Plain Text
1. 在 -api 模块中定义 Feign 接口
   └─ @FeignClient(name = ApiConstants.NAME)
   └─ @RequestMapping(PREFIX + "/your-path")

2. 在 -biz 模块中实现该接口
   └─ @RestController
   └─ implements 接口
   └─ 委托给 Service 层

3. 确保 -biz 的 SecurityConfiguration 放行了新路径
   └─ /rpc-api/{module}/** 默认已被放行
```

### **4.2 安全最佳实践**

- RPC 接口 (`/rpc-api/**`) 默认全部放行，需在网络层面确保安全（内网部署）
- 服务间调用时，`LoginUser` 通过 `login-user` header 传播，下游服务不要重复校验 Token
- 微服务模式下网关缓存了 Token 校验结果，修改 Token 状态后需等待缓存过期（最长 5 秒）

---

## **五、接入 Go 服务**

Go 服务可以复用 Java 网关的认证机制和 Nacos 服务发现，无需重复实现登录/Token 签发。

### **5.1 对接架构**

```Plain Text
                              ┌──────────────────┐
                              │    客户端/Browser  │
                              │  Authorization:   │
                              │  Bearer <token>   │
                              └────────┬─────────┘
                                       │
                         ┌─────────────┴─────────────┐
                         │    Java Gateway (48079)    │
                         │                           │
                         │  ① Token 校验（WebClient） │
                         │  → system-server           │
                         │  ② 设置 login-user header  │
                         │  ③ 路由到 Go 服务           │
                         └─────────────┬─────────────┘
                                       │ login-user: URL-encoded JSON
                                       │ tenant-id: 123
                                       v
                         ┌──────────────────────────┐
                         │     Go Service (:8080)    │
                         │                           │
                         │  ① 解析 login-user header  │
                         │  ② 从中获取 userId /       │
                         │     userType / tenantId    │
                         │  ③ 处理业务逻辑            │
                         │  ④ [可选] Feign 调用        │
                         │     Java 服务获取更多数据    │
                         └──────────────────────────┘
```

### **5.2 集成步骤**

#### **步骤 1：Go 服务注册到 Nacos**

Go 服务需要向 Nacos 注册，使网关能通过服务名发现它。

```Go
// 使用 github.com/nacos-group/nacos-sdk-go/v2
import "github.com/nacos-group/nacos-sdk-go/v2/clients"
import "github.com/nacos-group/nacos-sdk-go/v2/vo"

func RegisterNacos() {
    client, _ := clients.NewNamingClient(
        vo.NacosClientParam{
            ClientConfig: &constant.ClientConfig{
                NamespaceId: "local",              // 与环境一致
                TimeoutMs:   5000,
            },
            ServerConfigs: []constant.ServerConfig{
                {IpAddr: "127.0.0.1", Port: 8848},
            },
        },
    )
    client.RegisterInstance(vo.RegisterInstanceParam{
        Ip:          "192.168.1.100",
        Port:        8080,
        ServiceName: "go-server",       // 服务名，与网关 route URI 对应
        GroupName:   "DEFAULT_GROUP",
        Weight:      10,
        Metadata:    map[string]string{"version": "1.0"},
    })
}
```

关键点：

- **ServiceName** 必须与网关路由配置中的 `grayLb://{service-name}` 一致
- **NamespaceId** 需与网关的 `spring.cloud.nacos.discovery.namespace` 一致（如 `local`）
- 支持多实例部署，网关自动负载均衡

#### **步骤 2：网关添加路由**

在网关的 `application-{profile}.yaml`（开发、生产每个环境都需要）中添加路由：

```YAML
spring:
  cloud:
    gateway:
      routes:
        ## go-server 服务
        - id: go-admin-api
          uri: grayLb://go-server      # 与 Nacos 服务名一致
          predicates:
            - Path=/admin-api/go/**    # 路径前缀，前端通过该路径访问
        - id: go-app-api
          uri: grayLb://go-server
          predicates:
            - Path=/app-api/go/**
```

如果需要 Knife4j 聚合 Swagger/OpenAPI 文档，在 `application.yaml` 中添加：

```YAML
knife4j:
  gateway:
    routes:
      - name: go-server
        service-name: go-server
        url: /admin-api/go/v3/api-docs   # Go 服务提供的 OpenAPI 端点
```

#### **步骤 3：Go 服务解析认证信息**

网关会将认证后的用户信息以 `login-user` header 转发。Go 服务需解析此 header：

```Go
// LoginUser 对应 Java 端的 com.zhizhi.gateway.filter.security.LoginUser
type LoginUser struct {
    Id          int64             `json:"id"`
    UserType    int               `json:"userType"`    // 2=管理员, 1=会员
    Info        map[string]string `json:"info"`        // nickname, username, deptId
    TenantId    int64             `json:"tenantId"`
    Scopes      []string          `json:"scopes"`
    ExpiresTime string            `json:"expiresTime"` // "2026-06-05 19:59:44"
}

// 从请求中解析登录用户
func GetLoginUser(r *http.Request) (*LoginUser, error) {
    header := r.Header.Get("login-user")
    if header == "" {
        return nil, nil // 未认证的请求
    }
    decoded, _ := url.QueryUnescape(header)
    var user LoginUser
    if err := json.Unmarshal([]byte(decoded), &user); err != nil {
        return nil, err
    }
    return &user, nil
}

// 中间件示例
func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        user, err := GetLoginUser(r)
        if err != nil || user == nil {
            // 未认证请求仍然放行（权限由接口自身决定，与 Java 端行为一致）
            next.ServeHTTP(w, r)
            return
        }
        // 将用户信息注入 context
        ctx := context.WithValue(r.Context(), "loginUser", user)
        ctx = context.WithValue(ctx, "userId", user.Id)
        ctx = context.WithValue(ctx, "tenantId", user.TenantId)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

`login-user` header 传递的数据示例（URL 解码后）：

```JSON
{
  "id": 81,
  "userType": 2,
  "info": {
    "nickname": "Raph",
    "username": "Raph",
    "deptId": null
  },
  "tenantId": 1,
  "scopes": [],
  "expiresTime": "2026-06-05T19:59:44"
}
```

#### **步骤 4：Go 服务主动校验 Token（可选）**

对于 WebSocket 连接、回调通知等无法通过网关传递 header 的场景，Go 服务可直接调用 Java 端的 Token 校验接口：

```Go
// 调用 Java system-server 的 Token 校验接口
func CheckAccessToken(accessToken string) (*LoginUser, error) {
    // 通过 Nacos 服务发现获取 system-server 地址，
    // 或直接通过 Nacos 客户端 resolve
    url := fmt.Sprintf("http://system-server/rpc-api/system/oauth2/token/check?accessToken=%s", accessToken)
    
    resp, err := http.Get(url) // 生产环境建议使用带服务发现的 HTTP 客户端
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    var result struct {
        Code int        `json:"code"`
        Data *LoginUser `json:"data"`
    }
    json.NewDecoder(resp.Body).Decode(&result)
    if result.Code != 0 {
        return nil, fmt.Errorf("token invalid: code=%d", result.Code)
    }
    return result.Data, nil
}
```

> **注意**：此调用走内网，无需认证。生产环境中建议通过 Nacos 客户端（`nacos-sdk-go`）解析 `system-server` 的实际地址。

#### **步骤 5：Go 服务调用 Java RPC 接口**

Go 服务可以像 Feign 客户端一样，通过 HTTP 直接调用 Java 服务的 `/rpc-api/**` 内网端点。 所有 RPC 端点返回统一的 `CommonResult<T>` JSON 格式：

```JSON
{
  "code": 0,       // 0=成功，非0=业务错误
  "data": {...},   // 成功时的负载数据
  "msg": ""        // 错误时的提示信息
}
```

##### **5.2.5.1 通用 RPC 客户端**

建议封装一个可复用的 RPC 客户端，统一处理服务发现、header 传播、响应解析：

```Go
package rpc

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "net/url"
    "time"
)

// CommonResult 对应 Java 的 CommonResult<T>
type CommonResult struct {
    Code int             `json:"code"`
    Data json.RawMessage `json:"data"` // 延迟解析，由调用方反序列化为具体类型
    Msg  string          `json:"msg"`
}

// RpcClient RPC 调用客户端
type RpcClient struct {
    httpClient *http.Client
    // 服务地址解析函数——可从 Nacos 获取，也可用固定映射
    resolve func(serviceName string) (baseURL string, err error)
}

func NewRpcClient(resolve func(string) (string, error)) *RpcClient {
    return &RpcClient{
        httpClient: &http.Client{
            Timeout: 10 * time.Second,
            Transport: &http.Transport{
                MaxIdleConns:        50,
                MaxIdleConnsPerHost: 10,
                IdleConnTimeout:     90 * time.Second,
            },
        },
        resolve: resolve,
    }
}

// Get 发起 GET 请求，自动注入 login-user header
func (c *RpcClient) Get(ctx context.Context, serviceName, path string, query map[string]string, loginUser *LoginUser, result interface{}) error {
    base, err := c.resolve(serviceName)
    if err != nil {
        return fmt.Errorf("resolve service %s: %w", serviceName, err)
    }
    u, _ := url.Parse(base + path)
    q := u.Query()
    for k, v := range query {
        q.Set(k, v)
    }
    u.RawQuery = q.Encode()

    req, _ := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
    c.injectLoginUser(req, loginUser)

    return c.do(req, result)
}

// Post 发起 POST 请求（JSON body）
func (c *RpcClient) Post(ctx context.Context, serviceName, path string, body interface{}, loginUser *LoginUser, result interface{}) error {
    base, err := c.resolve(serviceName)
    if err != nil {
        return fmt.Errorf("resolve service %s: %w", serviceName, err)
    }
    var buf bytes.Buffer
    if err := json.NewEncoder(&buf).Encode(body); err != nil {
        return err
    }
    req, _ := http.NewRequestWithContext(ctx, "POST", base+path, &buf)
    req.Header.Set("Content-Type", "application/json")
    c.injectLoginUser(req, loginUser)

    return c.do(req, result)
}

func (c *RpcClient) injectLoginUser(req *http.Request, u *LoginUser) {
    if u == nil {
        return
    }
    b, _ := json.Marshal(u)
    req.Header.Set("login-user", url.QueryEscape(string(b)))
}

func (c *RpcClient) do(req *http.Request, result interface{}) error {
    resp, err := c.httpClient.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    var cr CommonResult
    if err := json.Unmarshal(body, &cr); err != nil {
        return fmt.Errorf("unmarshal CommonResult: %w", err)
    }
    if cr.Code != 0 {
        return fmt.Errorf("rpc error: code=%d msg=%s", cr.Code, cr.Msg)
    }
    return json.Unmarshal(cr.Data, result)
}
```

##### **5.2.5.2 服务地址解析**

生产环境建议通过 Nacos SDK 动态解析服务地址，也支持静态映射用于开发调试：

```Go
package rpc

import "github.com/nacos-group/nacos-sdk-go/v2/clients"
import "github.com/nacos-group/nacos-sdk-go/v2/vo"

// NacosResolver 通过 Nacos 服务发现解析地址
type NacosResolver struct {
    client naming_client.INamingClient
}

func NewNacosResolver() (*NacosResolver, error) {
    client, err := clients.NewNamingClient(
        vo.NacosClientParam{
            ClientConfig: &constant.ClientConfig{
                NamespaceId: "local",
                TimeoutMs:   5000,
            },
            ServerConfigs: []constant.ServerConfig{
                {IpAddr: "127.0.0.1", Port: 8848},
            },
        },
    )
    if err != nil {
        return nil, err
    }
    return &NacosResolver{client: client}, nil
}

func (r *NacosResolver) Resolve(serviceName string) (string, error) {
    instance, err := r.client.SelectOneHealthyInstance(vo.SelectOneHealthInstanceParam{
        ServiceName: serviceName,
        GroupName:   "DEFAULT_GROUP",
    })
    if err != nil {
        return "", err
    }
    return fmt.Sprintf("http://%s:%d", instance.Ip, instance.Port), nil
}

// 开发环境也可用静态映射简化:
var staticMapping = map[string]string{
    "system-server": "http://192.168.10.20:48081",
    "infra-server":  "http://192.168.10.20:48082",
}

func StaticResolve(serviceName string) (string, error) {
    addr, ok := staticMapping[serviceName]
    if !ok {
        return "", fmt.Errorf("unknown service: %s", serviceName)
    }
    return addr, nil
}
```

##### **5.2.5.3 调用示例**

**调用字典数据查询（GET）：**

```Go
// 调用 system-server 的字典查询 RPC
var dictLabel string
err := rpcClient.Get(ctx, "system-server",
    "/rpc-api/system/dict-data/get",
    map[string]string{"dictType": "common_status", "value": "0"},
    loginUser,
    &dictLabel,
)
```

**调用用户信息查询（GET）：**

```Go
// 调用 system-server 的用户查询 RPC
type AdminUserResp struct {
    Id       int64  `json:"id"`
    Nickname string `json:"nickname"`
    DeptId   int64  `json:"deptId"`
    Mobile   string `json:"mobile"`
}
var user AdminUserResp
err := rpcClient.Get(ctx, "system-server",
    "/rpc-api/system/user/get",
    map[string]string{"id": "81"},
    loginUser,
    &user,
)
```

**写入 API 访问日志（POST）：**

```Go
type ApiAccessLogCreateReq struct {
    UserId     int64  `json:"userId"`
    UserType   int    `json:"userType"`
    RequestUrl string `json:"requestUrl"`
    UserAgent  string `json:"userAgent"`
    Duration   int    `json:"duration"`
}
req := ApiAccessLogCreateReq{
    UserId:     123,
    UserType:   2,
    RequestUrl: "/admin-api/go/hello",
    UserAgent:  "GoService/1.0",
    Duration:   45,
}
var result json.RawMessage
err := rpcClient.Post(ctx, "infra-server",
    "/rpc-api/infra/api-access-log/create",
    req, loginUser, &result,
)
```

##### **5.2.5.4 全链路传播 login-user**

Go 服务接收网关请求并调用 Java RPC 时，应将从网关收到的 `login-user` header 原样传递给下游 Java 服务，保持用户身份一致：

```Go
func (s *GoServer) handleBizRequest(w http.ResponseWriter, r *http.Request) {
    // 1. 从当前请求解析 loginUser（网关注入）
    loginUser := GetLoginUser(r)

    // 2. 调用 Java RPC 时自动注入 loginUser（见 RpcClient 实现）
    var deptName string
    err := s.rpcClient.Get(r.Context(), "system-server",
        "/rpc-api/system/dept/get-name",
        map[string]string{"deptId": "10"},
        loginUser,    // ← 自动传播 login-user header
        &deptName,
    )
}
```

##### **5.2.5.5 可用 RPC 端点速查**

<sheet sheet-id="OnKBTv" token="CJBasXckZhREfHtlFLOl4PPOgYe"></sheet>

完整接口清单见上方「2.2 RPC API 接口清单」。

### **5.3 完整接入示例**

```Go
// cmd/main.go
package main

import (
    "context"
    "encoding/json"
    "log"
    "net/http"
    "net/url"
    "strconv"
)

// LoginUser 认证用户信息
type LoginUser struct {
    Id          int64             `json:"id"`
    UserType    int               `json:"userType"`
    Info        map[string]string `json:"info"`
    TenantId    int64             `json:"tenantId"`
    Scopes      []string          `json:"scopes"`
    ExpiresTime string            `json:"expiresTime"`
}

func GetLoginUser(r *http.Request) *LoginUser {
    h := r.Header.Get("login-user")
    if h == "" {
        return nil
    }
    s, _ := url.QueryUnescape(h)
    var u LoginUser
    if json.Unmarshal([]byte(s), &u) != nil {
        return nil
    }
    return &u
}

// 将用户信息注入 context 的中间件
func Auth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        user := GetLoginUser(r)
        if user != nil {
            ctx := r.Context()
            ctx = context.WithValue(ctx, "userId", user.Id)
            ctx = context.WithValue(ctx, "userType", user.UserType)
            ctx = context.WithValue(ctx, "tenantId", user.TenantId)
            r = r.WithContext(ctx)
        }
        next.ServeHTTP(w, r)
    })
}

func main() {
    // 1. 注册 Nacos (略)
    // 2. 路由 + 中间件
    mux := http.NewServeMux()
    mux.Handle("/admin-api/go/hello", Auth(http.HandlerFunc(handleHello)))

    log.Println("go-server listening on :8080")
    http.ListenAndServe(":8080", mux)
}

func handleHello(w http.ResponseWriter, r *http.Request) {
    userId := r.Context().Value("userId")
    if userId == nil {
        w.Write([]byte(`{"code":401,"msg":"未登录"}`))
        return
    }
    w.Write([]byte(`{"code":0,"data":"hello user ` + strconv.FormatInt(userId.(int64), 10) + `"}`))
}
```

### **5.4 注意点**

<sheet sheet-id="9Oxvqt" token="CJBasXckZhREfHtlFLOl4PPOgYe"></sheet>
