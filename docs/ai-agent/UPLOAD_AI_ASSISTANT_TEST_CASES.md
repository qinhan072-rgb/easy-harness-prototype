# Upload with AI assistance 中文测试用例

最后核对日期：2026-06-30

本文档只验证新的融合入口：

```text
Canvas configurator
Upload with AI assistance
```

`AI Upload Chat` 是上传页右侧的小助理。它帮助用户把当前上传包说清楚，不是独立需求入口，也不能阻塞用户提交。

## 当前测试附件

主测试附件使用当前本机最新的 field eval 包：

```text
D:\Harness\easy-harness-project-materials\test-fixtures\ai-agent-field-eval-v2\attachments
```

截至 2026-06-30，目录中真实存在的附件是：

- `aquaponics_io_list.csv`
- `aquaponics_route_notes.txt`
- `bms_gateway_signal_note.txt`
- `cabinet_backplate.dwg`
- `greenhouse_connector_notes.txt`
- `greenhouse_sample_measurements.txt`
- `old_48v_pin_table.csv`
- `old_48v_service_note.txt`
- `pump_motor_label_note.txt`
- `robot_axis_layout.FCStd`
- `robot_vendor_export.3mf`
- `sorter_j1_pinout.csv`
- `warehouse_door_service_record.csv`

配套用例来源：

```text
D:\Harness\easy-harness-project-materials\test-fixtures\ai-agent-field-eval-v2\case-pack.json
D:\Harness\easy-harness-project-materials\test-fixtures\ai-agent-field-eval-v2\README_ZH.md
```

历史轻量附件包仍可用于基本上传测试，但不要把它当成最新主用例：

```text
D:\Harness\easy-harness-project-materials\test-fixtures\ai-attachment-intake-v1\attachments
```

这个历史目录中真实存在的文件是：

- `bracket_outline.dxf`
- `dt06_6s_connector_photo_mock.png`
- `dt06_6s_connector_shell.step`
- `dt06_6s_pinout.csv`
- `dt06_6s_pinout.xlsx`
- `dt06_6s_reference_note.pdf`
- `protective_boot_ascii.stl`

## 重要测试原则

- 不要把这些用例写进 AI 的固定回答。
- 不要让 AI 按文件名、案例编号或关键词进入脚本化流程。
- AI 只能使用当前表单状态、用户文字、文件名、文件类型、数量、备注等可见信息。
- 上传前的小助理不能声称它已经看懂图片内容、OCR 了 PDF、解析了 CAD 几何或读取了表格行。
- 小助理可以说“这个文件名/类型看起来可能适合作为参考”，但不能说“我已经确认里面是什么”。
- 工厂内部事项，例如 BOM、cut list、端子替代料、压接工具、生产测试，不应该要求客户在上传阶段回答。

## 用例 1：用户上传专业表格和路线说明，然后用文字问 AI

用户画像：懂设备，但不是线束工艺工程师。

附件：

- `aquaponics_io_list.csv`
- `aquaponics_route_notes.txt`

步骤：

1. 进入 `Upload with AI assistance`。
2. 上传以上两个文件。
3. 在右侧 `AI Upload Chat` 输入：`这些资料够你们先 review 吗？我还应该补什么说明？`
4. 发送。

期望：

- AI 应该像上传助理一样回答，而不是抛工业问卷。
- AI 应该基于“已有表格和路线说明”建议用户补一两句最关键的上下文，例如连接目标、数量、长度或环境。
- AI 不应该要求客户提供压接工具、最终 BOM、生产测试方法。
- 如果 Qwen 正常返回，应出现只读建议卡片，用户可点击 `Add to design notes` 写入当前 harness notes。

## 用例 2：旧资料与最新文字冲突

用户画像：采购或维修人员，有旧服务资料，但当前需求已经变了。

附件：

- `old_48v_service_note.txt`
- `old_48v_pin_table.csv`

用户文字：

```text
The old service note is only for the physical round panel socket. Please ignore its old 48V pin function. The current build is a 24V adapter: round panel socket on one end, Anderson SB50 on the other end, red/black 12 AWG, 900 mm overall length, quantity 8 pcs. Indoor charger cabinet, no signal wires.
```

期望：

- AI 应尊重用户最新文字，把旧文件当参考资料或被覆盖资料。
- AI 不应该把当前需求写成 48V。
- AI 不应该重复问数量、长度、另一端是什么，因为用户已经给出。
- 建议 note 应该帮助 Easy Harness review，而不是生成生产图纸。

## 用例 3：只有 CAD/3D/机械文件，缺少连接目标

用户画像：机械设计人员，以为上传机械文件就能做线束。

附件：

- `robot_axis_layout.FCStd`
- `robot_vendor_export.3mf`
- `cabinet_backplate.dwg`

用户文字：

```text
I uploaded the machine cable design files. Please make the cable according to those files.
```

期望：

- AI 应承认已收到这些文件类型。
- AI 不能声称已读取 FCStd、3MF、DWG 几何。
- AI 应说明这些文件可能适合作为机械/安装参考，但还需要一句连接目标。
- AI 只问一个核心问题：这根线束要连接什么到什么，或是复制/替换哪根旧线束？

## 用例 4：旧样件复刻，有测量和连接器观察

用户画像：现场维护或采购，有旧样件信息，但不知道准确料号。

附件：

- `greenhouse_sample_measurements.txt`
- `greenhouse_connector_notes.txt`

用户文字：

```text
I want to remake an old greenhouse door harness. It connects the control box to a door interlock and a small status lamp. I can send the old sample; the attached notes include approximate measurements and connector observations. Quantity 5 pcs first. Please match the old sample layout unless Easy Harness finds a better equivalent connector.
```

期望：

- AI 应理解这是旧样件复刻/替换。
- AI 应保留控制盒、门锁、安全灯、数量、旧样件这些关键信息。
- AI 不应该强迫客户知道精确连接器系列、端子料号或压接工艺。
- AI 可以建议把“旧样件会寄出/可提供”写入备注。

## 用例 5：中文自然语言 + 单个 CSV

用户画像：中文用户，用自然语言说明门控/灯线束。

附件：

- `warehouse_door_service_record.csv`

步骤：

1. 上传附件。
2. 用中文说明当前需求，或直接复制 `case-pack.json` 中 `v2_05_chinese_door_sensor_lamp` 的 `customer_message`。
3. 问 AI：`帮我把这段说明整理成适合提交的备注。`

期望：

- AI 应能用中文帮助用户整理。
- AI 应保留数量、主线长度、分支长度、控制柜、限位开关、24V 警示灯。
- AI 不应该变成英文固定模板。
- AI 不应该重复追问已经给出的数量和长度。

## 用例 6：先上传 pinout，后续文字补齐另一端

用户画像：自动化技术人员，先有控制器侧 pinout。

附件：

- `sorter_j1_pinout.csv`

第一轮用户文字：

```text
The pin table is attached. Connector J1 is the controller-side connector. Please use this pinout as the starting point. I have not decided the other end yet.
```

第二轮用户文字：

```text
Other end should be 400 mm labeled bare wire leads. Quantity 20 pcs. Use twisted pair for encoder A/B if possible. Overall harness length can be 650 mm. This text is the latest instruction.
```

期望：

- 第一轮 AI 应承认 pinout 已上传，但指出另一端/连接目标还缺。
- 第二轮 AI 不应该继续重复问另一端。
- 第二轮 AI 应把最新文字视为当前说明。
- AI 不应该把 pinout 内容伪装成已逐行解析，除非后续真实附件解析链路提供证据。

## 用例 7：用户明确否定电池/马达功率

附件：

- `bms_gateway_signal_note.txt`

用户文字：

```text
This is not a battery harness and it carries no motor power. I need 15 pcs of a low-current CAN signal lead from a BMS service connector to a gateway module. 1.0 m overall length. Shielded twisted pair preferred, drain wire to be reviewed by Easy Harness. Use attached signal note as reference.
```

期望：

- AI 应尊重否定条件，不应因为 BMS 这个词就写成 battery harness。
- AI 应把当前需求理解为 BMS service connector 到 gateway module 的低电流 CAN signal lead。
- 屏蔽层/drain wire 处理可以进入 Easy Harness review，不应要求客户一次说清工艺。

## 用例 8：高功率水泵线束，但另一端确实缺失

附件：

- `pump_motor_label_note.txt`

用户文字：

```text
I need a harness for a washdown pump motor. One end should match the pump pigtail shown in the attached label note. It may be around 230VAC and up to 6A. Outdoor wet area, 10 pcs. I have not specified what the other end connects to yet.
```

期望：

- AI 不能把它标成已经可完整提交。
- AI 应只问真正缺失的另一端：接到什么设备、插头、端子或裸线？
- AI 应保留电压、电流、户外湿区、数量这些背景。
- AI 不应要求客户提供工厂生产测试或压接工具。

## 用例 9：Qwen / Supabase 轻量预览链路

前置条件：

- 用户已通过 Supabase Auth 登录。
- Supabase Edge Function `run-checking` 已部署。
- Supabase secrets 已配置 `QWEN_API_KEY`、`QWEN_BASE_URL`、`QWEN_MODEL`。
- 如需自定义超时，可配置 `AI_UPLOAD_ASSISTANT_PREVIEW_TIMEOUT_MS`。

步骤：

1. 进入 `Upload with AI assistance`。
2. 上传任意一个上述真实附件，或填写一段 harness note。
3. 在 `AI Upload Chat` 输入一句自然问题，例如：`这些文件里哪个我应该说明成主依据？`
4. 发送。

期望：

- 前端调用 `run-checking`，payload 中包含 `mode: "upload_assistant_preview"`。
- Edge Function 校验登录用户后调用 Qwen。
- 返回紧凑 JSON：`reply`、`suggestedNote`、`quickChecks`、`riskLevel`、`askNext`。
- 如果 Qwen 或 Supabase 失败，上传页仍可继续使用，只显示通用 fallback，而不是伪装成 AI 已理解附件。

## 判断标准

- 用户懂行时，可以无视 AI 直接上传。
- 用户不懂时，AI 像小助理一样帮他把现有材料说清楚。
- AI 不喧宾夺主，不把上传页变成聊天页。
- AI 不按测试用例背答案。
- UI 的快捷问题可以根据当前文件类型变化，但 AI 的回答必须来自当前上下文和模型推理。
- 上传前只做轻量整理；正式 request basis 和附件解析仍属于提交后的 Easy Harness review 链路。
