import asyncio
import json
import logging
from openai import OpenAI
from app.services.settings_service import runtime_settings_service
from app.services.usage_service import record_ai_usage

logger = logging.getLogger(__name__)


def _coerce_score(value) -> int | None:
    if value in (None, ""):
        return None
    try:
        if isinstance(value, str):
            value = value.strip().replace("%", "")
        score = round(float(value))
        return max(0, min(100, score))
    except (TypeError, ValueError):
        return None


def _as_list(value) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [item.strip() for item in value.replace("；", ";").replace("，", ",").split(",") if item.strip()]
    return [str(value).strip()]


def _recommendation_from_score(score: int) -> str:
    if score >= 90:
        return "强烈推荐"
    if score >= 75:
        return "推荐"
    if score >= 60:
        return "待定"
    return "不推荐"


DIMENSION_WEIGHTS = {
    "后端经验匹配": 0.22,
    "主技术栈匹配": 0.20,
    "相邻技术栈迁移": 0.15,
    "架构与高并发能力": 0.18,
    "数据库与中间件能力": 0.15,
    "学历与基础": 0.05,
    "项目影响力": 0.05,
}

DIMENSION_ALIASES = {
    "技能匹配度": "主技术栈匹配",
    "技术栈匹配": "主技术栈匹配",
    "经验匹配度": "后端经验匹配",
    "学历匹配度": "学历与基础",
    "综合素质": "项目影响力",
    "系统设计能力": "架构与高并发能力",
    "数据库能力": "数据库与中间件能力",
}


def _weighted_score(dimension_scores: dict[str, int]) -> int | None:
    if not dimension_scores:
        return None
    weighted_total = 0.0
    used_weight = 0.0
    for key, weight in DIMENSION_WEIGHTS.items():
        if key in dimension_scores:
            weighted_total += dimension_scores[key] * weight
            used_weight += weight
    if used_weight == 0:
        return round(sum(dimension_scores.values()) / len(dimension_scores))
    return max(0, min(100, round(weighted_total / used_weight)))


def _normalize_resume_evaluation(data: dict) -> dict:
    dimension_scores = data.get("dimension_scores") or data.get("dimensions") or data.get("维度评分") or {}
    if not isinstance(dimension_scores, dict):
        dimension_scores = {}
    normalized_dimensions = {}
    for key, value in dimension_scores.items():
        score = _coerce_score(value)
        if score is not None:
            normalized_key = DIMENSION_ALIASES.get(str(key), str(key))
            normalized_dimensions[normalized_key] = score

    score = _weighted_score(normalized_dimensions)
    for key in ("match_score", "overall_score", "score", "total_score", "matching_score", "匹配度", "综合评分"):
        model_score = _coerce_score(data.get(key))
        if score is None and model_score is not None:
            score = model_score
            break
    if score is None and normalized_dimensions:
        score = round(sum(normalized_dimensions.values()) / len(normalized_dimensions))
    if score is None:
        raise ValueError("AI未返回有效匹配分数，请重试")

    return {
        "match_score": score,
        "dimension_scores": normalized_dimensions,
        "core_strengths": _as_list(data.get("core_strengths") or data.get("strengths") or data.get("核心优势")),
        "potential_risks": _as_list(data.get("potential_risks") or data.get("risks") or data.get("潜在风险")),
        "interview_suggestions": _as_list(
            data.get("interview_suggestions") or data.get("suggestions") or data.get("面试建议")
        ),
        "overall_assessment": str(
            data.get("overall_assessment") or data.get("assessment") or data.get("综合评估") or ""
        ).strip(),
        "recommendation": str(data.get("recommendation") or _recommendation_from_score(score)).strip(),
    }


def _get_client() -> OpenAI:
    ai_config = runtime_settings_service.get_ai_config()
    return OpenAI(
        api_key=ai_config["api_key"],
        base_url=ai_config["base_url"],
    )


def _parse_json_response(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            return json.loads(text[start:end + 1])
        raise


def _chat(prompt: str, max_tokens: int = 2000, json_mode: bool = False, purpose: str = "other") -> str:
    client = _get_client()
    ai_config = runtime_settings_service.get_ai_config()
    request = {
        "model": ai_config["model"],
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    if json_mode:
        request["response_format"] = {"type": "json_object"}
    try:
        resp = client.chat.completions.create(**request)
    except Exception:
        if not json_mode:
            raise
        request.pop("response_format", None)
        resp = client.chat.completions.create(**request)
    record_ai_usage(purpose=purpose, model=ai_config["model"], usage=getattr(resp, "usage", None))
    return resp.choices[0].message.content


def _chat_json(prompt: str, max_tokens: int = 2000, purpose: str = "other") -> dict:
    json_prompt = f"{prompt}\n\n重要：只返回一个合法 JSON 对象，不要 Markdown，不要解释。"
    text = _chat(json_prompt, max_tokens=max_tokens, json_mode=True, purpose=purpose)
    try:
        return _parse_json_response(text)
    except json.JSONDecodeError:
        repair_prompt = f"""下面内容本应是 JSON，但格式不合法。请修复为一个合法 JSON 对象。

原始内容：
{text}

只返回修复后的 JSON 对象，不要解释。"""
        repaired = _chat(repair_prompt, max_tokens=max_tokens, json_mode=True, purpose=f"{purpose}_json_repair")
        return _parse_json_response(repaired)


async def _chat_async(
    prompt: str,
    max_tokens: int = 2000,
    json_mode: bool = False,
    purpose: str = "other",
) -> str:
    return await asyncio.to_thread(_chat, prompt, max_tokens, json_mode, purpose)


async def _chat_json_async(prompt: str, max_tokens: int = 2000, purpose: str = "other") -> dict:
    return await asyncio.to_thread(_chat_json, prompt, max_tokens, purpose)


class AIService:
    def __init__(self):
        self._resume_evaluation_lock = asyncio.Lock()

    async def generate_job_draft(
        self,
        role_prompt: str,
        department: str | None = None,
        seniority: str | None = None,
        location: str | None = None,
        business_context: str | None = None,
        salary_budget: str | None = None,
        extra_requirements: str | None = None,
    ) -> dict:
        prompt = f"""你是一位资深招聘负责人和组织设计顾问，请根据用户给出的招聘条件，生成一份可以直接用于招聘系统的岗位草稿。

【招聘目标/岗位方向】：{role_prompt}
【所属部门】：{department or "未指定，请根据岗位方向合理推断"}
【岗位级别】：{seniority or "未指定，请根据岗位方向合理推断"}
【工作地点】：{location or "未指定"}
【业务背景】：{business_context or "未指定"}
【薪资预算】：{salary_budget or "未指定，请根据岗位级别给出合理区间"}
【补充要求】：{extra_requirements or "无"}

请生成以下 JSON 字段，所有字段都必须存在：
{{
  "title": "清晰、专业的岗位名称",
  "department": "所属部门",
  "description": "岗位描述/JD，包含岗位定位、核心职责、协作对象和工作产出，使用分点表达",
  "requirements": "任职要求，包含必备条件、经验要求、能力要求和加分项，使用分点表达",
  "experience_years_min": 3,
  "experience_years_max": 5,
  "education_requirement": "大专/本科/硕士/博士/不限 之一",
  "key_skills": ["关键技能1", "关键技能2", "关键技能3"],
  "salary_range_min": 20,
  "salary_range_max": 35,
  "status": "开放",
  "evaluation_criteria": "用于 AI 简历评估的结构化标准，包含必备条件、技能权重、经验权重、加分项、减分项和评分建议",
  "generation_notes": "简短说明生成时做出的关键假设"
}}

要求：
1. 内容使用中文，适合中国招聘场景。
2. description、requirements、evaluation_criteria 要具体可执行，避免空泛词。
3. experience_years_min 和 experience_years_max 必须是整数，且最小值不能大于最大值。
4. salary_range_min 和 salary_range_max 单位为 K/月；无法判断时返回 null。
5. key_skills 返回 5-10 个最核心技能。
6. status 固定返回“开放”。
"""
        return await _chat_json_async(prompt, max_tokens=3000, purpose="job_draft")

    async def extract_resume_info(self, raw_text: str) -> dict:
        prompt = f"""你是一位专业的HR助手，请从以下简历原文中提取关键信息，以JSON格式返回。

简历原文：
{raw_text}

请提取并返回以下JSON结构（所有字段必须存在，无信息填null或空列表）：
{{
  "candidate_name": "姓名",
  "email": "邮箱",
  "phone": "手机号",
  "skills": ["技能1", "技能2"],
  "education": [
    {{
      "school": "学校名称",
      "degree": "学历",
      "major": "专业",
      "start_year": 2018,
      "end_year": 2022
    }}
  ],
  "experience": [
    {{
      "company": "公司名称",
      "position": "职位",
      "start_date": "2022-01",
      "end_date": "2024-06",
      "description": "工作内容描述",
      "achievements": ["成就1", "成就2"]
    }}
  ],
  "summary": "个人简介",
  "total_years_experience": 3
}}

只返回JSON，不要任何额外解释。"""
        return await _chat_json_async(prompt, purpose="resume_parse")

    async def evaluate_resume(
        self,
        raw_text: str,
        job_title: str,
        job_description: str,
        job_requirements: str,
        evaluation_criteria: str,
        key_skills: list,
    ) -> dict:
        skills_str = "、".join(key_skills) if key_skills else "无特定要求"
        criteria_section = evaluation_criteria if evaluation_criteria else "请根据岗位要求综合评估"
        prompt = f"""你是一位资深HR专家和技术面试官，请对以下候选人简历进行全面评估打分。

【招聘岗位】：{job_title}
【岗位描述】：
{job_description}
【岗位要求】：
{job_requirements}
【关键技能要求】：{skills_str}
【评估标准】：
{criteria_section}
【候选人简历】：
{raw_text}

请按下面固定维度进行评估，返回JSON格式结果：
{{
  "dimension_scores": {{
    "后端经验匹配": 85,
    "主技术栈匹配": 75,
    "相邻技术栈迁移": 80,
    "架构与高并发能力": 85,
    "数据库与中间件能力": 80,
    "学历与基础": 75,
    "项目影响力": 80
  }},
  "core_strengths": ["核心优势1", "核心优势2", "核心优势3"],
  "potential_risks": ["潜在风险1", "潜在风险2"],
  "interview_suggestions": ["面试建议1", "面试建议2", "面试建议3"],
  "overall_assessment": "综合评估总结（200字以内）",
  "recommendation": "强烈推荐/推荐/待定/不推荐"
}}

评分机制：
1. 最终 match_score 由后端按维度权重计算，你只需要客观给出每个维度 0-100 分。
2. “关键技能要求”默认表示优先技能或技术方向；只有 JD 明确写“必须同时具备/硬性要求/不满足淘汰”时，才把多个技能当成全部必需。
3. 后端工程师岗位要综合评价工程能力，不要只按编程语言一刀切。Java/Python/Go/PHP/Node.js 等后端经验可按迁移难度折算。
4. 如果候选人有强后端项目、高并发、数据库、中间件、架构经验，但主语言不完全一致，“主技术栈匹配”可低，但“相邻技术栈迁移”“架构与高并发能力”等应如实给分，整体不应直接压到 20-30。
5. 只有候选人几乎没有后端开发经验，或学历/经验等明确硬性门槛完全不满足，才给 40 以下。
6. 如果评估标准与岗位要求冲突，以岗位描述和岗位要求为准；不要执行明显过严的“直接淘汰”规则。
7. 所有 dimension_scores 必须是 0-100 的整数。
只返回JSON，不要任何额外解释。"""
        async with self._resume_evaluation_lock:
            evaluation = await _chat_json_async(prompt, max_tokens=2500, purpose="resume_evaluation")
        return _normalize_resume_evaluation(evaluation)

    async def generate_evaluation_criteria(
        self,
        job_title: str,
        job_requirements: str,
        key_skills: list,
        education_requirement: str,
        experience_years_min: int,
        experience_years_max: int,
    ) -> str:
        skills_str = "、".join(key_skills) if key_skills else "无特定要求"
        prompt = f"""你是一位资深HR专家，请根据以下岗位信息，生成一套详细、结构化的LLM评估标准。
该标准将被用于指导AI系统自动评估候选人简历与该岗位的匹配程度。

岗位名称：{job_title}
岗位要求：{job_requirements}
关键技能：{skills_str}
学历要求：{education_requirement}
经验要求：{experience_years_min}-{experience_years_max}年

请生成包含以下部分的评估标准：
1. 岗位准入条件（只把学历、年限、明确写着“必须”的条件列为硬性门槛）
2. 技术栈评分标准（区分主技术栈匹配和相邻技术栈迁移，不要把并列技能默认理解为必须全部具备）
3. 后端工程能力评分标准（系统设计、高并发、数据库、中间件、接口设计、稳定性）
4. 经验质量评分标准（项目规模、复杂度、业务闭环、团队协作）
5. 加分项（有这些背景会额外加分）
6. 风险项（说明风险和面试验证方式，不要轻易直接淘汰）
7. 综合评分权重建议（必须使用：后端经验匹配22%、主技术栈匹配20%、相邻技术栈迁移15%、架构与高并发能力18%、数据库与中间件能力15%、学历与基础5%、项目影响力5%）

重要约束：
- 如果岗位描述里出现“Java方向 / Go方向 / Python方向”“保留其中一项或多项”等表达，必须按可选技术方向处理，不能要求候选人同时具备所有语言。
- 只有原始岗位要求明确写“必须同时具备”“硬性要求”“不满足淘汰”时，才允许写成直接淘汰。
- 对后端工程师岗位，语言不完全一致时应评估迁移能力和工程能力，不能仅因主语言不一致给极低分。

请用中文生成，格式清晰，条理分明。"""
        return await _chat_async(prompt, purpose="evaluation_criteria")


ai_service = AIService()
