from docx import Document
from docx.shared import Inches,Pt,RGBColor,Cm
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from pathlib import Path
import json
root=Path('/Users/leo/Documents/ChatGPT/团队项目/NutriAgent/docs/week1-3')
d=Document();sec=d.sections[0];sec.top_margin=Cm(1.8);sec.bottom_margin=Cm(1.8);sec.left_margin=Cm(2);sec.right_margin=Cm(2)
for name in ['Normal','Title','Heading 1','Heading 2']:
 s=d.styles[name];s.font.name='Calibri';s.font.color.rgb=RGBColor(0,0,0);s._element.rPr.rFonts.set(qn('w:eastAsia'),'FandolSong')
d.styles['Normal'].font.size=Pt(9.5);d.styles['Normal'].paragraph_format.space_after=Pt(4)
d.styles['Title'].font.size=Pt(24);d.styles['Heading 1'].font.size=Pt(15)
header=sec.header.paragraphs[0];header.text='NutriAgent  /  前三周开发与测试记录';header.style='Normal'
foot=sec.footer.paragraphs[0];foot.alignment=2
foot.add_run('测试报告  ·  ');fld=OxmlElement('w:fldSimple');fld.set(qn('w:instr'),'PAGE');foot._p.append(fld)
def p(t):d.add_paragraph(t)
def h(t):d.add_heading(t,1)
def table(headers,rows):
 t=d.add_table(rows=1,cols=len(headers));t.style='Table Grid'
 for c,x in zip(t.rows[0].cells,headers):c.text=x
 for row in rows:
  for c,x in zip(t.add_row().cells,row):c.text=str(x)
 for row in t.rows:
  for c in row.cells:
   for par in c.paragraphs:
    for r in par.runs:r.font.size=Pt(9)
def shot(name,caption,width=6):
 from PIL import Image
 image_path=root/name if '/' in name else root/'evidence'/name
 im=Image.open(image_path); width=min(width, 7.2*im.width/im.height)
 d.add_picture(str(image_path),width=Inches(width));d.add_paragraph(caption,'Caption')
d.add_heading('NutriAgent 前三周开发测试报告',0)
p('测试日期 2026年10月30日  |  范围依据 NutriAgent五人五周工作计划')
p('本次使用用户提供的混合餐食原图重新测试，全部在3103真实服务模式运行，没有使用mock替代。上传、人工改名、保存食物、午餐记餐和刷新读回完成，但餐食自动识别不准确，且发现未知营养被页面显示为0、人工改名后分类仍残留chicken、识别原图未传入食物编辑器等问题。')
h('一 测试环境与边界')
table(['环境','用途','状态'],[['localhost:3101','原有用户入口','未重启 未替换 未写测试数据'],['localhost:3102','独立数据库与上传目录','显式 mock 模式 用于业务回归'],['localhost:3103','独立数据库与真实模型适配','Food101 ONNX 与 Apple Vision OCR'],['localhost:3212','Mac 本机推理服务','临时文件结束即清理 模型文件位于临时目录']])
h('二 前次基线与本次复测结果')
p('下表927项完整仓库测试与10组联调是前次记录，本次没有重跑完整套件；本次重跑16项契约回归全部通过，并用用户原图重新操作真实浏览器链路。自动化通过不代表本次识别准确。')
table(['测试组','实际结果','覆盖内容'],[['新增及部署契约检查','16通过 0失败','单位与计量基准 缺失字段 非法数值 真实服务缺失 mock声明 OCR列匹配 Docker共享源文件'],['独立业务联调','10组通过','登录与隔离 食物CRUD 重复提交 日记读写删除 日期与份量校验 上传伪造文件'],['完整仓库测试','927项 882通过 45跳过 0失败','Docker Node20及补齐依赖环境 跳过不算通过'],['真实识别接口','餐食与标签成功 非标签图失败 CSRF403','service模式返回 待确认 不自动写库'],['前端生产构建','通过','存在既有大包体积提示 不等于业务验收']])
d.add_page_break();h('三 与前三周计划逐项对照')
table(['方向','已实现及验证','尚未满足的验收条件'],[['餐食识别','10类输出约定 真实预训练Food101调用 候选与unknown 支持缩放裁剪旋转 公开样本对比','已补8类公开图片各1开发原图和1测试原图 尚缺食堂多条件独立测试'],['标签OCR','Apple Vision文字识别 表格坐标选每100克列 kJ与kcal及g与mg换算 空值和NRV校验','仅一张营养表人工核对 未覆盖反光倾斜模糊及多种基准的代表性标签'],['业务后端','原有账号与食物日记功能回归 新增参数校验 UUID重试去重与删除测试 确认后录入','缺失营养项在原有总计界面仍显示为零贡献 尚缺完整性警告'],['集成后端','两类接口鉴权限流 超时与错误 草稿响应 服务地址与服务端凭据配置','永久上传图片仍按上游设计可公开读取 未做文件所有权隔离及保留期验收'],['前端','可见入口 图片预览 加载与错误 候选/字段修改 缺失提示 确认回填编辑器 保存与记餐','真机摄像头未验收 尚需多种异常场景和窄屏测试']])
p('实现主要文件：src/routes/Recognition.svelte、src/lib/recognition-contract.js、server/routes/recognition.js、server/lib/recognition-service.js、server/lib/business-validation.js、tools/recognition-macos。原有 FoodEditor、Foods、食品与日记路由仅做所需连接及校验修改。')
h('四 业务与接口规则')
p('识别接口只返回草稿，不写入食物或日记。用户逐项校对、确认后，才进入现有食物编辑器；再点击保存生成正式食物。标签先按原始计量基准与实际份量缩放，存储为所选份量对应的营养值，避免再次按每100克缩放。日记数量表示份数。')
p('前次独立模拟校验记录 不是本次用户图片结果：模拟标签每100克100 kcal、蛋白质3 g，选择150克得到150 kcal、蛋白质4.5 g；保存后加入午餐2份，页面刷新后总量300克、300 kcal。缺失脂肪、碳水和钠保留空值，不作为识别正确字段。')
p('输入JPEG、PNG、WebP；UI最多6MB，接口最多8MiB编码内容，校验魔数；每用户每分钟20次。未配置真实服务返回503，超时504，服务错误或不合法响应502，非法图片415，超限429。Cookie写请求需CSRF头；Bearer沿用原有认证。')
d.add_page_break();h('五 用户指定餐食照片复测')
p('测试输入为用户提供的混合餐食照片，1170×1234像素；原图未裁剪、未换图。SHA256为ded37720499ea6e6e537e457dfad501908c94f28d83d20e24bd382c9d8b83ed5。仅发送到本机3103及本机模型服务，没有发送给外部识别服务。')
table(['环节','实际观察','判定'],[['上传预览','原图可选 可预览 真实模式service','通过'],['真实模型分类','原始top1 bibimbap 0.552045；top2 chicken_curry 0.158830','无法完整识别混合餐'],['适配后候选','丢弃未映射top1，仅将top2映射为chicken；浏览器耗时2114ms','不通过 分类映射丢失主结果'],['人工校对','改名为混合餐食 用户照片 人工校对待核实；草稿category仍是chicken','名称修改通过 分类残留问题'],['编辑与保存','食物名称和100g测试值回填 营养字段留空；原图未回填','文字回填通过 图片连续性不足'],['记餐与刷新','午餐1份 刷新后仍在；认证API读回恰好1条','持久化通过'],['营养展示','后台nutrition为空对象 页面显示0 kcal','不通过 未知被显示为零'],['契约回归','本次16项通过0失败','通过 不代表模型效果通过']])
p('100g只是软件流程测试输入，不是用户这餐的称重结果；没有填写虚构营养值，没有把0 kcal当作这餐真实热量。照片含多种食物，当前Food101单菜分类模型不能完成多食材分割、份量估计和营养测量，因此本轮不出具热量准确性通过结论。')
p('本次问题只记录与复现，未擅自改模型映射、应用营养逻辑或扩展开发范围。原始响应、模型top5、保存后接口读回和16项回归日志保存在retest-20261030目录。原3101环境未改动。')
d.add_page_break();h('六 前次真实模型与公开样本评测')
p('餐食基线选用 onnx-community/swin-finetuned-food101-ONNX 的量化模型，本机CPU推理；OCR采用macOS自带Apple Vision。不是自行训练模型，也不是组员模型已经交付。权重约89MB，记录在临时目录，正式部署需固定版本、校验摘要并持久化。')
eval=json.loads((root/'evidence/food101-evaluation.json').read_text())
table(['评测','样本','观察结果','结论边界'],[['Food101整图缩放','21张真实公开验证集图片',f"Top1 {eval['resizeTop1']}/21",'仅探索性冒烟检查'],['Food101中心裁剪','同21张图 同源分组',f"Top1 {eval['centerTop1']}/21",'未观察到提升 不能宣称优化有效'],['通用Apple图像分类','同组餐食图片','常返回餐具等类别','已保留原始结果 改用食物专用模型'],['营养标签OCR','1张真实法文多语标签','读出539 kcal 6.3g蛋白 57.5g碳水','脂肪单位未可靠识别 钠未印出 均保持空']])
p('公开Food101验证集可能与预训练模型的历史评测或训练来源重合，21/21不能当作新独立测试准确率，更不能推断食堂场景准确率。没有用本组测试图微调或训练；同图预处理变体保持同组。样本来源、标签、SHA256和每次耗时见 samples/manifest.json 与 evidence/food101-evaluation.json。另补充8类各2张原始照片，共16张；每类1张开发、1张测试，文件摘要无交叉。8张测试图整图缩放与中心裁剪均6/8；每类仅1张测试且为公开数据，不代表食堂独立性能。详见 balanced-evaluation.json。')
p('标签标准答案由实际查看图片读取：每100克539 kcal、脂肪30.9 g、碳水57.5 g、蛋白质6.3 g、盐0.107 g；钠没有直接印出，不混为盐或NRV百分比。基于文字行的初版解析不能可靠识别此表；加入坐标列匹配后得到能量、蛋白与碳水3个字段及基准。仅一张样本，不报告整体OCR准确率。')
p('另一个公开产品的 nutrition_en 图片链接实际上返回包装正面，本次已人工确认并作为负例。接口对该图片返回失败，不伪造营养数据。')
h('七 仍需完成的工作')
p('1. 收集8至10类真实食堂原图，覆盖光照、背景和角度；由原始拍摄场景分组划分开发与独立测试集，不跨组使用同图变体。2. 收集多条件标签图并双人核对标准答案，补齐每100毫升、每份与方向纠正的实测。3. 完成永久上传文件所有者访问与保留期策略。4. 真机验证拍照、失败重试和小屏交互。5. 营养统计增加缺失数据提示，避免将不完整记录理解为营养为零。6. 在维护窗口部署到3101并从该实际入口复验。')
p('以上未完成项不能通过模拟接口或自动化通过数量替代。本报告是开发与阶段测试记录，不是前三周全部验收通过证明。')
for title,name,caption in [
 ('八 已登录会话中的日记页面','01-authenticated-diary.png','图1 本次3103已登录会话中的日记页面 不是登录表单 也不是模拟识别结果'),
 ('九 用户指定照片上传预览','02-user-photo-preview.png','图2 本次原图为用户提供的混合餐食照片 不是此前鸡翅样本'),
 ('十 真实模型识别结果','03-real-model-result.png','图3 service模式返回chicken 耗时2114ms 不能代表混合餐完整识别正确'),
 ('十一 人工校对后的草稿','04-corrected-draft.png','图4 人工修改名称 原分类chicken仍残留 100g仅为流程测试值'),
 ('十二 食物编辑与未知营养','05-editor-unknown-nutrition.png','图5 营养字段全部留空 备注注明识别问题与测试份量 原图没有随草稿带入'),
 ('十三 保存后食物库读回','06-food-persisted.png','图6 人工校对食物已保存到独立测试库'),
 ('十四 午餐记餐确认','07-diary-confirmation.png','图7 一份100g测试记录 营养未知却显示0 属于展示问题 不是零热量结论'),
 ('十五 刷新后日记持久化','08-diary-after-reload.png','图8 刷新后午餐仍有该记录 认证API核对恰好一条 不表示营养计算通过')]:
 d.add_page_break();h(title);shot('retest-20261030/'+name,caption,width=6.4)
for par in d.paragraphs:
 for run in par.runs:
  run.font.name='FandolSong'; run._element.get_or_add_rPr().rFonts.set(qn('w:eastAsia'),'FandolSong')
 for border in list(par._p.xpath('./w:pPr/w:pBdr')): border.getparent().remove(border)
for table in d.tables:
 for row in table.rows:
  for cell in row.cells:
   for par in cell.paragraphs:
    for run in par.runs:
     run.font.name='FandolSong';run._element.get_or_add_rPr().rFonts.set(qn('w:eastAsia'),'FandolSong')
for style in d.styles:
 for border in list(style.element.xpath('./w:pPr/w:pBdr')): border.getparent().remove(border)
out=root/'NutriAgent前三周开发测试报告.docx';d.save(out);print(out)
