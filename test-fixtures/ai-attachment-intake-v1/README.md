# Easy Harness AI Attachment Intake Test Pack v1

这个测试包用于验证：客户上传常见附件后，`run-checking` 是否真的把附件内容或可用证据送进 Easy Harness Draft Agent。

## Recommended Test Flow

1. 用客户账号新建一个 request。
2. 复制下面任意一个测试文字到客户输入框。
3. 上传对应附件。
4. 触发 `run-checking`。
5. 在 staff/admin 端查看 Draft 是否引用了附件事实。
6. 在 Supabase SQL Editor 运行 `sql/supabase_launch_verification.sql`，看最新 request 的 `check_result.source`。

## Test Case A: Full Mixed Intake

客户文字：

```text
I need a short custom harness for a Deutsch DT06-6S connector.
Use the attached connector image, PDF note, CSV pinout, XLSX table, and CAD reference files.
Target length is about 450 mm. This will be used on a 12V automotive sensor branch.
Please organize what I gave you into an Easy Harness Draft and ask me only for missing information.
```

上传附件：

- `attachments/dt06_6s_connector_photo_mock.png`
- `attachments/dt06_6s_reference_note.pdf`
- `attachments/dt06_6s_pinout.csv`
- `attachments/dt06_6s_pinout.xlsx`
- `attachments/dt06_6s_connector_shell.step`
- `attachments/bracket_outline.dxf`
- `attachments/protective_boot_ascii.stl`

预期：

- 图片进入视觉链路：`image_count_sent_to_model >= 1`。
- PDF / XLSX / CSV 进入文本或文件提取链路：`qwen_file_extract_count` 或对应观察记录大于 0。
- STEP / DXF / STL 至少产生 CAD metadata：`cad_metadata_count >= 3`。
- Draft 可以提到 DT06-6S、6 pin、450 mm、12V sensor branch、pinout 表格、CAD reference 等事实。

## Test Case B: Spreadsheet-Heavy Pinout

客户文字：

```text
The pin mapping is in my spreadsheet and CSV. Please use those files as the source of truth.
Connector A is DT06-6S. I am not sure about wire colors for pins 5 and 6.
```

上传附件：

- `attachments/dt06_6s_pinout.csv`
- `attachments/dt06_6s_pinout.xlsx`

预期：

- Draft 应优先整理表格里的 pin / circuit / color / gauge / note。
- 对 pin 5 和 pin 6 的不确定项应保留为需要客户确认，而不是编造。

## Test Case C: CAD Metadata Only

客户文字：

```text
I uploaded CAD-style reference files for the connector shell, bracket outline, and protective boot.
Please use them as dimensional/context references, not final manufacturing drawings.
```

上传附件：

- `attachments/dt06_6s_connector_shell.step`
- `attachments/bracket_outline.dxf`
- `attachments/protective_boot_ascii.stl`

预期：

- `cad_metadata_count >= 3`。
- Draft 可以知道这些是 CAD-style reference files，并能使用文件名、单位、图层、实体数、bounding box 等元数据。
- 不应声称已经完整理解 DWG、复杂装配、公差或未解析出来的内部几何细节。

## What This Pack Does Not Prove

- 它不证明平台已经能自动生成生产文件。
- 它不证明 DWG、3MF、FCStd 等专有或压缩格式已经完整可视化。
- 它不替代真实客户上传包测试；它只是一个稳定的回归测试包。

