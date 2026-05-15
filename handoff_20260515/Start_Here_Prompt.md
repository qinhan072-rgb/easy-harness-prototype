# Start Here Prompt

Copy this into the first message of the new Codex conversation after attaching
the Easy Harness project folder.

---

你正在接手 Easy Harness 线束定制平台项目。

工作目录：

```text
D:\Harness\easy-harness-prototype
```

请先不要急着改代码。先读取交接包：

```text
handoff_20260515/README_Handoff.md
handoff_20260515/Project_Master_Prompt.md
handoff_20260515/Current_State.md
handoff_20260515/Decisions_Log.md
handoff_20260515/Commands_and_Setup.md
handoff_20260515/File_Manifest.md
handoff_20260515/Next_Actions.md
```

然后读取项目当前权威文档：

```text
PROJECT_HANDOFF.md
README.md
docs/current/CURRENT_PLATFORM_BASELINE.md
docs/ai-agent/AI_AGENT_PRINCIPLES.md
docs/setup/MARKETPLACE_PROTECTED_PAYMENT.md
docs/setup/AI_PROVIDER_QWEN_SETUP.md
docs/setup/AUTH_EMAIL_AND_GOOGLE_SETUP.md
package.json
src/App.jsx
src/styles.css
scripts/smoke-test.mjs
```

读取后，请先用中文向我总结你理解到的当前状态，不要马上大改。总结必须包括：

1. 当前平台已经完成什么。
2. 还缺什么才接近真实上线。
3. request 和 order 当前分别承担什么。
4. AI Agent 当前的真实边界是什么。
5. 支付、物流、Marketplace protected payment 当前是做到哪一步。
6. 你认为接下来最应该先做哪一件事，以及为什么。

项目核心目标：

Easy Harness 不是截图原型，而是正在向真实部署推进的线束定制平台。目标是让用户上传自己已有的照片、旧样件、草图、pinout、PDF、CSV 或文字描述，由平台整理成清晰的 Easy Harness Draft，然后进入报价、确认、订单、支付、生产、物流和售后路径。

用户承诺是：

```text
Upload what you have. We'll build the harness you need.
```

你接手时必须牢记：

- 用户不是程序员，需要你作为产品负责人、UX 设计师、全栈工程师和 AI Agent 设计者来判断。
- 不要只满足我字面上的一句话，要从真实用户体验和真实上线架构两个角度推进。
- request 和 order 不能混成一个概念。
- customer、staff、admin 必须是不同角色，客户界面不能有角色切换入口。
- 客户端不要暴露 prototype、mock、Auth provider、manual review、human review、fallback 等实现痕迹。
- 客户对话中的系统身份永远是 Easy Harness。
- AI Agent 不是问卷机器人，也不是工厂 BOM 生成器。它的当前任务是把用户自然表达的需求整理成 Easy Harness Draft。
- AI Agent 不能假装看懂附件内容，除非真的有 OCR、视觉模型、PDF/Excel/CAD 解析结果作为证据。
- 支付和物流现在有平台路径，但还没有接真实 Stripe/PayPal/DHL API。不要因为 API 还没接就删除这些路径，也不要假装它们已经真实完成。
- Marketplace protected payment 是给不信任直接付款的客户用的受保护付款路径，当前是 staff 准备外部 marketplace checkout link，再回填到订单中。

技术栈：

- React/Vite
- Supabase Auth/PostgreSQL/Storage/Edge Functions
- Vercel 前端部署
- Qwen/DeepSeek-compatible AI intake

验证命令：

```bash
npm.cmd run build
npm.cmd run test
```

注意：

- 修改 `supabase/functions/run-checking/index.ts` 后，Vercel 重新部署不够，还需要部署 Supabase Edge Function。
- 不要读取或复制 `.env.local` 里的密钥。
- 不要随便重写或删除已有 migrations。
- 如果只是改前端，修改后跑 build/test。
- 如果改核心流程，同时更新 `scripts/smoke-test.mjs` 和文档。

请先完成阅读和评估，然后给我一个接手总结。

